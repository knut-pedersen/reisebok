import type { Memory, PersonId, Photo, Trip } from '../data/types';
import { fmtRange, memDate, PEOPLE, stars, typeInfo, plural } from '../lib/format';
import { isOnline, type State } from './store';

// Pure helpers that turn stored data into what the views show. One memory, many views:
// story, days, places, photos and the book all read from the same memory objects.

export const colors = {
  ink: '#2E352F', muted: '#5C6358', faint: '#8A9083', olive: '#66745B', oliveDeep: '#566350',
  terracotta: '#A9553C', amber: '#8A6D3B', paper: '#FFFCF6', cream: '#F6F0E6',
};

export function tripMeta(s: State, t: Trip) {
  const mems = s.memories.filter(m => m.tripId === t.id);
  const written = t.days.filter(d => d.memoryIds.length).length;
  const statusLabel =
    t.status === 'planlagt' ? 'Kommende · ikke gjennomført'
    : t.status === 'ferdig' ? 'Ferdig skrevet'
    : t.days.length ? 'Uferdig · ' + written + ' av ' + t.days.length + ' dager skrevet'
    : 'Uferdig · ' + plural(mems.length, 'minne', 'minner');
  const photos = mems.flatMap(m => m.photos);
  const cover = t.cover || photos[0] || null;
  return {
    ...t,
    dateLabel: fmtRange(t),
    statusLabel,
    unfinished: t.status !== 'ferdig',
    planned: t.status === 'planlagt',
    year: t.start ? t.start.slice(0, 4) : '',
    memCount: mems.length,
    photoCount: photos.length,
    placeCount: s.places.filter(p => p.kind === 'place' && p.tripIds.includes(t.id)).length,
    cover,
    destLabel: t.destinations.join(' · '),
  };
}
export type TripView = ReturnType<typeof tripMeta>;

export function syncInfo(s: State, m: Memory) {
  const q = s.queue.find(i => i.id === m.id);
  const st = q ? q.status : m.local ? 'lokalt' : 'synk';
  const on = isOnline(s);
  const label = {
    lokalt: 'Lagret på denne telefonen',
    venter: on ? 'Venter på opplasting' : 'Venter på nett',
    laster: q ? 'Laster opp ' + q.done + ' av ' + q.photos + ' bilder' : 'Laster opp',
    feil: 'Kunne ikke lagres – prøv igjen',
    synk: 'Synkronisert',
  }[st];
  const color = { lokalt: colors.amber, venter: colors.amber, laster: colors.terracotta, feil: colors.terracotta, synk: colors.oliveDeep }[st];
  return { syncStatus: st, syncLabel: label, syncColor: color, syncDetail: st === 'synk' ? 'Tilgjengelig for begge' : 'Finnes bare på denne telefonen ennå' };
}

export function memCard(s: State, m: Memory) {
  const T = typeInfo(m.type);
  const place = s.places.find(p => p.id === m.placeId);
  return {
    ...m,
    typeLabel: T.label,
    glyph: T.glyph,
    dateLabel: memDate(m),
    placeName: place ? place.name : '',
    hasPlace: !!place,
    isWorking: m.writeStatus === 'arbeid',
    startedByName: m.startedBy ? PEOPLE[m.startedBy].name : '',
    thumb: m.photos[0] || null,
    isUnfinished: m.writeStatus === 'arbeid' || !m.text,
    ...syncInfo(s, m),
  };
}
export type MemCard = ReturnType<typeof memCard>;

export function ratingRows(s: State, m: Memory) {
  return (['knut', 'anna'] as PersonId[]).map(id => {
    const P = PEOPLE[id];
    const r = m.visit?.ratings?.[id] || { stars: null, text: '' };
    return {
      ...P,
      value: r.stars,
      stars: stars(r.stars),
      rated: r.stars != null,
      text: r.text || '',
      isMine: id === s.user,
      starLabel: r.stars != null ? r.stars + ' av 5 stjerner' : 'Ikke vurdert',
    };
  });
}
export type RatingRow = ReturnType<typeof ratingRows>[number];

