import type { Memory, MemType, PersonId, Trip } from '../data/types';

export const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];

export const PEOPLE: Record<PersonId, { id: PersonId; name: string; initial: string; color: string }> = {
  knut: { id: 'knut', name: 'Knut', initial: 'K', color: '#596650' },
  anna: { id: 'anna', name: 'Anna', initial: 'A', color: '#A9553C' },
};
export type Person = (typeof PEOPLE)[PersonId];
export const otherPerson = (id: PersonId): PersonId => (id === 'knut' ? 'anna' : 'knut');

export const TYPES: Record<MemType, { label: string; glyph: string }> = {
  mat: { label: 'Mat', glyph: 'M' },
  overnatting: { label: 'Overnatting', glyph: 'O' },
  kultur: { label: 'Kultur', glyph: 'K' },
  natur: { label: 'Natur', glyph: 'N' },
  hverdag: { label: 'Hverdagsøyeblikk', glyph: 'H' },
  severdighet: { label: 'Severdighet', glyph: 'S' },
};
export const typeInfo = (t?: MemType) => (t && TYPES[t]) || { label: t || '', glyph: '•' };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function parseIso(iso: string) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

/** «10. juli 2025», «juli 2025» or «2025». */
export function fmtDate(iso: string | null | undefined, precision?: string) {
  if (!iso) return 'Dato ukjent';
  const { y, m, d } = parseIso(iso);
  if (precision === 'ar') return '' + y;
  if (precision === 'maned') return MONTHS[m - 1] + ' ' + y;
  return d + '. ' + MONTHS[m - 1] + ' ' + y;
}

export function fmtShort(iso: string) {
  const { m, d } = parseIso(iso);
  return d + '. ' + MONTHS[m - 1].slice(0, 3);
}

export function weekday(iso: string) {
  const { y, m, d } = parseIso(iso);
  return cap(WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]);
}

export function fmtRange(t: Pick<Trip, 'start' | 'end' | 'precision'>) {
  if (!t.start || t.precision === 'ukjent') return 'Dato ikke lagt inn';
  if (t.precision !== 'dag' || !t.end) return fmtDate(t.start, t.precision);
  const a = parseIso(t.start), b = parseIso(t.end);
  if (a.m === b.m && a.y === b.y) return a.d + '.–' + b.d + '. ' + MONTHS[a.m - 1] + ' ' + a.y;
  return fmtDate(t.start) + ' – ' + fmtDate(t.end);
}

/** «24. okt. kl. 21:14» */
export function fmtTime(iso: string | null | undefined) {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.getDate() + '. ' + MONTHS[d.getMonth()].slice(0, 3) + '. kl. ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/** «10. juli 2025 kl. 21:40» or «Dato ukjent». */
export function photoStamp(taken: string | null) {
  return taken ? fmtDate(taken) + ' kl. ' + taken.slice(11, 16) : 'Dato ukjent';
}

export function stars(n: number | null | undefined) {
  return n == null ? '' : '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
}

/** Partially known dates read «Juli 2025 – dag ikke angitt». */
export function memDate(m: Pick<Memory, 'date' | 'precision'>) {
  if (!m.date) return 'Dato ikke angitt';
  if (m.precision === 'maned' || m.date.length === 7) {
    const [y, mo] = m.date.split('-').map(Number);
    return cap(MONTHS[mo - 1]) + ' ' + y + ' – dag ikke angitt';
  }
  return fmtDate(m.date);
}

export function memSortKey(m: Pick<Memory, 'date'>) {
  if (!m.date) return '9999';
  return m.date.length === 7 ? m.date + '-99' : m.date;
}

export const byMemDate = (a: Pick<Memory, 'date'>, b: Pick<Memory, 'date'>) => (memSortKey(a) < memSortKey(b) ? -1 : memSortKey(a) > memSortKey(b) ? 1 : 0);

export const plural = (n: number, one: string, many: string) => n + ' ' + (n === 1 ? one : many);

export const uid = (prefix: string) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
