// Illustrerende demoinnhold for «Vår reisebok». Alle detaljer (middager, hoteller, datoer, sitater,
// vurderinger) er oppdiktet for å vise designet. Bildene er nøytrale illustrasjonsfoto (picsum.photos), ikke private bilder.
import type { Archive, Dream, ImportItem, Memory, Photo, Place, PersonId, QueueItem, Rating, Trip } from './types';

const P = (id: number, w: number, h: number, caption: string, taken: string | null, by: PersonId, flags?: Partial<Photo>): Photo => ({ id: 'f' + id + '_' + w, src: `https://picsum.photos/id/${id}/${w}/${h}`, w, h, caption, taken: taken || null, by: by || 'knut', featured: false, inBook: true, ...(flags || {}) });
const F = { featured: true }, X = { inBook: false };

export const photos: Record<string, Photo> = {
  c1: P(16, 1600, 1000, 'Kysten sett fra Croisette, første kveld', '2025-07-10T21:40', 'knut', F),
  c2: P(12, 900, 1200, 'Steiner og salt ved Plage du Midi', '2025-07-11T10:15', 'anna'),
  c3: P(13, 1200, 800, 'Lys over bukta', '2025-07-11T19:30', 'knut'),
  c4: P(1080, 900, 900, 'Jordbær fra Marché Forville', '2025-07-12T09:05', 'anna'),
  c5: P(1060, 1200, 800, 'Bordet ved havnen', '2025-07-13T20:10', 'knut', F),
  c6: P(1015, 1600, 900, 'Over til Sainte-Marguerite', '2025-07-14T11:20', 'anna', F),
  c7: P(1018, 900, 1200, 'Stien langs sørsiden av øya', '2025-07-14T13:05', 'knut'),
  c8: P(1040, 1200, 800, 'Le Suquet i siste sol', '2025-07-15T20:50', 'anna', F),
  c9: P(1043, 900, 900, 'Regn mot vinduet', '2025-07-16T15:40', 'knut', X),
  c10: P(1036, 1600, 900, 'Siste morgen', '2025-07-17T07:30', 'anna'),
  c11: P(1047, 1200, 800, 'Rommet med utsikt (demo-hotell)', '2025-07-10T18:00', 'knut', X),
  d1: P(1039, 1600, 1000, 'Tilbake på samme strand', '2026-07-04T19:10', 'anna', F),
  d2: P(1050, 900, 1200, 'Trappene i Le Suquet', '2026-07-04T20:30', 'knut'),
  d3: P(1051, 1200, 800, 'Frokost på pensjonatet (demo)', '2026-07-05T08:40', 'anna'),
  d4: P(1052, 900, 900, 'Samme bistro, nytt bord', '2026-07-06T20:20', 'knut'),
  d5: P(1053, 1200, 800, 'Murene i Antibes', '2026-07-08T11:00', 'anna'),
  d6: P(1055, 900, 1200, 'Smug i Antibes', '2026-07-08T12:30', 'knut'),
  d7: P(1057, 1200, 800, 'Fra bussen tilbake', '2026-07-08T17:15', 'anna'),
  d8: P(1074, 1600, 1000, 'Havnen fra kirkeplassen', '2026-07-10T20:40', 'anna', F),
  d9: P(1076, 900, 1200, 'Lanternene i Rue Saint-Antoine', '2026-07-10T21:30', 'knut'),
  d10: P(1077, 1200, 800, 'Siste glass', '2026-07-10T22:05', 'anna'),
  j1: P(1016, 1600, 1000, 'Fjell i morgentåke (illustrasjon)', null, 'knut'),
  l1: P(1059, 1200, 800, 'Tak og trikkeskinner (illustrasjon)', null, 'anna'),
  f1: P(1061, 1200, 800, 'Gressdekte klipper (illustrasjon)', null, 'knut'),
  p1: P(1062, 1200, 800, 'Vind og is (illustrasjon)', null, 'anna'),
};
const ph = photos;

