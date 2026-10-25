import { create } from 'zustand';
import type { SyncState } from '../sync/engine';
import type { Archive, Dream, ImportItem, Memory, OfflineScope, PersonId, Photo, Place, StoryBlock, Trip, TripPrecision, MemType, WriteStatus } from '../data/types';
import { demoArchive, importDemo } from '../data/demo';
import { deleteBlob, isQuotaError, loadArchive, putBlob, readPref, requestPersistence, saveArchive, writePref } from '../lib/db';
import { fmtDate, otherPerson, PEOPLE, uid } from '../lib/format';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface SaveStatus {
  id: string;
  phase: 'lagrer' | 'lokalt' | 'venter' | 'laster' | 'synk' | 'feil';
  label: string;
  detail: string;
  canRetry?: boolean;
  storage?: boolean;
}

export interface NewTripForm { title: string; dest: string; precision: TripPrecision; start: string; end: string }
export interface NewMemForm {
  title: string; text: string; date: string; month: string; precision: 'dag' | 'maned' | 'ukjent';
  writeStatus: WriteStatus; placeId: string; type: MemType; tripId: string; comment: string;
  photos: Photo[]; savedId?: string;
}
export interface DreamForm { title: string; place: string; note: string; when: string }

export interface ImportState {
  step: 1 | 2 | 3 | 4;
  items: ImportItem[];
  tripChoice: string; // trip id or 'ny'
  newTripTitle: string;
  cover: string | null;
  dateFix: string;
  placeFix: string;
  groupTarget: Record<string, 'dag' | 'minne' | 'bilder'>;
  groupMeta: Record<string, { date?: string | null; dateFrom?: number; place?: string | null; placeFrom?: number }>;
  confirm: { id: string; kind: 'dato' | 'sted' } | null;
  started: boolean;
  done: boolean;
  added?: boolean;
  resultTripId?: string;
  fromFiles: boolean;
  reading: number;
}

export type MapSel = { kind: 'destination' | 'place'; id: string } | null;
export type Sheet = 'peek' | 'open' | 'closed';

interface UiState {
  ready: boolean;
  user: PersonId;
  loggedIn: boolean;
  realOnline: boolean;
  /** 'cloud' when Supabase is configured (shared archive), 'local' for development without a server. */
  mode: 'local' | 'cloud';
  authState: 'checking' | 'signedOut' | 'signedIn' | 'noAccess';
  email: string;
  sync: SyncState;
  isMobile: boolean;
  toasts: { id: number; text: string }[];
  addOpen: boolean;
  syncOpen: boolean;
  lightbox: { list: Photo[]; i: number } | null;
  pdfOpen: boolean;
  // kart
  mapSel: MapSel;
  mapTrip: string;
  mapYear: string;
  mapQuery: string;
  mapList: boolean;
  sheet: Sheet;
  mapZoom: number;
  mapFocus: { id: string | null; lat: number; lng: number; zoom: number; n: number } | null;
  // reiser
  tripQuery: string;
  tripYear: string;
  // skjema
  newTrip: NewTripForm;
  newMem: NewMemForm;
  saveStatus: SaveStatus | null;
  dreamForm: DreamForm;
  showDreamForm: boolean;
  imp: ImportState | null;
  // bok og eksport
  bookOpts: { comments: boolean; ratings: boolean };
  exportSel: string;
  exportStep: 0 | 1 | 2 | 3;
  exportPct: number;
  exportFormat: 'pdf' | 'zip';
  offlinePick: string | null;
  /** Title shown in the mobile top bar. */
  pageTitle: string;
}

export type State = Archive & UiState;

const CLOUD = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

const emptyNewTrip = (): NewTripForm => ({ title: '', dest: '', precision: 'dag', start: '', end: '' });
const emptyNewMem = (tripId: string): NewMemForm => ({ title: '', text: '', date: '', month: '', precision: 'dag', writeStatus: 'arbeid', placeId: '', type: 'hverdag', tripId, comment: '', photos: [] });

export const useStore = create<State>()(() => ({
  ...demoArchive(),
  ready: false,
  user: readPref<PersonId>('user', 'knut'),
  loggedIn: CLOUD ? false : readPref<boolean>('loggedIn', false),
  realOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  mode: CLOUD ? 'cloud' : 'local',
  authState: 'checking',
  email: '',
  sync: { phase: 'off', pending: 0, photosTotal: 0, photosDone: 0 },
  isMobile: typeof window === 'undefined' ? false : window.innerWidth < 820,
  toasts: [],
  addOpen: false,
  syncOpen: false,
  lightbox: null,
  pdfOpen: false,
  mapSel: null,
  mapTrip: 'alle',
  mapYear: 'alle',
  mapQuery: '',
  mapList: false,
  sheet: 'peek',
  mapZoom: 2,
  mapFocus: null,
  tripQuery: '',
  tripYear: 'alle',
  newTrip: emptyNewTrip(),
  newMem: emptyNewMem('cannes-2026'),
  saveStatus: null,
  dreamForm: { title: '', place: '', note: '', when: '' },
  showDreamForm: false,
  imp: null,
  bookOpts: { comments: true, ratings: true },
  exportSel: 'cannes-2025',
  exportStep: 0,
  exportPct: 0,
  exportFormat: 'zip',
  offlinePick: null,
  pageTitle: '',
}));

