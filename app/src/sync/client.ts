import { createClient, type Session } from '@supabase/supabase-js';
import type { PersonId, Photo } from '../data/types';
import { demoArchive } from '../data/demo';
import { deleteKv, getBlob, getKv, putKv, readPref, writePref } from '../lib/db';
import { hooks, isOnline, onMemorySynced, onMemorySyncProgress, onSyncFailed, toast, useStore, type State } from '../store/store';
import { createSyncEngine, type SyncEngine, type SyncMeta } from './engine';
import { displayCopy } from './images';
import { supabaseBackend } from './supabaseBackend';
import type { Backend } from './types';

// Connects the app to the shared archive in Supabase. Without VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY the app runs on this phone only (development and demo).

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const cloudEnabled = !!(URL_ && KEY);
export const supabase = cloudEnabled ? createClient(URL_!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

let backend: Backend | null = null;
let engine: SyncEngine | null = null;
let engineUser: string | null = null;
const META_KEY = 'syncMeta';

const seedIds = (() => {
  const a = demoArchive();
  const ids = new Set<string>();
  ([['trip', a.trips], ['memory', a.memories], ['place', a.places], ['dream', a.dreams], ['upcoming', a.upcoming]] as const).forEach(([k, l]) => l.forEach(e => ids.add(k + ':' + e.id)));
  return ids;
})();

export async function initCloud() {
  if (!supabase) {
    useStore.setState({ mode: 'local', authState: useStore.getState().loggedIn ? 'signedIn' : 'signedOut' });
    return;
  }
  useStore.setState({ mode: 'cloud', authState: 'checking', loggedIn: false });
  hooks.syncNow = () => engine?.syncNow();
  supabase.auth.onAuthStateChange((_ev, session) => { setTimeout(() => void onSession(session), 0); });
  const { data } = await supabase.auth.getSession();
  await onSession(data.session);
  // Catch up whenever the app comes back to the foreground, and now and then while open.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') engine?.syncNow(); });
  setInterval(() => { if (document.visibilityState === 'visible' && isOnline()) engine?.syncNow(); }, 60_000);
}

async function onSession(session: Session | null) {
  if (!session) {
    stopEngine();
    useStore.setState({ authState: 'signedOut', loggedIn: false });
    return;
  }
  const uid = session.user.id;
  const email = session.user.email || '';
  if (engine && engineUser === uid) return;
  backend = supabaseBackend(supabase!);
  // Who am I? Ask the server; offline, use what we learned last time.
  let person = readPref<PersonId | null>('person:' + uid, null);
  try {
    const members = await backend.members();
    person = members[uid] ?? null;
    if (person) writePref('person:' + uid, person);
  } catch {
    /* offline: keep the cached answer */
  }
  if (!person) {
    useStore.setState({ authState: 'noAccess', loggedIn: false, email });
    return;
  }
  useStore.setState({ authState: 'signedIn', loggedIn: true, user: person, email });
  startEngine(uid, person);
}

function startEngine(uid: string, me: PersonId) {
  stopEngine();
  engineUser = uid;
  engine = createSyncEngine<State>({
    store: useStore,
    backend: backend!,
    me,
    seedIds,
    loadMeta: () => getKv<SyncMeta>(META_KEY),
    saveMeta: m => putKv(META_KEY, m),
    getBlob,
    displayCopy,
    isOnline: () => isOnline(),
    notify: toast,
    onSynced: (kind, id) => { if (kind === 'memory') onMemorySynced(id); },
    onProgress: (kind, id, done, total) => { if (kind === 'memory') onMemorySyncProgress(id, done, total); },
  });
  void engine.start();
}

function stopEngine() {
  engine?.stop();
  engine = null;
  engineUser = null;
}

// Failed runs surface on the «Nytt minne» save card too.
useStore.subscribe((s, prev) => { if (s.sync.phase === 'error' && prev.sync.phase !== 'error') onSyncFailed(); });

/** Sends a one-time code (and a sign-in link) to the address. Only Knut's and Anna's addresses can sign in. */
export async function sendCode(email: string) {
  const { error } = await supabase!.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + import.meta.env.BASE_URL } });
  if (error) throw error;
}

export async function verifyCode(email: string, token: string) {
  const { error } = await supabase!.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

/** Signs out. What is stored on this phone stays, so nothing waiting to be sent is lost. */
export async function signOut() {
  stopEngine();
  await supabase?.auth.signOut();
  useStore.setState({ authState: 'signedOut', loggedIn: false });
}

/** Forgets the sync position so the next sync re-reads the whole shared archive. */
export async function resetSyncState() {
  await deleteKv(META_KEY);
}

// ---------------------------------------------------------------------------
// Photo files: local blob, offline copy, or a short-lived signed URL from storage.
// ---------------------------------------------------------------------------

const signed = new Map<string, { url: string; until: number }>();

export const offlineKey = (photoId: string, kind: 'display' | 'original') => 'cache:' + photoId + ':' + kind;

/** URL for showing a stored photo (display copy if there is one). */
export async function storageUrl(p: Pick<Photo, 'id' | 'path' | 'displayPath'>): Promise<string | null> {
  const cached = (await getBlob(offlineKey(p.id, 'display'))) || (await getBlob(offlineKey(p.id, 'original')));
  if (cached) return URL.createObjectURL(cached);
  const path = p.displayPath || p.path;
  if (!path || !backend) return null;
  const hit = signed.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  if (!isOnline()) return null;
  const url = await backend.signedUrl(path);
  signed.set(path, { url, until: Date.now() + 50 * 60_000 });
  return url;
}

/** The photo file itself, for export and offline download. */
export async function photoBlob(p: Photo, kind: 'original' | 'display' = 'original'): Promise<Blob | null> {
  if (p.blobKey) { const b = await getBlob(p.blobKey); if (b) return b; }
  const cached = (await getBlob(offlineKey(p.id, kind))) || (kind === 'display' ? await getBlob(offlineKey(p.id, 'original')) : null);
  if (cached) return cached;
  const path = kind === 'display' ? p.displayPath || p.path : p.path;
  if (path && backend) return backend.download(path);
  if (p.src) { const r = await fetch(kind === 'display' ? p.src : p.src); if (r.ok) return r.blob(); }
  return null;
}
