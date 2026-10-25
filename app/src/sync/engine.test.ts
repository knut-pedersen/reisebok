import { describe, expect, it } from 'vitest';
import { createStore } from 'zustand/vanilla';
import type { Archive, Memory, QueueItem } from '../data/types';
import { demoArchive } from '../data/demo';
import { createSyncEngine, type SyncMeta, type SyncState } from './engine';
import { memoryServer } from './memoryBackend';

type S = Archive & { sync: SyncState; queue: QueueItem[] };
const seedIds = (() => {
  const a = demoArchive();
  const ids = new Set<string>();
  ([['trip', a.trips], ['memory', a.memories], ['place', a.places], ['dream', a.dreams], ['upcoming', a.upcoming]] as const).forEach(([k, l]) => l.forEach(e => ids.add(k + ':' + e.id)));
  return ids;
})();

function phone(server: ReturnType<typeof memoryServer>, userId: string, me: 'knut' | 'anna', blobs = new Map<string, Blob>()) {
  const store = createStore<S>()(() => ({ ...demoArchive(), queue: [], sync: { phase: 'off', pending: 0, photosTotal: 0, photosDone: 0 } }));
  let meta: SyncMeta | null = null;
  let online = true;
  const notes: string[] = [];
  const engine = createSyncEngine<S>({
    store, backend: server.client(userId), me, seedIds,
    loadMeta: async () => meta && JSON.parse(JSON.stringify(meta)),
    saveMeta: async m => { meta = JSON.parse(JSON.stringify(m)); },
    getBlob: async k => blobs.get(k) ?? null,
    displayCopy: async b => new Blob(['small:' + (await b.text())], { type: 'image/jpeg' }),
    isOnline: () => online,
    notify: t => notes.push(t),
  });
  const mem = (id: string) => store.getState().memories.find(m => m.id === id)!;
  const editMem = (id: string, fn: (m: Memory) => Memory) => store.setState(s => ({ memories: s.memories.map(m => (m.id === id ? fn(m) : m)) }));
  return { store, engine, blobs, notes, mem, editMem, setOnline: (v: boolean) => { online = v; } };
}

async function pair() {
  const server = memoryServer({ uk: 'knut', ua: 'anna' });
  const knut = phone(server, 'uk', 'knut');
  const anna = phone(server, 'ua', 'anna');
  await knut.engine.start(); await knut.engine.settle();
  await anna.engine.start(); await anna.engine.settle();
  return { server, knut, anna };
}