export const places: Place[] = [
  { id: 'cannes', kind: 'destination', name: 'Cannes', country: 'Frankrike', lat: 43.5528, lng: 7.0174, status: 'besokt', tripIds: ['cannes-2025', 'cannes-2026'], photo: ph.c1 },
  { id: 'japan', kind: 'destination', name: 'Japan', country: '', lat: 36.2, lng: 138.25, status: 'planlagt', tripIds: ['japan'], photo: ph.j1 },
  { id: 'lisboa', kind: 'destination', name: 'Lisboa', country: 'Portugal', lat: 38.72, lng: -9.14, status: 'drom', tripIds: [], photo: ph.l1 },
  { id: 'faroyene', kind: 'destination', name: 'Færøyene', country: '', lat: 62.0, lng: -6.8, status: 'drom', tripIds: [], photo: ph.f1 },
  { id: 'patagonia', kind: 'destination', name: 'Patagonia', country: 'Argentina / Chile', lat: -50.3, lng: -72.3, status: 'drom', tripIds: [], photo: ph.p1 },
  { id: 'croisette', kind: 'place', dest: 'cannes', name: 'La Croisette', type: 'severdighet', lat: 43.5503, lng: 7.0262, tripIds: ['cannes-2025', 'cannes-2026'], photo: ph.c1 },
  { id: 'suquet', kind: 'place', dest: 'cannes', name: 'Le Suquet', type: 'kultur', lat: 43.5513, lng: 7.0113, tripIds: ['cannes-2025', 'cannes-2026'], photo: ph.c8 },
  { id: 'forville', kind: 'place', dest: 'cannes', name: 'Marché Forville', type: 'mat', lat: 43.5527, lng: 7.0122, tripIds: ['cannes-2025'], photo: ph.c4 },
  { id: 'lerins', kind: 'place', dest: 'cannes', name: 'Île Sainte-Marguerite', type: 'natur', lat: 43.5205, lng: 7.047, tripIds: ['cannes-2025'], photo: ph.c6 },
  { id: 'midi', kind: 'place', dest: 'cannes', name: 'Plage du Midi', type: 'natur', lat: 43.5468, lng: 7.006, tripIds: ['cannes-2025', 'cannes-2026'], photo: ph.c2 },
  { id: 'bistro', kind: 'place', dest: 'cannes', name: 'Bistro ved havnen (demo)', type: 'mat', lat: 43.5516, lng: 7.0152, tripIds: ['cannes-2025', 'cannes-2026'], photo: ph.c5 },
  { id: 'hotel25', kind: 'place', dest: 'cannes', name: 'Hotell ved Croisette (demo)', type: 'overnatting', lat: 43.5496, lng: 7.0305, tripIds: ['cannes-2025'], photo: ph.c11 },
  { id: 'hotel26', kind: 'place', dest: 'cannes', name: 'Pensjonat i Le Suquet (demo)', type: 'overnatting', lat: 43.552, lng: 7.0098, tripIds: ['cannes-2026'], photo: ph.d3 },
  { id: 'antibes', kind: 'place', dest: 'cannes', name: 'Antibes', type: 'kultur', lat: 43.5804, lng: 7.1251, tripIds: ['cannes-2026'], photo: ph.d5 },
];

const R = (stars: number | null, text: string): Rating => ({ stars, text });

