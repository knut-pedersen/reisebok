import { zip, type AsyncZippable } from 'fflate';
import type { Dream, Memory, Photo, Place, Trip } from '../data/types';
import { strip } from '../sync/engine';
import { byMemDate, fmtRange, memDate, PEOPLE, photoStamp, stars, typeInfo } from './format';

// Builds the backup ZIP: original photos, a readable reisebok.html and structured data.json.
// Everything is read from this phone or the shared archive; nothing is sent anywhere.

export interface ExportSource {
  trips: Trip[];
  memories: Memory[];
  places: Place[];
  dreams: Dream[];
  upcoming: Dream[];
}

export interface ExportResult {
  blob: Blob;
  name: string;
  photos: number;
  missing: string[];
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif', 'image/avif': 'avif' };
const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]+/g, '_');
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The file the user downloads last; kept here so the page can offer it again. */
export let lastExport: ExportResult | null = null;

export function exportFileName(sel: string, trips: Trip[]) {
  const t = trips.find(x => x.id === sel);
  const day = new Date().toISOString().slice(0, 10);
  return 'reisebok-' + (sel === 'alt' || !t ? 'hele-arkivet' : safe(t.title.toLowerCase())) + '-' + day + '.zip';
}

export async function buildExport(
  src: ExportSource,
  sel: string,
  getPhoto: (p: Photo) => Promise<Blob | null>,
  onProgress: (done: number, total: number) => void,
): Promise<ExportResult> {
  const all = sel === 'alt';
  const trips = all ? src.trips : src.trips.filter(t => t.id === sel);
  const tripIds = new Set(trips.map(t => t.id));
  const memories = src.memories.filter(m => tripIds.has(m.tripId));
  const places = all ? src.places : src.places.filter(p => p.tripIds.some(id => tripIds.has(id)) || trips.some(t => t.dest === p.id));
  const dreams = all ? src.dreams : [];
  const upcoming = all ? src.upcoming : [];

  // Every photo once: memory photos, covers, and dream pictures.
  const photos = new Map<string, Photo>();
  memories.forEach(m => m.photos.forEach(p => photos.set(p.id, p)));
  trips.forEach(t => { if (t.cover && !photos.has(t.cover.id)) photos.set(t.cover.id, t.cover); });
  [...dreams, ...upcoming].forEach(d => { if (d.photo && !photos.has(d.photo.id)) photos.set(d.photo.id, d.photo); });

  const files: AsyncZippable = {};
  const fileOf: Record<string, string> = {};
  const missing: string[] = [];
  let done = 0;
  onProgress(0, photos.size);
  for (const p of photos.values()) {
    let blob: Blob | null = null;
    try { blob = await getPhoto(p); } catch { blob = null; }
    if (blob) {
      const name = 'originaler/' + safe(p.id) + '.' + (EXT[blob.type] || 'jpg');
      files[name] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
      fileOf[p.id] = name;
    } else {
      missing.push((p.caption || 'Bilde uten tekst') + ' (' + p.id + ')');
    }
    onProgress(++done, photos.size);
  }

  const data = {
    app: 'Vår reisebok',
    exportedAt: new Date().toISOString(),
    people: Object.fromEntries(Object.values(PEOPLE).map(p => [p.id, p.name])),
    files: fileOf,
    trips: strip(trips),
    memories: strip(memories),
    places: strip(places),
    dreams: strip(dreams),
    upcoming: strip(upcoming),
  };
  const enc = new TextEncoder();
  files['data.json'] = enc.encode(JSON.stringify(data, null, 2));
  files['reisebok.html'] = enc.encode(readableHtml(trips, memories, places, dreams, upcoming, fileOf));
  if (missing.length) {
    files['MANGLER.txt'] = enc.encode('Disse bildene kunne ikke hentes da eksporten ble laget (for eksempel uten nett, eller illustrasjonsbilder fra internett):\n\n' + missing.join('\n') + '\n');
  }

  const bytes = await new Promise<Uint8Array>((res, rej) => zip(files, { level: 6 }, (err, out) => (err ? rej(err) : res(out))));
  const result: ExportResult = { blob: new Blob([bytes as BlobPart], { type: 'application/zip' }), name: exportFileName(sel, src.trips), photos: photos.size - missing.length, missing };
  lastExport = result;
  return result;
}

