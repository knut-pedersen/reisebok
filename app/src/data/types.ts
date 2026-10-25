export type PersonId = 'knut' | 'anna';

export type MemType = 'mat' | 'overnatting' | 'kultur' | 'natur' | 'hverdag' | 'severdighet';

export interface Photo {
  id: string;
  /** Remote URL (demo photos). Local photos use `blobKey` instead. */
  src?: string;
  /** Key in the IndexedDB blob store for photos picked on this phone. */
  blobKey?: string;
  /** Original file in cloud storage, once uploaded. */
  path?: string;
  /** Smaller copy for fast display, once uploaded. */
  displayPath?: string;
  w: number;
  h: number;
  caption: string;
  taken: string | null;
  by: PersonId;
  featured: boolean;
  inBook: boolean;
}

export type DestStatus = 'besokt' | 'planlagt' | 'drom';

export interface Place {
  id: string;
  kind: 'destination' | 'place';
  name: string;
  country?: string;
  /** For places: the destination they belong to. */
  dest?: string;
  type?: MemType;
  lat: number;
  lng: number;
  status?: DestStatus;
  tripIds: string[];
  photo?: Photo | null;
}

export interface Rating {
  stars: number | null;
  text: string;
}

export interface Comment {
  by: PersonId;
  text: string;
}

export type WriteStatus = 'arbeid' | 'ferdig';

export interface Memory {
  id: string;
  tripId: string;
  /** 'YYYY-MM-DD', or 'YYYY-MM' when only the month is known. */
  date: string | null;
  precision: 'dag' | 'maned';
  title: string;
  type: MemType;
  placeId: string | null;
  photos: Photo[];
  text: string;
  comments: Comment[];
  writeStatus: WriteStatus;
  startedBy?: PersonId;
  createdBy?: PersonId;
  editedBy?: PersonId;
  visit?: { ratings: Partial<Record<PersonId, Rating>> };
  /** Added on this phone and not yet confirmed by the other phone. */
  local?: boolean;
  imported?: boolean;
  /** Imported photos that should only appear under «Bilder». */
  galleryOnly?: boolean;
  conflict?: Conflict | null;
}

export type StoryBlock =
  | { type: 'text'; text: string }
  | { type: 'note'; by: PersonId; text: string }
  | { type: 'memory'; id: string };

export interface Day {
  date: string;
  title: string;
  memoryIds: string[];
}

export type TripPrecision = 'dag' | 'maned' | 'ar' | 'ukjent';

/** Both of you changed the same shared text. Kept on this phone only, until one version is chosen. */
export interface Conflict {
  field: 'intro' | 'text';
  by: PersonId;
  at: string;
  mine: string;
  theirs: string;
}

export interface Trip {
  id: string;
  title: string;
  destinations: string[];
  dest: string | null;
  start: string | null;
  end: string | null;
  precision: TripPrecision;
  status: 'ferdig' | 'uferdig' | 'planlagt';
  cover: Photo | null;
  intro: string;
  story: StoryBlock[];
  highlights: string[];
  days: Day[];
  conflict?: Conflict | null;
  fromDream?: boolean;
}

export interface Dream {
  id: string;
  title: string;
  place: string;
  note: string;
  when: string | null;
  photo: Photo | null;
  dest?: string;
}

export type QueueStatus = 'venter' | 'laster' | 'feil' | 'synk';

export interface QueueItem {
  id: string;
  kind: 'Minne';
  title: string;
  photos: number;
  done: number;
  status: QueueStatus;
  failed?: boolean;
}

export type OfflineScope = 'visning' | 'alle' | 'tekst';

export interface OfflineDl {
  status: 'laster' | 'pause' | 'klar';
  pct: number;
  scope: OfflineScope;
  /** Photos to download, and how many could not be fetched. */
  total?: number;
  failed?: number;
}

/** Everything that is stored on this phone. */
export interface Archive {
  version: number;
  trips: Trip[];
  places: Place[];
  memories: Memory[];
  dreams: Dream[];
  upcoming: Dream[];
  queue: QueueItem[];
  lastSync: string;
  offlineDl: Record<string, OfflineDl>;
}

/** A photo in the import flow, before it becomes part of a memory. */
export interface ImportItem {
  id: string;
  name: string;
  src?: string;
  blobKey?: string;
  w: number;
  h: number;
  taken: string | null;
  pos: { lat: number; lng: number } | null;
  place: string | null;
  conf: 'sikker' | 'usikker' | 'bekreftet' | 'manuell' | null;
  dupOf?: string | null;
  keptDup?: boolean;
  fixedDate?: boolean;
  status: 'venter' | 'laster' | 'ok' | 'feil' | 'nett';
  failedOnce?: boolean;
  caption: string;
  local?: boolean;
  featured: boolean;
  inBook: boolean;
}