type MemorySeed = Omit<Memory, 'writeStatus' | 'precision'> & Partial<Pick<Memory, 'writeStatus' | 'precision'>>;
export const memories: Memory[] = ([
  { id: 'm1', tripId: 'cannes-2025', date: '2025-07-10', title: 'Første kveld på Croisette', type: 'hverdag', placeId: 'croisette', photos: [ph.c1],
    text: 'Vi hadde ikke planlagt å møtes. Knut satt på muren med en kald kaffe, Anna lette etter et sted å se solnedgangen uten folk. Det ble det samme stedet. Vi snakket til lysene langs promenaden ble tent, og litt til.',
    comments: [{ by: 'knut', text: 'Jeg husker at jeg ikke turte spørre om nummeret før hun var på vei.' }, { by: 'anna', text: 'Han frågade. Två gånger. Jag låtsades inte höra första gången.' }] },
  { id: 'm5', tripId: 'cannes-2025', date: '2025-07-10', title: 'Hotellet ved Croisette', type: 'overnatting', placeId: 'hotel25', photos: [ph.c11],
    text: 'Lite rom, stor balkong. Frokosten var enkel, men kaffen var god nok til å gjenta.',
    comments: [], visit: { ratings: { knut: R(3, 'Tynne vegger, men beliggenheten tilga alt.'), anna: R(4, 'Balkongen var värd hela priset.') } } },
  { id: 'm8', tripId: 'cannes-2025', date: '2025-07-11', title: 'Strand hele dagen', type: 'natur', placeId: 'midi', photos: [ph.c2, ph.c3],
    text: 'Vi gjorde ingenting, grundig. Plage du Midi er mindre polert enn strendene øst for havnen, og det var hele poenget.',
    comments: [{ by: 'anna', text: 'Knut somnade med boken över ansiktet. Bevis finns.' }] },
  { id: 'm2', tripId: 'cannes-2025', date: '2025-07-12', title: 'Markedet i Forville', type: 'mat', placeId: 'forville', photos: [ph.c4],
    text: 'Jordbær, oliven, sokka fra boden i hjørnet. Vi kjøpte altfor mye og spiste det på trappen utenfor.',
    comments: [{ by: 'knut', text: 'Sokka-oppskriften står fortsatt på en serviett i lommeboken.' }],
    visit: { ratings: { knut: R(5, 'Beste frokosten på hele turen.'), anna: R(4, 'Trångt, men det hör till.') } } },
  { id: 'm3', tripId: 'cannes-2025', date: '2025-07-13', title: 'Middag ved havnen', type: 'mat', placeId: 'bistro', photos: [ph.c5],
    text: 'Et bord helt ytterst mot båtene. Grillet fisk, en flaske rosé vi ikke husker navnet på, og en servitør som insisterte på dessert.',
    comments: [{ by: 'knut', text: 'Første gang vi sa «neste år». Som om det var selvsagt.' }, { by: 'anna', text: 'Fisken var okej. Sällskapet var bättre.' }],
    visit: { ratings: { knut: R(4, 'Litt dyrt, veldig riktig.'), anna: R(5, 'Jag minns inte maten. Jag minns kvällen.') } } },
  { id: 'm4', tripId: 'cannes-2025', date: '2025-07-14', title: 'Båt til Sainte-Marguerite', type: 'natur', placeId: 'lerins', photos: [ph.c6, ph.c7],
    text: 'Femten minutter med båt og plutselig stille. Vi gikk hele øya rundt, badet fra steinene på sørsiden og delte en lunsj som var tenkt for én.',
    comments: [] },
  { id: 'm6', tripId: 'cannes-2025', date: '2025-07-15', title: 'Le Suquet i solnedgang', type: 'kultur', placeId: 'suquet', photos: [ph.c8],
    text: 'Opp trappene i gamlebyen rett før solen gikk ned. Utsikten over havnen fra kirkeplassen er den samme på alle postkort, og den fortjener det.',
    comments: [{ by: 'anna', text: 'Här bestämde vi oss för att komma tillbaka.' }] },
  { id: 'm9', tripId: 'cannes-2025', date: '2025-07-16', title: 'Regn', type: 'hverdag', placeId: null, photos: [ph.c9],
    text: 'Den eneste regndagen. Vi ble på rommet, spilte kort og lærte hverandres familienavn.',
    comments: [] },
  { id: 'm7', tripId: 'cannes-2025', date: '2025-07-17', title: 'Siste morgen', type: 'hverdag', placeId: 'midi', photos: [ph.c10],
    text: 'Opp før syv for et siste bad. Tog til flyplassen klokken ti. Vi hadde allerede begynt å planlegge.',
    comments: [{ by: 'knut', text: 'Anna glemte solbrillene på stranden. Med vilje, påstår hun.' }] },
  { id: 'n1', tripId: 'cannes-2026', date: '2026-07-04', title: 'Tilbake', type: 'hverdag', placeId: 'croisette', photos: [ph.d1, ph.d2],
    text: 'Ett år senere, samme mur. Vi tok det samme bildet, med vilje denne gangen.',
    comments: [{ by: 'anna', text: 'Samma mur, samma kaffe. Ny ring.' }] },
  { id: 'n2', tripId: 'cannes-2026', date: '2026-07-04', title: 'Pensjonatet i Le Suquet', type: 'overnatting', placeId: 'hotel26', photos: [ph.d3],
    text: 'Fire rom, en vertinne og en katt. Frokost i hagen.',
    comments: [], visit: { ratings: { knut: R(4, 'Rolig, personlig, bratte trapper.'), anna: R(4, 'Katten heter Marcel. Det räcker.') } } },
  { id: 'n3', tripId: 'cannes-2026', date: '2026-07-06', title: 'Samme bistro, nytt bord', type: 'mat', placeId: 'bistro', photos: [ph.d4],
    text: 'Vi fikk ikke bordet ytterst, men servitøren kjente oss igjen. Eller lot som.',
    comments: [{ by: 'knut', text: 'Bestilte det samme. Det var like godt.' }],
    visit: { ratings: { knut: R(5, 'Ble bedre av å komme tilbake.'), anna: R(null, 'Skriver senare – vill tänka lite.') } } },
  { id: 'n4', tripId: 'cannes-2026', date: '2026-07-08', title: 'Dagstur til Antibes', type: 'kultur', placeId: 'antibes', photos: [ph.d5, ph.d6, ph.d7],
    text: 'Bussen langs kysten tok førti minutter. Vi gikk rett opp til murene, og …', comments: [{ by: 'knut', text: 'Jeg har begynt. Anna, skriv om markedet – du husker navnene.' }], writeStatus: 'arbeid', startedBy: 'knut' },
  { id: 'n5', tripId: 'cannes-2026', date: '2026-07-10', title: 'Siste kveld i Le Suquet', type: 'kultur', placeId: 'suquet', photos: [ph.d8, ph.d9, ph.d10],
    text: 'Samme trapper, samme kirkeplass, samme sol som gikk ned bak Esterel. Denne gangen sa vi det høyt.',
    comments: [{ by: 'knut', text: 'Skrevet ferdig på flyplassen. Bildene sendes når vi er hjemme på wifi.' }], writeStatus: 'ferdig', createdBy: 'knut' },
  { id: 'm10', tripId: 'cannes-2025', date: '2025-07', precision: 'maned', title: 'Sangen fra baren', type: 'hverdag', placeId: null, photos: [],
    text: 'En kveld – vi husker ikke hvilken – spilte baren ved siden av hotellet den samme sangen tre ganger. Vi vet fortsatt ikke hva den heter.',
    comments: [{ by: 'anna', text: 'Jag har nynnat den för Shazam fyrtio gånger.' }] },
] as MemorySeed[]).map(m => ({ writeStatus: 'ferdig', precision: 'dag', ...m }));

