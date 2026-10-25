import type { PersonId } from '../data/types';

export type EntityKind = 'trip' | 'memory' | 'place' | 'dream' | 'upcoming';

/** One stored entity as the server keeps it. `id` is '<kind>:<entity id>'. */
export interface Row {
  id: string;
  kind: EntityKind;
  data: unknown;
  deleted: boolean;
  version: number;
  seq: number;
  updated_by: string | null;
}

export interface PushResult { ok: boolean; row: Row }

/** What the sync engine needs from a server. Supabase in the app, an in-memory fake in tests. */
export interface Backend {
  /** Rows changed after `sinceSeq`, oldest first. */
  pull(sinceSeq: number): Promise<Row[]>;
  /** Writes if the server is still at `baseVersion` (null = never seen); otherwise returns the current row. */
  push(id: string, kind: EntityKind, data: unknown, baseVersion: number | null, deleted: boolean): Promise<PushResult>;
  /** Server user id → person. */
  members(): Promise<Record<string, PersonId>>;
  upload(path: string, blob: Blob): Promise<void>;
  download(path: string): Promise<Blob>;
  remove(paths: string[]): Promise<void>;
  signedUrl(path: string): Promise<string>;
  /** Calls `onChange` when the other phone writes something. Returns an unsubscribe function. */
  subscribe(onChange: () => void): () => void;
}
