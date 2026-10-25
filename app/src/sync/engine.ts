import type { Archive, Conflict, PersonId, Photo, QueueItem } from '../data/types';
import { mergeEntity, same } from './merge';
import type { Backend, EntityKind, Row } from './types';

// The sync engine keeps this phone's archive and the shared server archive in step.
//
// Local-first: every change is saved on the phone first (IndexedDB), then the engine
//   1. pulls what the other phone changed (merging where both changed the same thing),
//   2. uploads photo files that only exist on this phone (original + display copy),
//   3. pushes this phone's changed entities with conflict detection.
// It notices local changes by watching the store for new object references, so the rest
// of the app just edits state as before. Nothing here assumes the app stays open: the
// list of unsent changes is stored, and the next start or reconnect continues where it stopped.

type ArchiveLists = Pick<Archive, 'trips' | 'memories' | 'places' | 'dreams' | 'upcoming'>;
type Entity = { id: string };

export interface SyncState {
  phase: 'off' | 'offline' | 'idle' | 'syncing' | 'error';
  /** Entities changed on this phone and not yet on the server. */
  pending: number;
  photosTotal: number;
  photosDone: number;
  error?: string;
}

/** The parts of the app store the engine reads and writes. */
export interface EngineStore<S extends ArchiveLists & { queue: QueueItem[]; lastSync: string; sync: SyncState }> {
  getState(): S;
  setState(patch: Partial<S> | ((s: S) => Partial<S>)): void;
  subscribe(fn: (s: S, prev: S) => void): () => void;
}

export interface SyncMeta {
  lastSeq: number;
  base: Record<string, { version: number; data: unknown; deleted?: boolean }>;
  dirty: string[];
}

export interface EngineDeps<S extends ArchiveLists & { queue: QueueItem[]; lastSync: string; sync: SyncState }> {
  store: EngineStore<S>;
  backend: Backend;
  me: PersonId;
  loadMeta(): Promise<SyncMeta | null>;
  saveMeta(m: SyncMeta): Promise<void>;
  getBlob(key: string): Promise<Blob | null>;
  displayCopy(b: Blob): Promise<Blob>;
  isOnline(): boolean;
  /** Ids of the bundled demo content: dropped on a new phone when the shared archive already exists. */
  seedIds: Set<string>;
  notify?(text: string): void;
  /** Called when an entity has reached the server and none of its photos are waiting. */
  onSynced?(kind: EntityKind, id: string): void;
  onProgress?(kind: EntityKind, id: string, done: number, total: number): void;
}

const LISTS: [EntityKind, keyof ArchiveLists][] = [['trip', 'trips'], ['memory', 'memories'], ['place', 'places'], ['dream', 'dreams'], ['upcoming', 'upcoming']];
const listOf = (k: EntityKind) => LISTS.find(([kind]) => kind === k)![1];
export const rowId = (kind: EntityKind, id: string) => kind + ':' + id;
const parse = (rid: string) => { const i = rid.indexOf(':'); return { kind: rid.slice(0, i) as EntityKind, id: rid.slice(i + 1) }; };

const DEVICE_KEYS = new Set(['blobKey', 'conflict', 'local']);

/** Removes what only makes sense on this phone (local file keys, open conflicts). */
export function strip<T>(v: T): T {
  return JSON.parse(JSON.stringify(v, (k, val) => (DEVICE_KEYS.has(k) ? undefined : val)));
}

/** Puts this phone's local file keys and open conflict back onto incoming data. */
function restoreDevice(incoming: unknown, local: unknown): unknown {
  if (!local) return incoming;
  const keys = new Map<string, string>();
  const collect = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.id === 'string' && typeof o.blobKey === 'string') keys.set(o.id, o.blobKey);
      Object.values(o).forEach(collect);
    }
  };
  collect(local);
  const put = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(put);
    if (v && typeof v === 'object') {
      const o: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) o[k] = put(val);
      if (typeof o.id === 'string' && keys.has(o.id) && !o.blobKey) o.blobKey = keys.get(o.id);
      return o;
    }
    return v;
  };
  const out = put(incoming) as Record<string, unknown>;
  const lc = (local as Record<string, unknown>).conflict;
  if (lc) out.conflict = lc;
  return out;
}