export const queue: QueueItem[] = [];

export const trips: Trip[] = [
  { id: 'cannes-2025', title: 'Der det begynte', destinations: ['Cannes'], dest: 'cannes', start: '2025-07-10', end: '2025-07-17', precision: 'dag', status: 'ferdig', cover: ph.c1,
    intro: 'Én uke i juli. Vi reiste dit hver for oss og dro hjem med en plan om å komme tilbake sammen.',
    story: [
      { type: 'text', text: 'Det er vanskelig å skrive om Cannes uten å skrive om muren. Den lave steinmuren langs Croisette der Knut satt den første kvelden, og der Anna satte seg fordi det var den eneste ledige plassen med utsikt.' },
      { type: 'memory', id: 'm1' },
      { type: 'memory', id: 'm8' },
      { type: 'note', by: 'anna', text: 'Han sov med boken över ansiktet. Jag tog bild.' },
      { type: 'memory', id: 'm2' },
      { type: 'memory', id: 'm3' },
      { type: 'memory', id: 'm10' },
      { type: 'memory', id: 'm4' },
      { type: 'text', text: 'Den siste kvelden gikk vi opp i Le Suquet rett før solnedgang.' },
      { type: 'memory', id: 'm6' },
      { type: 'memory', id: 'm7' },
      { type: 'note', by: 'knut', text: 'Vi dro hjem hver for oss. Det føltes allerede feil.' },
    ],
    highlights: ['m1', 'm3', 'm6'],
    days: [
      { date: '2025-07-10', title: 'Ankomst', memoryIds: ['m1', 'm5'] },
      { date: '2025-07-11', title: 'Strand', memoryIds: ['m8'] },
      { date: '2025-07-12', title: 'Markedsdag', memoryIds: ['m2'] },
      { date: '2025-07-13', title: 'Havnen', memoryIds: ['m3'] },
      { date: '2025-07-14', title: 'Øya', memoryIds: ['m4'] },
      { date: '2025-07-15', title: 'Le Suquet', memoryIds: ['m6'] },
      { date: '2025-07-16', title: 'Regn', memoryIds: ['m9'] },
      { date: '2025-07-17', title: 'Hjem', memoryIds: ['m7'] },
    ] },
  { id: 'cannes-2026', title: 'Cannes igjen', destinations: ['Cannes', 'Antibes'], dest: 'cannes', start: '2026-07-04', end: '2026-07-11', precision: 'dag', status: 'uferdig', cover: ph.d1,
    intro: 'Tilbake til den samme muren, ett år senere. Denne gangen sammen fra første dag.',
    story: [
      { type: 'text', text: 'Vi landet sent og gikk rett til Croisette med koffertene.' },
      { type: 'memory', id: 'n1' },
      { type: 'memory', id: 'n2' },
      { type: 'memory', id: 'n3' },
      { type: 'memory', id: 'n4' },
      { type: 'memory', id: 'n5' },
    ],
    highlights: ['n1', 'n3', 'n5'],
    days: [
      { date: '2026-07-04', title: 'Tilbake', memoryIds: ['n1', 'n2'] },
      { date: '2026-07-05', title: '', memoryIds: [] },
      { date: '2026-07-06', title: 'Bistroen', memoryIds: ['n3'] },
      { date: '2026-07-07', title: '', memoryIds: [] },
      { date: '2026-07-08', title: 'Antibes', memoryIds: ['n4'] },
      { date: '2026-07-09', title: '', memoryIds: [] },
      { date: '2026-07-10', title: 'Siste kveld', memoryIds: ['n5'] },
      { date: '2026-07-11', title: '', memoryIds: [] },
    ] },
];