describe('sync engine', () => {
  it('seeds an empty server from the first phone; the second phone takes the shared archive', async () => {
    const server = memoryServer({ uk: 'knut', ua: 'anna' });
    const knut = phone(server, 'uk', 'knut');
    await knut.engine.start(); await knut.engine.settle();
    expect(server.rows.get('trip:cannes-2025')).toBeTruthy();
    expect(server.rows.size).toBe(seedIds.size);

    // Knut deletes a demo dream before Anna ever logs in.
    knut.store.setState(s => ({ dreams: s.dreams.filter(d => d.id !== 'lisboa') }));
    await knut.engine.settle();

    const anna = phone(server, 'ua', 'anna');
    // Anna made a trip on her phone before logging in: it must survive.
    anna.store.setState(s => ({ trips: [...s.trips, { ...s.trips[0], id: 'annas-egen', title: 'Annas egen' }] }));
    await anna.engine.start(); await anna.engine.settle();
    expect(anna.store.getState().dreams.some(d => d.id === 'lisboa')).toBe(false);
    expect(anna.store.getState().trips.some(t => t.id === 'annas-egen')).toBe(true);
    expect(server.rows.get('trip:annas-egen')).toBeTruthy();
  });

  it('sends an edit to the other phone', async () => {
    const { knut, anna } = await pair();
    knut.editMem('m1', m => ({ ...m, title: 'Første kveld (ny tittel)' }));
    await knut.engine.settle(); await anna.engine.settle();
    expect(anna.mem('m1').title).toBe('Første kveld (ny tittel)');
  });

  it('keeps both versions when both rewrite the shared text', async () => {
    const { knut, anna } = await pair();
    knut.setOnline(false);
    knut.editMem('m1', m => ({ ...m, text: 'Knuts versjon' }));
    await knut.engine.settle();
    expect(knut.store.getState().queue[0]).toMatchObject({ id: 'm1', status: 'venter' });
    anna.editMem('m1', m => ({ ...m, text: 'Annas version' }));
    await anna.engine.settle();
    knut.setOnline(true);
    await knut.engine.settle();
    const m = knut.mem('m1');
    expect(m.text).toBe('Annas version');
    expect(m.conflict).toMatchObject({ field: 'text', by: 'anna', mine: 'Knuts versjon', theirs: 'Annas version' });
    // The conflict stays on Knut's phone; Anna's copy is unaffected.
    await anna.engine.settle();
    expect(anna.mem('m1').conflict).toBeUndefined();
    // Knut resolves: the chosen text reaches Anna.
    knut.editMem('m1', x => ({ ...x, text: 'Felles versjon', conflict: null }));
    await knut.engine.settle(); await anna.engine.settle();
    expect(anna.mem('m1').text).toBe('Felles versjon');
  });

  it('merges comments and ratings made at the same time', async () => {
    const { knut, anna } = await pair();
    knut.setOnline(false);
    knut.editMem('m3', m => ({ ...m, comments: [...m.comments, { by: 'knut', text: 'Fra Knut' }], visit: { ratings: { ...m.visit!.ratings, knut: { stars: 2, text: 'Endret' } } } }));
    anna.editMem('m3', m => ({ ...m, comments: [...m.comments, { by: 'anna', text: 'Från Anna' }], visit: { ratings: { ...m.visit!.ratings, anna: { stars: 1, text: 'Ändrat' } } } }));
    await anna.engine.settle();
    knut.setOnline(true);
    await knut.engine.settle(); await anna.engine.settle();
    for (const p of [knut, anna]) {
      const m = p.mem('m3');
      expect(m.comments.map(c => c.text)).toEqual(expect.arrayContaining(['Fra Knut', 'Från Anna']));
      expect(m.visit!.ratings.knut!.stars).toBe(2);
      expect(m.visit!.ratings.anna!.stars).toBe(1);
    }
  });

  it('deletes on both phones, and keeps an edit made while the other phone deleted', async () => {
    const { knut, anna } = await pair();
    knut.store.setState(s => ({ trips: s.trips.filter(t => t.id !== 'cannes-2025') }));
    await knut.engine.settle(); await anna.engine.settle();
    expect(anna.store.getState().trips.some(t => t.id === 'cannes-2025')).toBe(false);

    knut.setOnline(false);
    knut.store.setState(s => ({ memories: s.memories.filter(m => m.id !== 'n4') }));
    anna.editMem('n4', m => ({ ...m, text: m.text + ' Vi kom fram til slutt.' }));
    await anna.engine.settle();
    knut.setOnline(true);
    await knut.engine.settle();
    expect(knut.mem('n4').text).toContain('Vi kom fram til slutt.');
    expect(knut.notes.length).toBe(1);
  });

  it('uploads photo files first, then the memory that uses them', async () => {
    const { server, knut, anna } = await pair();
    knut.blobs.set('blob1', new Blob(['bilde1'], { type: 'image/jpeg' }));
    knut.editMem('m1', m => ({ ...m, photos: [...m.photos, { id: 'p-new', blobKey: 'blob1', w: 4, h: 3, caption: 'Nytt', taken: null, by: 'knut', featured: false, inBook: true }] }));
    await knut.engine.settle();
    expect(await server.files.get('p-new/original')!.text()).toBe('bilde1');
    expect(await server.files.get('p-new/display.jpg')!.text()).toBe('small:bilde1');
    const k = knut.mem('m1').photos.find(p => p.id === 'p-new')!;
    expect(k).toMatchObject({ blobKey: 'blob1', path: 'p-new/original', displayPath: 'p-new/display.jpg' });
    await anna.engine.settle();
    const a = anna.mem('m1').photos.find(p => p.id === 'p-new')!;
    expect(a.path).toBe('p-new/original');
    expect(a.blobKey).toBeUndefined();
    expect(knut.store.getState().queue).toEqual([]);

    // Deleting the photo removes the files from the server.
    knut.editMem('m1', m => ({ ...m, photos: m.photos.filter(p => p.id !== 'p-new') }));
    await knut.engine.settle();
    expect(server.files.has('p-new/original')).toBe(false);
  });

  it('retries after the server is unreachable', async () => {
    const { server, knut, anna } = await pair();
    server.setOffline(true);
    knut.editMem('m2', m => ({ ...m, title: 'Torget' }));
    await knut.engine.settle().catch(() => {});
    expect(knut.store.getState().sync.phase).toBe('error');
    server.setOffline(false);
    knut.engine.syncNow();
    await knut.engine.settle(); await anna.engine.settle();
    expect(anna.mem('m2').title).toBe('Torget');
  });
});
