import type { PersonId } from '../data/types';
import type { Backend, EntityKind, Row } from './types';

/** A shared in-memory «server» for tests: give each simulated phone its own `client(userId)`. */
export function memoryServer(members: Record<string, PersonId>) {
  const rows = new Map<string, Row>();
  const files = new Map<string, Blob>();
  const listeners = new Set<() => void>();
  let seq = 0;
  let offline = false;
  const check = () => { if (offline) throw new Error('offline'); };
  const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

  const client = (userId: string): Backend => ({
    async pull(sinceSeq) { check(); return [...rows.values()].filter(r => r.seq > sinceSeq).sort((a, b) => a.seq - b.seq).map(clone); },
    async push(id, kind: EntityKind, data, base, deleted) {
      check();
      const cur = rows.get(id);
      if (cur && (base == null || cur.version !== base)) return { ok: false, row: clone(cur) };
      const row: Row = { id, kind, data: clone(data), deleted, version: (cur?.version ?? 0) + 1, seq: ++seq, updated_by: userId };
      rows.set(id, row);
      queueMicrotask(() => listeners.forEach(l => l()));
      return { ok: true, row: clone(row) };
    },
    async members() { check(); return { ...members }; },
    async upload(path, blob) { check(); files.set(path, blob); },
    async download(path) { check(); const f = files.get(path); if (!f) throw new Error('missing ' + path); return f; },
    async remove(paths) { check(); paths.forEach(p => files.delete(p)); },
    async signedUrl(path) { check(); return 'memory://' + path; },
    subscribe(onChange) { listeners.add(onChange); return () => listeners.delete(onChange); },
  });

  return { client, rows, files, setOffline: (v: boolean) => { offline = v; } };
}