export const upcoming: Dream[] = [
  { id: 'japan', title: 'Japan', place: 'Japan', when: null, note: 'Vi vil se løvet skifte i Kyoto og spise oss gjennom Osaka. Dato ikke lagt inn.', photo: ph.j1, dest: 'japan' },
];
export const dreams: Dream[] = [
  { id: 'lisboa', title: 'Lisboa', place: 'Portugal', note: 'Trikk 28, flislagte fasader og pastéis til frokost.', when: 'Kanskje en langhelg', photo: ph.l1, dest: 'lisboa' },
  { id: 'faroyene', title: 'Færøyene', place: 'Nord-Atlanteren', note: 'Vær, sau og ingen planer.', when: '', photo: ph.f1, dest: 'faroyene' },
  { id: 'patagonia', title: 'Patagonia', place: 'Argentina / Chile', note: 'Den store. Tre uker, minst.', when: 'Når vi tør', photo: ph.p1, dest: 'patagonia' },
];

// Demo-bilder for importflyten: viser dato som mangler, posisjon som mangler, usikkert sted, duplikater.
const I = (n: number, id: number, taken: string | null, pos: ImportItem['pos'], extra: Partial<ImportItem>): ImportItem => ({ id: 'imp' + n, name: `IMG_20260708_${1000 + n * 37}.jpg`, src: `https://picsum.photos/id/${id}/400/400`, w: 1, h: 1, taken, pos, place: null, conf: null, status: 'venter', caption: '', featured: false, inBook: true, ...extra });
export const importDemo: ImportItem[] = [
  I(1, 1063, '2026-07-08T10:42', { lat: 43.5804, lng: 7.1251 }, { place: 'antibes', conf: 'sikker' }),
  I(2, 1064, '2026-07-08T10:47', { lat: 43.5806, lng: 7.1249 }, { place: 'antibes', conf: 'sikker' }),
  I(3, 1065, '2026-07-08T11:30', { lat: 43.581, lng: 7.126 }, { place: 'antibes', conf: 'sikker' }),
  I(4, 1066, '2026-07-08T12:15', null, { place: null, conf: null }),
  I(5, 1067, '2026-07-08T12:31', null, { place: null, conf: null }),
  I(6, 1065, '2026-07-08T11:30', { lat: 43.581, lng: 7.126 }, { place: 'antibes', conf: 'sikker', dupOf: 'imp3' }),
  I(7, 1068, null, { lat: 43.5513, lng: 7.0113 }, { place: 'suquet', conf: 'usikker' }),
  I(8, 1069, null, null, { place: null, conf: null }),
  I(9, 1070, '2026-07-09T09:05', { lat: 43.552, lng: 7.0098 }, { place: 'hotel26', conf: 'sikker' }),
  I(10, 1071, '2026-07-09T09:06', { lat: 43.552, lng: 7.0098 }, { place: 'hotel26', conf: 'sikker' }),
  I(11, 1072, '2026-07-09T19:40', { lat: 43.5516, lng: 7.0152 }, { place: 'bistro', conf: 'usikker' }),
  I(12, 1073, '2026-07-09T19:41', { lat: 43.5516, lng: 7.0152 }, { place: 'bistro', conf: 'usikker' }),
];

export function demoArchive(): Archive {
  // Deep copy so the seed is never mutated.
  return JSON.parse(JSON.stringify({ version: 1, trips, places, memories, dreams, upcoming, queue, lastSync: '2026-10-24T21:14', offlineDl: {} }));
}