const get = useStore.getState;
const set = useStore.setState;

export const isOnline = (s: State = get()) => s.realOnline;

/** Set by the sync client so store actions can ask for a sync without importing it. */
export const hooks = { syncNow: () => {} };

// ---------------------------------------------------------------------------
// Persistence: the archive is written to IndexedDB after every change.
// ---------------------------------------------------------------------------

const ARCHIVE_KEYS = ['version', 'trips', 'places', 'memories', 'dreams', 'upcoming', 'queue', 'lastSync', 'offlineDl'] as const;
const pickArchive = (s: State): Archive => Object.fromEntries(ARCHIVE_KEYS.map(k => [k, s[k]])) as unknown as Archive;

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let lastSaved: Archive | null = null;

export async function initStore() {
  let a: Archive | null = null;
  try {
    a = await loadArchive();
  } catch {
    /* IndexedDB unavailable: run from memory */
  }
  if (!a) {
    a = demoArchive();
    try { await saveArchive(a); } catch { /* ignore */ }
  }
  lastSaved = a;
  Object.entries(a.offlineDl).forEach(([k, d]) => { if (d.status === 'laster') a!.offlineDl[k] = { ...d, status: 'pause' }; });
  set({ ...a, ready: true, newMem: emptyNewMem(a.trips.find(t => t.status !== 'ferdig')?.id ?? a.trips[0]?.id ?? '') });
  requestPersistence();

  useStore.subscribe(s => {
    if (!s.ready) return;
    const changed = ARCHIVE_KEYS.some(k => lastSaved && s[k] !== (lastSaved as unknown as Record<string, unknown>)[k]);
    if (!changed) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => persistNow().catch(() => toast('Kunne ikke lagre på denne telefonen – sjekk ledig plass')), 250);
  });
  useStore.subscribe((s, prev) => {
    if (s.user !== prev.user) writePref('user', s.user);
    if (s.loggedIn !== prev.loggedIn && s.mode === 'local') writePref('loggedIn', s.loggedIn);
  });

  const onNet = () => {
    const was = isOnline();
    set({ realOnline: navigator.onLine });
    if (!was && isOnline() && get().mode === 'cloud' && get().sync.pending > 0) toast('Nett tilbake – sender det som venter');
    if (isOnline()) hooks.syncNow();
  };
  window.addEventListener('online', onNet);
  window.addEventListener('offline', onNet);
}