const photosIn = (v: unknown, out: Photo[] = []): Photo[] => {
  if (Array.isArray(v)) v.forEach(x => photosIn(x, out));
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.id === 'string' && ('blobKey' in o || 'path' in o || 'src' in o) && 'w' in o) out.push(o as unknown as Photo);
    else Object.values(o).forEach(x => photosIn(x, out));
  }
  return out;
};
const storagePaths = (v: unknown) => photosIn(v).flatMap(p => [p.path, p.displayPath].filter(Boolean) as string[]);

export function createSyncEngine<S extends ArchiveLists & { queue: QueueItem[]; lastSync: string; sync: SyncState }>(d: EngineDeps<S>) {
  const { store, backend } = d;
  let meta: SyncMeta = { lastSeq: 0, base: {}, dirty: [] };
  let dirty = new Set<string>();
  let prev = new Map<string, unknown>();
  let members: Record<string, PersonId> = {};
  let applying = false;
  let running = false, again = false, stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = 5000;
  const unsubs: (() => void)[] = [];
  const failedPhotos = new Set<string>();
  let uploading: string | null = null;

  const snapshot = (s: S) => {
    const m = new Map<string, unknown>();
    for (const [kind, key] of LISTS) for (const e of s[key] as Entity[]) m.set(rowId(kind, e.id), e);
    return m;
  };
  const find = (kind: EntityKind, id: string) => (store.getState()[listOf(kind)] as Entity[]).find(e => e.id === id);
  const persistMeta = () => { meta.dirty = [...dirty]; return d.saveMeta(meta).catch(() => {}); };
  const setSync = (patch: Partial<SyncState>) => store.setState(s => ({ sync: { ...s.sync, ...patch } }) as Partial<S>);

  /** Applies server data without it counting as a local change. */
  function apply(kind: EntityKind, id: string, data: unknown | null) {
    applying = true;
    try {
      const key = listOf(kind);
      store.setState(s => {
        const list = s[key] as Entity[];
        const i = list.findIndex(e => e.id === id);
        if (data == null) return (i < 0 ? {} : { [key]: list.filter(e => e.id !== id) }) as Partial<S>;
        const next = [...list];
        if (i >= 0) next[i] = data as Entity; else next.push(data as Entity);
        return { [key]: next } as Partial<S>;
      });
      prev = snapshot(store.getState());
    } finally {
      applying = false;
    }
  }

  function detect(s: S) {
    if (applying || stopped) return;
    const cur = snapshot(s);
    let changed = false;
    for (const [rid, obj] of cur) if (prev.get(rid) !== obj) { dirty.add(rid); changed = true; }
    for (const rid of prev.keys()) if (!cur.has(rid)) { dirty.add(rid); changed = true; }
    prev = cur;
    if (changed) { refreshQueue(); persistMeta(); schedule(300); }
  }

  /** Per-memory upload rows for the sync panel and the memory's «Lagringsstatus». */
  function refreshQueue() {
    const s = store.getState();
    const online = d.isOnline();
    const items: QueueItem[] = [];
    for (const rid of dirty) {
      const { kind, id } = parse(rid);
      if (kind !== 'memory') continue;
      const m = s.memories.find(x => x.id === id);
      if (!m) continue;
      const local = m.photos.filter(p => p.blobKey);
      const done = local.filter(p => p.path).length;
      const failed = local.some(p => failedPhotos.has(p.id)) || s.sync.phase === 'error';
      items.push({ id, kind: 'Minne', title: m.title, photos: local.length, done, status: !online ? 'venter' : failed ? 'feil' : running ? 'laster' : 'venter' });
    }
    if (!same(items, s.queue)) store.setState({ queue: items } as Partial<S>);
    setSync({ pending: dirty.size });
  }

  function schedule(ms = 0) {
    if (stopped) return;
    clearTimeout(timer);
    timer = setTimeout(() => void run(), ms);
  }

  async function run() {
    if (stopped) return;
    if (running) { again = true; return; }
    if (!d.isOnline()) { setSync({ phase: 'offline' }); refreshQueue(); return; }
    running = true;
    setSync({ phase: 'syncing', error: undefined });
    refreshQueue();
    try {
      if (!Object.keys(members).length) members = await backend.members();
      await pullPhase();
      await uploadPhase();
      await pushPhase();
      retryDelay = 5000;
      store.setState({ lastSync: new Date().toISOString() } as Partial<S>);
      setSync({ phase: 'idle', photosTotal: 0, photosDone: 0 });
    } catch (e) {
      setSync({ phase: d.isOnline() ? 'error' : 'offline', error: e instanceof Error ? e.message : String(e) });
      if (d.isOnline()) { schedule(retryDelay); retryDelay = Math.min(retryDelay * 2, 5 * 60_000); }
    } finally {
      running = false;
      await persistMeta();
      refreshQueue();
      if (again) { again = false; schedule(0); }
    }
  }

  const personOf = (row: Row): PersonId => (row.updated_by && members[row.updated_by]) || (d.me === 'knut' ? 'anna' : 'knut');

  /** Merges a server row into a locally changed entity. Returns true if local changes remain to be sent. */
  function mergeIn(row: Row): boolean {
    const { kind, id } = parse(row.id);
    const local = find(kind, id);
    const base = meta.base[row.id];
    meta.base[row.id] = { version: row.version, data: row.data, deleted: row.deleted };
    if (row.deleted) {
      if (!local) return false;                       // both deleted
      return true;                                    // edited here after the other deleted: keep it, re-create on the server
    }
    if (!local) {
      // Deleted here while the other phone changed it: keep their change.
      apply(kind, id, row.data);
      d.notify?.('Noe du slettet var endret av ' + (personOf(row) === 'knut' ? 'Knut' : 'Anna') + ', og er beholdt');
      return false;
    }
    const { data, conflict } = mergeEntity(kind, base && !base.deleted ? base.data : undefined, strip(local), row.data, personOf(row), new Date().toISOString());
    const withDevice = restoreDevice(data, local) as Record<string, unknown>;
    if (conflict) withDevice.conflict = conflict as Conflict;
    apply(kind, id, withDevice);
    return !same(strip(data), row.data);
  }

  async function pullPhase() {
    const fresh = meta.lastSeq === 0 && !Object.keys(meta.base).length;
    const rows = await backend.pull(meta.lastSeq);
    if (fresh) {
      if (!rows.length) {
        // Empty shared archive: this phone's content becomes the start.
        for (const rid of snapshot(store.getState()).keys()) dirty.add(rid);
        return;
      }
      // The shared archive exists: it is the truth. Keep only what was made here before logging in.
      const server = new Set(rows.map(r => r.id));
      const keep = [...snapshot(store.getState()).keys()].filter(rid => !server.has(rid) && !d.seedIds.has(rid));
      applying = true;
      try {
        const live = rows.filter(r => !r.deleted);
        store.setState(s => {
          const patch: Partial<ArchiveLists> = {};
          for (const [kind, key] of LISTS) {
            const mine = (s[key] as Entity[]).filter(e => keep.includes(rowId(kind, e.id)));
            (patch as Record<string, unknown>)[key] = [...live.filter(r => r.kind === kind).map(r => restoreDevice(r.data, (s[key] as Entity[]).find(e => rowId(kind, e.id) === r.id))), ...mine];
          }
          return patch as Partial<S>;
        });
        prev = snapshot(store.getState());
      } finally {
        applying = false;
      }
      for (const r of rows) meta.base[r.id] = { version: r.version, data: r.data, deleted: r.deleted };
      meta.lastSeq = Math.max(...rows.map(r => r.seq));
      dirty = new Set(keep);
      return;
    }
    for (const row of rows) {
      const base = meta.base[row.id];
      meta.lastSeq = Math.max(meta.lastSeq, row.seq);
      if (base && row.version <= base.version) continue;           // our own write coming back
      if (dirty.has(row.id)) { if (!mergeIn(row)) dirty.delete(row.id); continue; }
      const { kind, id } = parse(row.id);
      apply(kind, id, row.deleted ? null : restoreDevice(row.data, find(kind, id)));
      meta.base[row.id] = { version: row.version, data: row.data, deleted: row.deleted };
    }
  }

  async function uploadPhase() {
    const s = store.getState();
    const todo = s.memories.flatMap(m => m.photos.filter(p => p.blobKey && !p.path).map(p => ({ m, p })));
    if (!todo.length) return;
    let done = 0;
    setSync({ photosTotal: todo.length, photosDone: 0 });
    for (const { m, p } of todo) {
      if (!d.isOnline()) throw new Error('offline');
      const blob = await d.getBlob(p.blobKey!);
      if (!blob) { done++; continue; }                             // file gone from this phone: nothing to send
      uploading = p.id;
      try {
        const path = p.id + '/original';
        const displayPath = p.id + '/display.jpg';
        await backend.upload(path, blob);
        await backend.upload(displayPath, await d.displayCopy(blob).catch(() => blob));
        failedPhotos.delete(p.id);
        // A normal (tracked) edit: the memory now references the uploaded files and will be pushed.
        store.setState(st => ({
          memories: st.memories.map(x => (x.photos.some(y => y.id === p.id) ? { ...x, photos: x.photos.map(y => (y.id === p.id ? { ...y, path, displayPath } : y)) } : x)),
          trips: st.trips.map(t => (t.cover?.id === p.id ? { ...t, cover: { ...t.cover, path, displayPath } } : t)),
        }) as Partial<S>);
      } catch (e) {
        failedPhotos.add(p.id);
        throw e;
      } finally {
        uploading = null;
      }
      done++;
      setSync({ photosDone: done });
      const cur = store.getState().memories.find(x => x.id === m.id);
      if (cur) { const local = cur.photos.filter(y => y.blobKey); d.onProgress?.('memory', m.id, local.filter(y => y.path).length, local.length); }
      refreshQueue();
    }
  }

  async function pushPhase() {
    for (let round = 0; round < 3 && dirty.size; round++) {
      for (const rid of [...dirty]) {
        const { kind, id } = parse(rid);
        const local = find(kind, id);
        const base = meta.base[rid];
        if (!local && (!base || base.deleted)) { dirty.delete(rid); continue; }
        // Wait with a memory until its photos are uploaded, so the other phone never sees half of it.
        if (local && kind === 'memory' && photosIn(local).some(p => p.blobKey && !p.path)) continue;
        const data = local ? strip(local) : base!.data;
        const res = await backend.push(rid, kind, data, base?.version ?? null, !local);
        if (res.ok) {
          const removed = local ? storagePaths(base?.data).filter(x => !storagePaths(data).includes(x)) : storagePaths(base?.data);
          meta.base[rid] = { version: res.row.version, data, deleted: !local };
          // lastSeq is not advanced here: the next pull sees this row and skips it as our own write.
          dirty.delete(rid);
          if (removed.length) await backend.remove(removed).catch(() => {});
          d.onSynced?.(kind, id);
        } else if (!mergeIn(res.row)) {
          dirty.delete(rid);
          d.onSynced?.(kind, id);
        }
      }
    }
  }

  return {
    async start() {
      meta = (await d.loadMeta()) || meta;
      dirty = new Set(meta.dirty);
      prev = snapshot(store.getState());
      unsubs.push(store.subscribe(s => detect(s)));
      unsubs.push(backend.subscribe(() => schedule(400)));
      refreshQueue();
      schedule(0);
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      unsubs.forEach(u => u());
      setSync({ phase: 'off' });
    },
    syncNow: () => { failedPhotos.clear(); schedule(0); },
    isDirty: (kind: EntityKind, id: string) => dirty.has(rowId(kind, id)),
    uploadingPhoto: () => uploading,
    /** Runs until nothing is left to send (or the server is unreachable). For tests. */
    async settle() {
      clearTimeout(timer);
      for (let i = 0; i < 20; i++) {
        while (running) await new Promise(r => setTimeout(r, 2));
        await run();
        clearTimeout(timer);
        if (!dirty.size || store.getState().sync.phase !== 'idle') break;
      }
    },
  };
}
export type SyncEngine = ReturnType<typeof createSyncEngine>;
