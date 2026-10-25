import type { Conflict, PersonId } from '../data/types';
import type { EntityKind } from './types';

// Three-way merge of one entity: `base` is what both phones last agreed on (undefined if never synced),
// `local` is this phone's version, `remote` is the server's. Changes made on only one side are kept;
// lists (comments, photos, story, days, place lists) are merged item by item; when both of you
// changed the same shared text, the other person's version is kept and yours is set aside as a
// conflict to compare, so neither is lost.

type J = unknown;
type Obj = Record<string, J>;

const isObj = (v: J): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
export const same = (a: J, b: J) => JSON.stringify(a) === JSON.stringify(b);

/** Shared text fields that become a conflict instead of silently overwriting. */
const TEXT_FIELDS: Partial<Record<EntityKind, { field: 'intro' | 'text' }>> = { trip: { field: 'intro' }, memory: { field: 'text' } };

function itemKey(listKey: string, v: J): string {
  if (isObj(v)) {
    if (listKey === 'days') return String(v.date);
    if (listKey === 'comments') return String(v.by) + '\u0000' + String(v.text);
    if (listKey === 'story') return v.type === 'memory' ? 'm:' + String(v.id) : String(v.type) + ':' + String(v.text);
    if ('id' in v) return String(v.id);
  }
  return JSON.stringify(v);
}

function mergeList(key: string, base: J[] | undefined, local: J[], remote: J[]): J[] {
  const k = (v: J) => itemKey(key, v);
  const b = new Map((base || []).map(v => [k(v), v]));
  const l = new Map(local.map(v => [k(v), v]));
  const r = new Map(remote.map(v => [k(v), v]));
  const out: J[] = [];
  // Remote order wins; drop what this phone removed since base.
  for (const [id, rv] of r) {
    if (!l.has(id) && b.has(id)) { if (same(b.get(id), rv)) continue; } // removed here, untouched there
    out.push(l.has(id) ? mergeValue(key, b.get(id), l.get(id), rv) : rv);
  }
  // Add what this phone added; skip what the other phone removed.
  local.forEach((lv, i) => {
    const id = k(lv);
    if (r.has(id) || b.has(id)) return;
    // Keep it near its neighbour in the local order.
    const prev = i > 0 ? k(local[i - 1]) : null;
    const at = prev ? out.findIndex(v => k(v) === prev) : -1;
    if (at >= 0) out.splice(at + 1, 0, lv); else out.push(lv);
  });
  return out;
}

function mergeValue(key: string, base: J, local: J, remote: J): J {
  if (same(local, remote)) return local;
  if (base !== undefined && same(base, local)) return remote;
  if (base !== undefined && same(base, remote)) return local;
  if (isObj(local) && isObj(remote)) return mergeObj(isObj(base) ? base : undefined, local, remote);
  if (Array.isArray(local) && Array.isArray(remote)) return mergeList(key, Array.isArray(base) ? base : undefined, local, remote);
  // Both changed a single value: the most recent write (this phone's) wins.
  return local;
}

function mergeObj(base: Obj | undefined, local: Obj, remote: Obj): Obj {
  const out: Obj = {};
  for (const key of new Set([...Object.keys(remote), ...Object.keys(local)])) {
    const inL = key in local, inR = key in remote, inB = !!base && key in base;
    if (inL && inR) out[key] = mergeValue(key, base?.[key], local[key], remote[key]);
    else if (inL) { if (!inB || !same(base![key], local[key])) out[key] = local[key]; }      // added here, or removed there but changed here
    else if (inR) { if (!inB || !same(base![key], remote[key])) out[key] = remote[key]; }
  }
  return out;
}

/**
 * Merges an entity. Returns the merged data and, when both of you rewrote the shared text,
 * a conflict holding both versions (this phone's as «mine»).
 */
export function mergeEntity(kind: EntityKind, base: J, local: J, remote: J, remoteBy: PersonId, at: string): { data: Obj; conflict: Conflict | null } {
  const L = local as Obj, R = remote as Obj, B = isObj(base) ? base : undefined;
  const merged = mergeObj(B, L, R);
  const tf = TEXT_FIELDS[kind];
  let conflict: Conflict | null = null;
  if (tf) {
    const f = tf.field;
    const bv = B?.[f], lv = L[f], rv = R[f];
    const bothChanged = !same(lv, rv) && (B === undefined ? !!lv && !!rv : !same(bv, lv) && !same(bv, rv));
    if (bothChanged) {
      merged[f] = rv;
      conflict = { field: f, by: remoteBy, at, mine: String(lv ?? ''), theirs: String(rv ?? '') };
    }
  }
  return { data: merged, conflict };
}
