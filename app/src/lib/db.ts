import { openDB, type IDBPDatabase } from 'idb';
import type { Archive } from '../data/types';

// Everything is stored on this phone in IndexedDB: one document for the archive
// (text, dates, places, ratings, queue) and a separate store for original photo files.
const DB_NAME = 'var-reisebok';
const ARCHIVE_KEY = 'archive';

let dbPromise: Promise<IDBPDatabase> | null = null;
function db() {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore('kv');
      d.createObjectStore('blobs');
    },
  });
  return dbPromise;
}

export async function loadArchive(): Promise<Archive | null> {
  return ((await (await db()).get('kv', ARCHIVE_KEY)) as Archive | undefined) ?? null;
}

/** Resolves only when the write is committed. Throws QuotaExceededError when the phone is full. */
export async function saveArchive(a: Archive): Promise<void> {
  await (await db()).put('kv', a, ARCHIVE_KEY);
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  await (await db()).put('blobs', blob, key);
}

export async function getBlob(key: string): Promise<Blob | null> {
  return ((await (await db()).get('blobs', key)) as Blob | undefined) ?? null;
}

export async function deleteBlob(key: string): Promise<void> {
  await (await db()).delete('blobs', key);
}

export async function resetAll(): Promise<void> {
  const d = await db();
  await d.clear('kv');
  await d.clear('blobs');
}

export function isQuotaError(e: unknown) {
  return e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
}

/** Ask the browser not to evict the archive under storage pressure. */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* not supported */
  }
}

// Small per-device preferences (who is logged in) live in localStorage.
export function readPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem('rb.' + key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
export function writePref(key: string, value: unknown) {
  try {
    localStorage.setItem('rb.' + key, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}

export async function getKv<T>(key: string): Promise<T | null> {
  return ((await (await db()).get('kv', key)) as T | undefined) ?? null;
}
export async function putKv(key: string, value: unknown): Promise<void> {
  await (await db()).put('kv', value, key);
}
export async function deleteKv(key: string): Promise<void> {
  await (await db()).delete('kv', key);
}