export function downloadExport(r: ExportResult) {
  const url = URL.createObjectURL(r.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = r.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' kB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0).replace('.', ',') + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(1).replace('.', ',') + ' GB';
}

function readableHtml(trips: Trip[], memories: Memory[], places: Place[], dreams: Dream[], upcoming: Dream[], fileOf: Record<string, string>) {
  const placeName = (id: string | null) => (id ? places.find(p => p.id === id)?.name ?? '' : '');
  const img = (p: Photo) => {
    const f = fileOf[p.id];
    const cap = [p.caption, photoStamp(p.taken), 'Tatt av ' + PEOPLE[p.by]?.name].filter(Boolean).map(esc).join(' · ');
    return `<figure>${f ? `<img src="${esc(f)}" alt="${esc(p.caption)}" loading="lazy">` : '<div class="missing">Bildet mangler i eksporten</div>'}<figcaption>${cap}</figcaption></figure>`;
  };
  const tripHtml = (t: Trip) => {
    // Story order first, then any memory not in the story, by date.
    const inStory = t.story.filter(b => b.type === 'memory').map(b => (b as { id: string }).id);
    const mems = memories.filter(m => m.tripId === t.id);
    const ordered = [...inStory.map(id => mems.find(m => m.id === id)).filter(Boolean) as Memory[], ...mems.filter(m => !inStory.includes(m.id)).sort(byMemDate)];
    const body = ordered.map(m => {
      const meta = [memDate(m), typeInfo(m.type).label, placeName(m.placeId)].filter(Boolean).map(esc).join(' · ');
      const ratings = m.visit ? (['knut', 'anna'] as const).map(id => {
        const r = m.visit!.ratings[id];
        return `<li><strong>${PEOPLE[id].name}s vurdering:</strong> ${r?.stars != null ? `<span class="stars" aria-label="${r.stars} av 5">${stars(r.stars)}</span>` : '<em>Ikke vurdert</em>'}${r?.text ? ' ' + esc(r.text) : ''}</li>`;
      }).join('') : '';
      const comments = m.comments.map(c => `<li class="note"><strong>${esc(PEOPLE[c.by]?.name ?? c.by)}:</strong> ${esc(c.text)}</li>`).join('');
      return `<section class="mem"><div class="eyebrow">${meta}</div><h3>${esc(m.title)}</h3>${m.text ? `<p>${esc(m.text).replace(/\n/g, '<br>')}</p>` : ''}${m.photos.length ? `<div class="photos">${m.photos.map(img).join('')}</div>` : ''}${ratings || comments ? `<ul class="extra">${ratings}${comments}</ul>` : ''}</section>`;
    }).join('');
    return `<article class="trip">${t.cover && fileOf[t.cover.id] ? `<img class="cover" src="${esc(fileOf[t.cover.id])}" alt="">` : ''}<div class="eyebrow">${esc(fmtRange(t))}</div><h2>${esc(t.title)}</h2><div class="dest">${esc(t.destinations.join(' · '))}</div>${t.intro ? `<p class="intro">${esc(t.intro)}</p>` : ''}${body || '<p class="empty">Ingen minner ennå.</p>'}</article>`;
  };
  const dreamList = (title: string, list: Dream[]) => (list.length ? `<section class="dreams"><h2>${title}</h2><ul>${list.map(d => `<li><strong>${esc(d.title)}</strong>${d.place ? ' · ' + esc(d.place) : ''}${d.note ? ' – ' + esc(d.note) : ''}${d.when ? ' (' + esc(d.when) + ')' : ''}</li>`).join('')}</ul></section>` : '');
  return `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vår reisebok – Knut &amp; Anna</title>
<style>
body{margin:0;background:#F6F0E6;color:#2E352F;font:16px/1.55 Georgia,'Times New Roman',serif}
main{max-width:760px;margin:0 auto;padding:40px 20px 80px}
.sans,.eyebrow,.dest,figcaption,.extra,footer{font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
header h1{font-weight:500;font-size:40px;margin:4px 0 0}
.hand{color:#A9553C;font-style:italic}
.trip{background:#FFFCF6;border:1px solid rgba(46,53,47,.12);border-radius:12px;padding:28px 24px;margin:32px 0}
.cover{width:100%;border-radius:8px;margin-bottom:16px}
h2{font-weight:500;font-size:32px;line-height:1.1;margin:4px 0}
h3{font-weight:500;font-size:24px;margin:4px 0 8px}
.eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#566350;font-weight:600}
.dest{color:#5C6358;font-size:14px}
.intro{font-style:italic;font-size:20px}
.mem{border-top:1px solid rgba(46,53,47,.12);padding:18px 0}
.photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin:10px 0}
figure{margin:0}
figure img{width:100%;border-radius:6px;display:block}
figcaption{font-size:12px;color:#5C6358;margin-top:4px}
.missing{padding:24px 8px;background:#E9E1D4;border-radius:6px;font-size:12px;color:#5C6358;text-align:center}
.extra{list-style:none;padding:0;font-size:14px}
.extra li{margin-top:4px}
.stars{color:#A9553C;letter-spacing:1px}
.dreams ul{padding-left:18px}
footer{font-size:12px;color:#5C6358;margin-top:40px}
@media print{body{background:#fff}.trip{border:0;padding:0;break-before:page}}
</style>
</head>
<body><main>
<header><div class="hand">Knut &amp; Anna</div><h1>Vår reisebok</h1><div class="dest">Eksportert ${esc(new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }))}</div></header>
${trips.map(tripHtml).join('\n')}
${dreamList('Kommende reiser', upcoming)}${dreamList('Vi drømmer om', dreams)}
<footer>Eksportert fra «Vår reisebok». Originalbildene ligger i mappen originaler/, og strukturerte data (datoer, steder, forfattere, vurderinger) i data.json. Siden kan skrives ut eller lagres som PDF fra nettleseren.</footer>
</main></body>
</html>
`;
}