export function queueStatus(s: State) {
  const q = s.queue;
  const up = q.find(i => i.status === 'laster');
  if (up) return { label: 'Laster opp ' + up.done + ' av ' + up.photos + ' bilder', tone: colors.terracotta };
  if (q.some(i => i.status === 'feil')) return { label: 'Kunne ikke lagres – prøv igjen', tone: colors.terracotta };
  const w = q.filter(i => i.status === 'venter');
  if (w.length) return { label: isOnline(s) ? 'Venter · ' + w.length + ' i kø' : 'Venter på nett · ' + w.length + ' i kø', tone: colors.amber };
  return { label: 'Synkronisert', tone: colors.oliveDeep };
}

/** Destinations and places the map shows, with photo thumbnails. */
export function mapData(s: State, tripId?: string | null) {
  const thumb = (p?: Photo | null) => (p && p.src ? p.src.replace(/\d+\/\d+$/, '96/96') : null);
  return {
    destinations: s.places
      .filter(p => p.kind === 'destination' && (!tripId || p.tripIds.includes(tripId)))
      .map(d => ({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, status: d.status || 'besokt', tripIds: d.tripIds, photoSrc: thumb(d.photo) })),
    places: s.places
      .filter(p => p.kind === 'place' && (!tripId || p.tripIds.includes(tripId)))
      .map(p => ({ id: p.id, name: p.name, type: p.type || 'hverdag', typeLabel: typeInfo(p.type).label, lat: p.lat, lng: p.lng, tripIds: p.tripIds, photoSrc: thumb(p.photo) })),
  };
}
export type MapData = ReturnType<typeof mapData>;

// ---------------------------------------------------------------------------
// Book view: pages are assembled from the story and each memory's photo flags.
// ---------------------------------------------------------------------------

export type LeadItem = { key: string; isNote: boolean; text: string; by?: PersonId };
export type BookPage =
  | { kind: 'cover' }
  | { kind: 'intro' }
  | { kind: 'photo'; photo: Photo; photos: Photo[]; date: string; memTitle: string }
  | { kind: 'memory'; mem: MemCard; date: string; lead: LeadItem[]; small: Photo[]; smallAll: Photo[]; comments: Memory['comments']; ratings: RatingRow[] }
  | { kind: 'places'; places: { id: string; name: string; glyph: string }[] }
  | { kind: 'end' };

export function bookPages(s: State, tripId: string) {
  const o = s.bookOpts;
  const trip = s.trips.find(t => t.id === tripId);
  const pages: BookPage[] = [{ kind: 'cover' }];
  const chapters: { label: string; page: number }[] = [{ label: 'Omslag', page: 0 }];
  if (!trip) return { pages, chapters };
  const memPage: Record<string, number> = {};
  if (trip.intro) { chapters.push({ label: 'Innledning', page: 1 }); pages.push({ kind: 'intro' }); }
  let lead: LeadItem[] = [];
  let lastHead: string | null = null;
  trip.story.forEach(b => {
    if (b.type === 'text') lead.push({ key: 'l' + lead.length, isNote: false, text: b.text });
    else if (b.type === 'note') { if (o.comments) lead.push({ key: 'l' + lead.length, isNote: true, text: b.text, by: b.by }); }
    else {
      const m = s.memories.find(x => x.id === b.id);
      if (!m) return;
      const inb = m.photos.filter(p => p.inBook !== false);
      const feat = inb.filter(p => p.featured), small = inb.filter(p => !p.featured);
      const head = memDate(m);
      if (head !== lastHead) { chapters.push({ label: head + ' · ' + m.title, page: pages.length }); lastHead = head; }
      feat.forEach(p => pages.push({ kind: 'photo', photo: p, photos: inb, date: head, memTitle: m.title }));
      memPage[m.id] = pages.length;
      pages.push({
        kind: 'memory', mem: memCard(s, m), date: head, lead, small: small.slice(0, 4), smallAll: inb,
        comments: o.comments ? m.comments : [],
        ratings: o.ratings && m.visit ? ratingRows(s, m) : [],
      });
      lead = [];
    }
  });
  const pl = s.places.filter(p => p.kind === 'place' && p.tripIds.includes(trip.id));
  if (pl.length) { chapters.push({ label: 'Stedene', page: pages.length }); pages.push({ kind: 'places', places: pl.map(p => ({ id: p.id, name: p.name, glyph: typeInfo(p.type).glyph })) }); }
  pages.push({ kind: 'end' });
  const hl = trip.highlights.filter(id => memPage[id] != null).map(id => ({ label: '★ ' + (s.memories.find(m => m.id === id)?.title ?? ''), page: memPage[id] }));
  return { pages, chapters: [...chapters, ...hl] };
}