/** Writes the archive and resolves once IndexedDB has confirmed it. */
export async function persistNow() {
  const a = pickArchive(get());
  await saveArchive(a);
  lastSaved = a;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const timers = new Set<ReturnType<typeof setTimeout>>();
function later(fn: () => void, ms: number) {
  const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
  timers.add(t);
  return t;
}

export function toast(text: string) {
  const id = Date.now() + Math.random();
  set(s => ({ toasts: [...s.toasts, { id, text }] }));
  later(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 2800);
}

const updTrip = (id: string, fn: (t: Trip) => Trip) => set(s => ({ trips: s.trips.map(t => (t.id === id ? fn(t) : t)) }));
const updMem = (id: string, fn: (m: Memory) => Memory) => set(s => ({ memories: s.memories.map(m => (m.id === id ? fn(m) : m)) }));

/** Adds a dated memory to its day, creating the day if needed. */
export function withDay(t: Trip, mem: Memory): Trip {
  if (!mem.date || mem.precision !== 'dag' || mem.date.length < 10) return t;
  const has = t.days.some(d => d.date === mem.date);
  const days = has
    ? t.days.map(d => (d.date === mem.date ? { ...d, memoryIds: [...d.memoryIds, mem.id] } : d))
    : [...t.days, { date: mem.date, title: '', memoryIds: [mem.id] }].sort((a, b) => (a.date < b.date ? -1 : 1));
  return { ...t, days };
}

// ---------------------------------------------------------------------------
// Session. With a server, login is by e-mail code (sync/client.ts); without one
// (local development) these pick a person on this device.
// ---------------------------------------------------------------------------

export const login = (who: PersonId) => set({ user: who, loggedIn: true });
export const logout = () => set({ loggedIn: false });
export const switchUser = () => {
  set(s => ({ user: otherPerson(s.user) }));
  toast('Du er nå ' + PEOPLE[get().user].name);
};

/** «Prøv igjen» / «Fortsett synkronisering nå». */
export const retryAll = () => hooks.syncNow();

export function resolveConflict(tripId: string, text: string) {
  updTrip(tripId, t => ({ ...t, intro: text, conflict: null }));
  toast('Felles versjon lagret');
}

/** Both of you rewrote a memory's shared text: keep the chosen (or combined) version. */
export function resolveMemConflict(memId: string, text: string) {
  const user = get().user;
  updMem(memId, m => ({ ...m, text, editedBy: user, conflict: null }));
  toast('Felles versjon lagret');
}

// ---------------------------------------------------------------------------
// Memory: text, ratings, comments, writing status
// ---------------------------------------------------------------------------

export function saveMemText(id: string, text: string) {
  const user = get().user;
  updMem(id, m => ({ ...m, text, editedBy: user }));
  toast('Felles tekst lagret på denne telefonen');
}

export function rate(id: string, stars: number | null) {
  const user = get().user;
  updMem(id, m => {
    const v = m.visit || { ratings: {} };
    const r = v.ratings[user] || { stars: null, text: '' };
    return { ...m, visit: { ...v, ratings: { ...v.ratings, [user]: { ...r, stars } } } };
  });
}

export function setRatingText(id: string, text: string) {
  const user = get().user;
  updMem(id, m => {
    const v = m.visit || { ratings: {} };
    const r = v.ratings[user] || { stars: null, text: '' };
    return { ...m, visit: { ...v, ratings: { ...v.ratings, [user]: { ...r, text } } } };
  });
}

export function addComment(id: string, text: string) {
  if (!text.trim()) return;
  const user = get().user;
  updMem(id, m => ({ ...m, comments: [...m.comments, { by: user, text: text.trim() }] }));
}

export function setWrite(id: string, ws: WriteStatus) {
  updMem(id, m => ({ ...m, writeStatus: ws }));
  toast(ws === 'ferdig' ? 'Merket som ferdig. Ingenting publiseres – arkivet er privat.' : 'Satt til «Under arbeid»');
}

// ---------------------------------------------------------------------------
// Story, photos, cover
// ---------------------------------------------------------------------------

export function moveBlock(tripId: string, i: number, dir: number) {
  updTrip(tripId, t => {
    const a = [...t.story];
    const j = i + dir;
    if (j < 0 || j >= a.length) return t;
    [a[i], a[j]] = [a[j], a[i]];
    return { ...t, story: a };
  });
}
export const removeBlock = (tripId: string, i: number) => updTrip(tripId, t => ({ ...t, story: t.story.filter((_, k) => k !== i) }));
export function addToStory(tripId: string, memId: string) {
  updTrip(tripId, t => ({ ...t, story: [...t.story, { type: 'memory', id: memId }] }));
  toast('Tatt med i historien – ingen kopi av tekst eller bilder');
}
export function addInterText(tripId: string, text: string) {
  if (!text.trim()) return;
  const block: StoryBlock = { type: 'text', text: text.trim() };
  updTrip(tripId, t => ({ ...t, story: [...t.story, block] }));
}

/** Featured and «in book» are separate flags. Featuring puts a photo in the book; removing it from the book un-features it. */
export function togglePhoto(pid: string, key: 'featured' | 'inBook') {
  set(s => ({
    memories: s.memories.map(m =>
      m.photos.some(p => p.id === pid)
        ? {
            ...m,
            photos: m.photos.map(p => {
              if (p.id !== pid) return p;
              const v = !(key === 'inBook' ? p.inBook !== false : !!p.featured);
              return key === 'featured' ? { ...p, featured: v, inBook: v ? true : p.inBook } : { ...p, inBook: v, featured: v ? p.featured : false };
            }),
          }
        : m,
    ),
  }));
}

export function setTripCover(tripId: string, pid: string) {
  const p = get().memories.flatMap(m => m.photos).find(x => x.id === pid);
  if (!p) return;
  updTrip(tripId, t => ({ ...t, cover: p }));
  toast('Forsidebilde endret');
}

// ---------------------------------------------------------------------------
// New trip / new memory
// ---------------------------------------------------------------------------

export function createTrip(): string | null {
  const f = get().newTrip;
  if (!f.title.trim()) { toast('Gi reisen en tittel'); return null; }
  const id = uid('t');
  const t: Trip = {
    id, title: f.title.trim(), destinations: f.dest.split(',').map(x => x.trim()).filter(Boolean), dest: null,
    start: f.precision === 'ukjent' ? null : f.start || null, end: f.precision === 'dag' ? f.end || null : null,
    precision: f.precision, status: 'uferdig', cover: null, intro: '', story: [], highlights: [], days: [],
  };
  if (!t.destinations.length) t.destinations = ['Ukjent sted'];
  set(s => ({ trips: [t, ...s.trips], newTrip: emptyNewTrip(), newMem: { ...s.newMem, tripId: id } }));
  toast('Reisen er opprettet – lagret på denne telefonen');
  return id;
}

/** Prepares the «Nytt minne» form for a trip and, optionally, a day. */
export function startMemory(tripId?: string | null, date?: string) {
  set(s => ({ newMem: { ...emptyNewMem(tripId || s.newMem.tripId), date: date || '' }, saveStatus: null }));
}

export async function addMemFiles(files: File[]) {
  const photos = await Promise.all(files.map(f => fileToPhoto(f)));
  set(s => ({ newMem: { ...s.newMem, photos: [...s.newMem.photos, ...photos] } }));
}

export function addDemoMemPhotos() {
  const user = get().user;
  set(s => ({ newMem: { ...s.newMem, photos: importDemo.slice(0, 12).map(p => ({ id: uid('dp'), src: p.src!.replace('/400/400', '/900/900'), w: 900, h: 900, caption: '', taken: p.taken, by: user, featured: false, inBook: true })) } }));
}

export async function saveMemory() {
  const s = get(), f = s.newMem;
  if (!f.title.trim()) { toast('Gi minnet en tittel'); return; }
  const id = uid('u');
  const n = f.photos.length;
  set({ saveStatus: { id, phase: 'lagrer', label: 'Lagrer på denne telefonen …', detail: '' } });
  const notStored = 'Ikke lagret: ' + n + ' bilder og teksten. Teksten er beholdt i skjemaet nedenfor. Frigjør plass eller fjern bilder, og prøv igjen.';

  const mem: Memory = {
    id, tripId: f.tripId,
    date: f.precision === 'dag' ? f.date || null : f.precision === 'maned' ? f.month || null : null,
    precision: f.precision === 'maned' && f.month ? 'maned' : 'dag',
    writeStatus: f.writeStatus, title: f.title.trim(), type: f.type, placeId: f.placeId || null,
    photos: f.photos.map(p => ({ ...p, by: s.user })), text: f.text,
    comments: f.comment.trim() ? [{ by: s.user, text: f.comment.trim() }] : [],
    local: true, createdBy: s.user, startedBy: f.writeStatus === 'arbeid' ? s.user : undefined,
    visit: ['mat', 'overnatting'].includes(f.type) ? { ratings: {} } : undefined,
  };
  const prev = { memories: s.memories, trips: s.trips, places: s.places };
  const online = isOnline();
  const cloud = s.mode === 'cloud';
  const other = PEOPLE[otherPerson(s.user)].name;
  set(st => ({
    memories: [...st.memories, mem],
    trips: st.trips.map(t => (t.id !== f.tripId ? t : { ...withDay(t, mem), story: [...t.story, { type: 'memory' as const, id }], status: t.status === 'planlagt' ? 'uferdig' : t.status })),
    places: mem.placeId ? st.places.map(p => (p.id === mem.placeId && !p.tripIds.includes(mem.tripId) ? { ...p, tripIds: [...p.tripIds, mem.tripId] } : p)) : st.places,
  }));
  // «Lagret» is shown only after IndexedDB has confirmed the write.
  try {
    await persistNow();
  } catch (e) {
    set(prev);
    set({ saveStatus: { id, phase: 'feil', label: isQuotaError(e) ? 'Kunne ikke lagres – ikke nok plass på telefonen' : 'Kunne ikke lagres – prøv igjen', detail: notStored, canRetry: true, storage: isQuotaError(e) } });
    return;
  }
  set(st => ({
    saveStatus: !cloud
      ? { id, phase: 'lokalt', label: 'Lagret på denne telefonen', detail: 'Appen er ikke koblet til det felles arkivet, så minnet finnes bare her.' }
      : online
        ? { id, phase: 'lokalt', label: 'Lagret på denne telefonen', detail: 'Ikke synkronisert ennå. Sendes til ' + other + 's telefon nå.' }
        : { id, phase: 'venter', label: 'Venter på nett', detail: 'Lagret på denne telefonen. Sendes når nettet er tilbake, eller neste gang appen åpnes med nett. Ikke sikkerhetskopiert ennå.' },
    newMem: { ...st.newMem, savedId: id },
  }));
  if (cloud && online) hooks.syncNow();
}

/** Called by the sync engine while a memory's photos upload and when it has reached the server. */
export function onMemorySyncProgress(id: string, done: number, total: number) {
  const st = get().saveStatus;
  if (st?.id !== id) return;
  set({ saveStatus: { id, phase: 'laster', label: 'Laster opp ' + done + ' av ' + total + ' bilder', detail: 'Lagret på denne telefonen. Synkroniseres til ' + PEOPLE[otherPerson(get().user)].name + 's telefon.' } });
}
export function onMemorySynced(id: string) {
  const s = get(), st = s.saveStatus;
  if (st?.id !== id) return;
  const m = s.memories.find(x => x.id === id);
  const ws = m && m.writeStatus === 'ferdig' ? 'Ferdig' : 'Under arbeid – den andre kan fortsette å skrive';
  set({ saveStatus: { id, phase: 'synk', label: 'Synkronisert', detail: 'Finnes nå på begge telefonene. Skrivestatus er uendret (' + ws + '). Lag gjerne en sikkerhetskopi under Innstillinger → Eksport.' } });
}
export function onSyncFailed() {
  const st = get().saveStatus;
  if (!st || !['laster', 'lokalt'].includes(st.phase)) return;
  set({ saveStatus: { ...st, phase: 'feil', label: 'Kunne ikke lagres på serveren – prøv igjen', detail: 'Minnet er lagret på denne telefonen. Nytt forsøk fortsetter der det stoppet, uten å lage duplikater.', canRetry: true } });
}

export function retrySave() {
  const st = get().saveStatus;
  if (st && st.storage) { saveMemory(); return; }
  if (st) set({ saveStatus: { ...st, phase: 'laster', label: 'Prøver igjen …', canRetry: false } });
  hooks.syncNow();
}

export const resetMemForm = () => set(s => ({ newMem: emptyNewMem(s.newMem.tripId), saveStatus: null }));

// ---------------------------------------------------------------------------
// Dreams and upcoming trips
// ---------------------------------------------------------------------------

export function addDream() {
  const f = get().dreamForm;
  if (!f.title.trim()) { toast('Skriv hvor dere vil'); return; }
  const d: Dream = { id: uid('d'), title: f.title.trim(), place: f.place, note: f.note, when: f.when, photo: null };
  set(s => ({ dreams: [d, ...s.dreams], dreamForm: { title: '', place: '', note: '', when: '' }, showDreamForm: false }));
  toast('Lagt til under «Vi drømmer om»');
}

export function toUpcoming(id: string) {
  const s = get();
  const d = s.dreams.find(x => x.id === id);
  if (!d) return;
  set({
    dreams: s.dreams.filter(x => x.id !== id),
    upcoming: [...s.upcoming, { ...d, when: null }],
    places: d.dest ? s.places.map(p => (p.id === d.dest ? { ...p, status: 'planlagt' as const, tripIds: [] } : p)) : s.places,
  });
  toast(d.title + ' er nå en kommende reise');
}

export function backToDream(id: string) {
  const s = get();
  const d = s.upcoming.find(x => x.id === id);
  if (!d) return;
  set({
    upcoming: s.upcoming.filter(x => x.id !== id),
    dreams: [d, ...s.dreams],
    places: d.dest ? s.places.map(p => (p.id === d.dest ? { ...p, status: 'drom' as const, tripIds: [] } : p)) : s.places,
  });
}

/** Turns an upcoming trip into a trip book, keeping its note and photo. Returns the new trip id. */
export function startDocumenting(id: string): string | null {
  const s = get();
  const u = s.upcoming.find(x => x.id === id);
  if (!u) return null;
  const tid = 't-' + id;
  const t: Trip = { id: tid, title: u.title, destinations: [u.place || u.title], dest: u.dest || null, start: null, end: null, precision: 'ukjent', status: 'planlagt', cover: u.photo, intro: u.note || '', story: [], highlights: [], days: [], fromDream: true };
  set({ trips: [...s.trips, t], upcoming: s.upcoming.filter(x => x.id !== id), places: s.places.map(p => (p.id === u.dest ? { ...p, tripIds: [tid] } : p)) });
  toast('Reiseboken er opprettet. Notatet og bildet ble med.');
  return tid;
}

export function removeDream(id: string) {
  const s = get();
  const d = s.dreams.find(x => x.id === id);
  if (!d) return;
  // Its dotted «drøm» marker leaves the map too.
  set({ dreams: s.dreams.filter(x => x.id !== id), places: d.dest ? s.places.filter(p => !(p.id === d.dest && p.status === 'drom')) : s.places });
  toast('«' + d.title + '» er fjernet');
}

// ---------------------------------------------------------------------------
// Photo import
// ---------------------------------------------------------------------------

async function imageSize(blob: Blob): Promise<{ w: number; h: number }> {
  try {
    const bmp = await createImageBitmap(blob);
    const r = { w: bmp.width, h: bmp.height };
    bmp.close();
    return r;
  } catch {
    return { w: 1, h: 1 };
  }
}

async function fileToPhoto(f: File): Promise<Photo> {
  const key = uid('blob');
  await putBlob(key, f);
  const { w, h } = await imageSize(f);
  return { id: uid('lf'), blobKey: key, w, h, caption: '', taken: null, by: get().user, featured: false, inBook: true };
}

const distM = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLng = (b.lng - a.lng) * toR;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

/** A position is only a suggestion: nearby places are offered, never assumed. */
function suggestPlace(pos: { lat: number; lng: number }, places: Place[]): Pick<ImportItem, 'place' | 'conf'> {
  let best: Place | null = null, bd = Infinity;
  places.filter(p => p.kind === 'place').forEach(p => { const d = distM(pos, p); if (d < bd) { bd = d; best = p; } });
  if (!best || bd > 400) return { place: null, conf: null };
  return { place: (best as Place).id, conf: bd < 60 ? 'sikker' : 'usikker' };
}

function toLocalIso(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}

export function startImport(tripId?: string | null) {
  const s = get();
  const fallback = s.trips.find(t => t.status === 'uferdig')?.id ?? s.trips[0]?.id ?? 'ny';
  set({ imp: { step: 1, items: [], tripChoice: tripId || fallback, newTripTitle: '', cover: null, dateFix: '', placeFix: '', groupTarget: {}, groupMeta: {}, confirm: null, started: false, done: false, fromFiles: false, reading: 0 } });
}

export const impSet = (patch: Partial<ImportState>) => set(s => (s.imp ? { imp: { ...s.imp, ...patch } } : {}));
export const impItems = (fn: (i: ImportItem) => ImportItem) => set(s => (s.imp ? { imp: { ...s.imp, items: s.imp.items.map(fn) } } : {}));

export function useDemoImport() {
  impSet({ items: importDemo.map(p => ({ ...p })), fromFiles: false });
}

/** Reads date and position from the photo files (EXIF) and stores the originals on this phone. */
export async function addImportFiles(files: File[]) {
  if (!files.length) return;
  impSet({ reading: (get().imp?.reading ?? 0) + files.length, fromFiles: true });
  const exifr = (await import('exifr')).default;
  const places = get().places;
  for (const f of files) {
    let taken: string | null = null, pos: ImportItem['pos'] = null;
    try {
      const meta = await exifr.parse(f, { pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'], gps: true });
      const dt: Date | undefined = meta?.DateTimeOriginal || meta?.CreateDate;
      if (dt instanceof Date && !isNaN(+dt)) taken = toLocalIso(dt);
      if (typeof meta?.latitude === 'number' && typeof meta?.longitude === 'number') pos = { lat: meta.latitude, lng: meta.longitude };
    } catch {
      /* no metadata: never blocks the import */
    }
    const key = uid('blob');
    try { await putBlob(key, f); } catch { /* shown as failed later */ }
    const { w, h } = await imageSize(f);
    const sugg = pos ? suggestPlace(pos, places) : { place: null, conf: null };
    const cur = get().imp;
    if (!cur) return;
    // Same capture time and position as an earlier photo: shown as a possible duplicate, never deleted.
    const dup = taken ? cur.items.find(i => i.taken === taken && JSON.stringify(i.pos) === JSON.stringify(pos)) : undefined;
    const item: ImportItem = { id: uid('lf'), name: f.name, blobKey: key, w, h, taken, pos, ...sugg, dupOf: dup ? dup.id : null, status: 'venter', caption: '', local: true, featured: false, inBook: true };
    set(s => (s.imp ? { imp: { ...s.imp, items: [...s.imp.items, item], reading: Math.max(0, s.imp.reading - 1) } } : {}));
  }
}

export const removeImp = (id: string) => set(s => (s.imp ? { imp: { ...s.imp, items: s.imp.items.filter(i => i.id !== id) } } : {}));

export function applyDateFix() {
  const d = get().imp?.dateFix;
  if (!d) return;
  impItems(i => (i.taken ? i : { ...i, taken: d + 'T12:00', fixedDate: true }));
  toast('Dato satt på bildene som manglet dato');
}

export function applyPlaceFix() {
  const p = get().imp?.placeFix;
  if (!p) return;
  impItems(i => (i.pos || i.place ? i : { ...i, place: p, conf: 'manuell' }));
  toast('Sted satt på bildene som manglet posisjon');
}

export const confirmPlace = (id: string) => impItems(i => (i.id === id ? { ...i, conf: 'bekreftet' } : i));
export const setItemPlace = (id: string, v: string) => impItems(i => (i.id === id ? { ...i, place: v || null, conf: v ? 'manuell' : null } : i));
export const setItemDate = (id: string, v: string) => impItems(i => (i.id === id ? { ...i, taken: v ? v + 'T12:00' : null, fixedDate: true } : i));
export const keepDup = (id: string) => impItems(i => (i.id === id ? { ...i, dupOf: null, keptDup: true } : i));
export const dropDup = removeImp;
export const setImpCaption = (id: string, caption: string) => impItems(i => (i.id === id ? { ...i, caption } : i));
export const toggleImpFeat = (id: string) => impItems(i => (i.id === id ? { ...i, featured: !i.featured, inBook: !i.featured ? true : i.inBook } : i));
export const toggleImpBook = (id: string) => impItems(i => (i.id === id ? { ...i, inBook: !i.inBook, featured: !i.inBook ? i.featured : false } : i));

export function moveImp(id: string, dir: number) {
  set(s => {
    if (!s.imp) return {};
    const a = [...s.imp.items];
    const i = a.findIndex(x => x.id === id), j = i + dir;
    if (j < 0 || j >= a.length) return {};
    [a[i], a[j]] = [a[j], a[i]];
    return { imp: { ...s.imp, items: a } };
  });
}

export const groupKey = (i: Pick<ImportItem, 'taken'>) => (i.taken ? i.taken.slice(0, 10) : 'uten');

export function setGroupTarget(key: string, v: 'dag' | 'minne' | 'bilder') {
  set(s => (s.imp ? { imp: { ...s.imp, groupTarget: { ...s.imp.groupTarget, [key]: v } } } : {}));
}

/** «Bruk dato fra bildet» / «Bruk bildets sted» – applied to the whole group after confirmation. */
export function impConfirmDo() {
  const s = get(), imp = s.imp, c = imp?.confirm;
  if (!imp || !c) return;
  const it = imp.items.find(i => i.id === c.id);
  if (!it) return;
  const k = groupKey(it);
  const meta = { ...(imp.groupMeta[k] || {}) };
  const num = imp.items.indexOf(it) + 1;
  if (c.kind === 'dato') { meta.date = it.taken; meta.dateFrom = num; } else { meta.place = it.place; meta.placeFrom = num; }
  set({
    imp: {
      ...imp, confirm: null, groupMeta: { ...imp.groupMeta, [k]: meta },
      items: c.kind === 'sted' ? imp.items.map(i => (groupKey(i) === k ? { ...i, place: it.place, conf: 'bekreftet' as const } : i)) : imp.items,
    },
  });
  toast(c.kind === 'dato' ? 'Dato brukt på gruppen' : 'Sted brukt på gruppen');
}

/** Saves the photos on this phone right away; uploading to the shared archive follows in the background. */
export function startUpload() {
  const s = get();
  if (!s.imp) return;
  if (s.imp.tripChoice === 'ny' && !s.imp.newTripTitle.trim()) { toast('Gi den nye reisen en tittel'); return; }
  impSet({ step: 4, started: true, done: false, items: s.imp.items.map(i => ({ ...i, status: 'ok' })) });
  finishImport();
  hooks.syncNow();
}

export const retryFailed = () => hooks.syncNow();

/** Adds the photos to the chosen trip, one memory per date group. Safe to call twice. */
function finishImport() {
  const s = get(), imp = s.imp;
  if (!imp) return;
  const ok = imp.items.filter(i => i.status === 'ok');
  if (!ok.length) return;
  const added = new Set(s.memories.flatMap(m => m.photos.map(p => p.id)));
  const fresh = ok.filter(i => !added.has(i.id));
  impSet({ done: true });
  if (!fresh.length) return;

  let trips = s.trips;
  let tid = imp.tripChoice;
  if (tid === 'ny') {
    tid = imp.resultTripId || uid('t');
    if (!trips.some(t => t.id === tid)) {
      const dates = fresh.map(i => i.taken).filter(Boolean).sort() as string[];
      trips = [{ id: tid, title: imp.newTripTitle.trim() || 'Ny reise', destinations: ['Ukjent sted'], dest: null, start: dates[0]?.slice(0, 10) ?? null, end: dates[dates.length - 1]?.slice(0, 10) ?? null, precision: dates.length ? 'dag' : 'ukjent', status: 'uferdig', cover: null, intro: '', story: [], highlights: [], days: [] }, ...trips];
    }
  }
  const toPhoto = (i: ImportItem): Photo => ({ id: i.id, src: i.src ? i.src.replace('/400/400', '/900/900') : undefined, blobKey: i.blobKey, w: i.src ? 900 : i.w, h: i.src ? 900 : i.h, caption: i.caption, taken: i.taken, by: s.user, featured: i.featured, inBook: i.inBook });

  const groups: Record<string, ImportItem[]> = {};
  fresh.forEach(i => { (groups[groupKey(i)] ||= []).push(i); });
  const newMems: Memory[] = [];
  let placeIds = new Set<string>();
  let trip = trips.find(t => t.id === tid)!;
  Object.keys(groups).sort().forEach(k => {
    const g = groups[k];
    const day = trip.days.find(d => d.date === k);
    const target = imp.groupTarget[k] || (day ? 'dag' : 'minne');
    const counts: Record<string, number> = {};
    g.forEach(i => { if (i.place && i.conf !== 'usikker') counts[i.place] = (counts[i.place] || 0) + 1; });
    const placeId = imp.groupMeta[k]?.place || Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || null;
    const mem: Memory = {
      id: uid('imp'), tripId: tid, date: k === 'uten' ? null : k, precision: 'dag',
      title: k === 'uten' ? 'Bilder uten dato' : 'Bilder fra ' + fmtDate(k), type: 'hverdag', placeId,
      photos: g.map(toPhoto), text: '', comments: [], writeStatus: 'arbeid', createdBy: s.user, startedBy: s.user, imported: true,
      galleryOnly: target === 'bilder', local: true,
    };
    newMems.push(mem);
    if (placeId) placeIds.add(placeId);
    if (target !== 'bilder') trip = withDay(trip, mem);
    if (target === 'minne') trip = { ...trip, story: [...trip.story, { type: 'memory', id: mem.id }] };
  });
  const allPhotos = newMems.flatMap(m => m.photos);
  if (!trip.cover && allPhotos.length) trip = { ...trip, cover: allPhotos.find(p => p.id === imp.cover) || allPhotos[0] };
  else if (imp.cover && allPhotos.some(p => p.id === imp.cover)) trip = { ...trip, cover: allPhotos.find(p => p.id === imp.cover)! };
  if (trip.status === 'planlagt') trip = { ...trip, status: 'uferdig' };

  set(st => ({
    trips: trips.map(t => (t.id === tid ? trip : t)),
    memories: [...st.memories, ...newMems],
    places: st.places.map(p => (placeIds.has(p.id) && !p.tripIds.includes(tid) ? { ...p, tripIds: [...p.tripIds, tid] } : p)),
    lastSync: new Date().toISOString(),
    imp: st.imp ? { ...st.imp, added: true, resultTripId: tid } : st.imp,
  }));
}

// ---------------------------------------------------------------------------
// Offline download of a trip and export (simulated)
// ---------------------------------------------------------------------------

export function startOffline(id: string, scope: OfflineScope) {
  set(s => ({ offlinePick: null, offlineDl: { ...s.offlineDl, [id]: { status: 'laster', pct: 0, scope } } }));
  const step = () => {
    const d = get().offlineDl[id];
    if (!d || d.status !== 'laster') return;
    if (!isOnline()) { set(s => ({ offlineDl: { ...s.offlineDl, [id]: { ...d, status: 'pause' } } })); return; }
    const pct = Math.min(100, d.pct + 9);
    set(s => ({ offlineDl: { ...s.offlineDl, [id]: { ...d, pct, status: pct >= 100 ? 'klar' : 'laster' } } }));
    if (pct < 100) later(step, 260);
  };
  later(step, 300);
}
export const resumeOffline = (id: string) => { const d = get().offlineDl[id]; if (d) startOffline(id, d.scope); };
export const removeOffline = (id: string) => set(s => { const o = { ...s.offlineDl }; delete o[id]; return { offlineDl: o }; });

export function openExport(id: string | null) {
  set({ exportSel: id || get().trips.find(t => t.status !== 'planlagt')?.id || 'alt', exportStep: 0, exportPct: 0 });
}

export function prepareExport() {
  set({ exportStep: 1, exportPct: 0 });
  const step = () => {
    const p = Math.min(100, get().exportPct + 12);
    set({ exportPct: p, exportStep: p >= 100 ? 2 : 1 });
    if (p < 100) later(step, 180);
  };
  later(step, 200);
}

// ---------------------------------------------------------------------------
// Deleting. Everything that points at the deleted item is cleaned up, so no view
// is left with a dangling reference. Original photo files are removed from the phone.
// ---------------------------------------------------------------------------

const blobKeys = (photos: Photo[]) => photos.map(p => p.blobKey).filter(Boolean) as string[];
const dropBlobs = (keys: string[]) => keys.forEach(k => deleteBlob(k).catch(() => {}));

/** Drops `tripId` from places no longer used by that trip, and removes places nothing uses any more. */
function prunePlaces(places: Place[], memories: Memory[], tripId: string, onlyIds?: Set<string>): Place[] {
  return places
    .map(p => {
      if (onlyIds && !onlyIds.has(p.id)) return p;
      if (p.kind !== 'place' || !p.tripIds.includes(tripId)) return p;
      return memories.some(m => m.tripId === tripId && m.placeId === p.id) ? p : { ...p, tripIds: p.tripIds.filter(t => t !== tripId) };
    })
    .filter(p => !(p.kind === 'place' && p.tripIds.length === 0 && !memories.some(m => m.placeId === p.id)));
}

export function deleteMemory(id: string) {
  const s = get();
  const m = s.memories.find(x => x.id === id);
  if (!m) return;
  const memories = s.memories.filter(x => x.id !== id);
  const photoIds = new Set(m.photos.map(p => p.id));
  set({
    memories,
    trips: s.trips.map(t => (t.id !== m.tripId ? t : {
      ...t,
      story: t.story.filter(b => !(b.type === 'memory' && b.id === id)),
      days: t.days.map(d => ({ ...d, memoryIds: d.memoryIds.filter(x => x !== id) })),
      highlights: t.highlights.filter(x => x !== id),
      cover: t.cover && photoIds.has(t.cover.id) ? null : t.cover,
    })),
    places: m.placeId ? prunePlaces(s.places, memories, m.tripId, new Set([m.placeId])) : s.places,
    queue: s.queue.filter(i => i.id !== id),
    saveStatus: s.saveStatus?.id === id ? null : s.saveStatus,
    lightbox: null,
  });
  dropBlobs(blobKeys(m.photos));
  toast('«' + m.title + '» er slettet');
}

export function deleteTrip(id: string) {
  const s = get();
  const t = s.trips.find(x => x.id === id);
  if (!t) return;
  const gone = s.memories.filter(m => m.tripId === id);
  const memories = s.memories.filter(m => m.tripId !== id);
  const trips = s.trips.filter(x => x.id !== id);
  const offlineDl = { ...s.offlineDl };
  delete offlineDl[id];
  set({
    trips,
    memories,
    places: prunePlaces(s.places, memories, id)
      .map(p => (p.kind === 'destination' ? { ...p, tripIds: p.tripIds.filter(x => x !== id) } : p))
      // A visited destination with no trips left disappears from the map; dreams and planned ones stay.
      .filter(p => !(p.kind === 'destination' && p.status === 'besokt' && p.tripIds.length === 0)),
    queue: s.queue.filter(i => !gone.some(m => m.id === i.id)),
    offlineDl,
    mapTrip: s.mapTrip === id ? 'alle' : s.mapTrip,
    mapSel: null,
    exportSel: s.exportSel === id ? 'alt' : s.exportSel,
    newMem: s.newMem.tripId === id ? { ...s.newMem, tripId: trips[0]?.id ?? '' } : s.newMem,
    lightbox: null,
  });
  dropBlobs(gone.flatMap(m => blobKeys(m.photos)));
  toast('«' + t.title + '» er slettet');
}

export function deletePhoto(memId: string, photoId: string) {
  const s = get();
  const m = s.memories.find(x => x.id === memId);
  const p = m?.photos.find(x => x.id === photoId);
  if (!m || !p) return;
  set({
    memories: s.memories.map(x => (x.id === memId ? { ...x, photos: x.photos.filter(y => y.id !== photoId) } : x)),
    trips: s.trips.map(t => (t.cover?.id === photoId ? { ...t, cover: null } : t)),
    lightbox: null,
  });
  dropBlobs(blobKeys([p]));
  toast('Bildet er slettet');
}

/** Each of you can delete only your own comments. */
export function deleteComment(memId: string, index: number) {
  const s = get();
  updMem(memId, m => (m.comments[index]?.by === s.user ? { ...m, comments: m.comments.filter((_, i) => i !== index) } : m));
}

export function deleteUpcoming(id: string) {
  const s = get();
  const u = s.upcoming.find(x => x.id === id);
  if (!u) return;
  set({
    upcoming: s.upcoming.filter(x => x.id !== id),
    // Its planned marker goes too, unless a trip book was already started for it.
    places: u.dest ? s.places.filter(p => !(p.id === u.dest && p.status === 'planlagt' && !s.trips.some(t => t.dest === u.dest))) : s.places,
  });
  toast('«' + u.title + '» er fjernet');
}
