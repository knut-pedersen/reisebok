import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView from '../components/MapView';
import { Img, PhotoButton } from '../components/Photo';
import { Avatar, Eyebrow, Pin } from '../components/bits';
import type { Place } from '../data/types';
import { memDate, typeInfo } from '../lib/format';
import { paths } from '../lib/nav';
import { mapData, memCard, ratingRows, tripMeta, type TripView } from '../store/derive';
import { isOnline, startMemory, useStore, type State } from '../store/store';

const focusDest = (d: Place) => {
  useStore.setState({
    mapSel: { kind: d.kind === 'place' ? 'place' : 'destination', id: d.id },
    sheet: 'open', mapList: false, mapQuery: '',
    mapFocus: { id: d.id, lat: d.lat, lng: d.lng, zoom: d.kind === 'place' ? 14 : 6, n: Date.now() },
  });
};
const clearMapSel = () => useStore.setState({ mapSel: null, sheet: 'peek' });

const rowSep = '1px solid rgba(46,53,47,.1)';

export default function MapPage({ visible }: { visible: boolean }) {
  const s = useStore();
  const navigate = useNavigate();
  const online = isOnline(s);
  const isM = s.isMobile;

  const data = useMemo(() => mapData(s), [s.places]);
  const fit = useMemo(() => (s.mapTrip !== 'alle' ? s.places.filter(p => p.kind === 'place' && p.tripIds.includes(s.mapTrip)).map(p => [p.lat, p.lng] as [number, number]) : null), [s.mapTrip, s.places]);

  const listMode = s.mapList || !online;
  const showMap = online && !s.mapList;

  const years = [...new Set(s.trips.filter(t => t.start && t.status !== 'planlagt').map(t => t.start!.slice(0, 4)))].sort();
  const yearChips = [{ id: 'alle', label: 'Alle' }, ...years.map(y => ({ id: y, label: y })), { id: 'planlagt', label: 'Kommende' }, { id: 'drom', label: 'Drømmer' }];
  const trips = s.trips.map(t => tripMeta(s, t));

  const dests = s.places.filter(p => p.kind === 'destination');
  const destVisited = dests.filter(d => d.status === 'besokt');
  const destPlanned = dests.filter(d => d.status === 'planlagt');
  const destDreams = dests.filter(d => d.status === 'drom');
  const visitedPlaces = s.places.filter(p => p.kind === 'place');
  const countLabel = (d: Place) => (d.status === 'besokt' ? d.tripIds.length + (d.tripIds.length === 1 ? ' reise' : ' reiser') : d.status === 'planlagt' ? 'Kommende' : 'Drøm');

  return (
    <>
      <div style={{ flex: 1, position: 'relative', minWidth: 0, background: '#E8E0D2' }}>
        {showMap && (
          <MapView
            data={data}
            filter={{ tripId: s.mapTrip, year: s.mapYear }}
            selectedId={s.mapSel?.id ?? null}
            fit={fit}
            fitKey={s.mapTrip}
            focus={s.mapFocus}
            visible={visible && showMap}
            title="Verdenskart med reisene våre"
            onSelect={(kind, id) => useStore.setState({ mapSel: { kind, id }, sheet: 'open', mapQuery: '' })}
            onDeselect={() => useStore.setState(st => ({ mapSel: null, sheet: st.sheet === 'closed' ? 'closed' : 'peek' }))}
            onZoom={z => useStore.setState({ mapZoom: z })}
          />
        )}
        {listMode && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: '112px 16px 160px' }}>
            {!online && (
              <div className="notice" style={{ marginBottom: 16 }}>
                <span className="dot" style={{ background: 'var(--amber)', marginTop: 6 }} />
                <span><strong>Kartet er ikke tilgjengelig uten nett.</strong> Lagrede steder vises som liste. Fullstendige offlinekart er ikke med i første versjon.</span>
              </div>
            )}
            <Eyebrow style={{ margin: '0 0 8px' }}>Besøkt</Eyebrow>
            {destVisited.map(d => (
              <div key={d.id} className="card-sm" style={{ padding: 14, marginBottom: 10 }}>
                <button className="row-btn" style={{ gap: 10 }} onClick={() => focusDest(d)}>
                  <span className="serif" style={{ fontSize: 20, fontWeight: 500, flex: 1 }}>{d.name}</span>
                  <span className="small muted">{countLabel(d)}</span>
                </button>
              </div>
            ))}
            <Eyebrow style={{ margin: '16px 0 8px' }}>Steder</Eyebrow>
            {visitedPlaces.map(p => (
              <button key={p.id} className="row-btn" onClick={() => navigate(paths.place(p.id))} style={{ minHeight: 52, padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)', marginBottom: 8 }}>
                <Pin glyph={typeInfo(p.type).glyph} size={30} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 500 }}>{p.name}</span>
                  <span className="xs muted" style={{ display: 'block' }}>{typeInfo(p.type).label} · {s.places.find(d => d.id === p.dest)?.name ?? ''}</span>
                </span>
                <span style={{ color: 'var(--faint)' }}>›</span>
              </button>
            ))}
            <Eyebrow style={{ margin: '16px 0 8px' }}>Kommende og drømmer</Eyebrow>
            {destPlanned.map(d => (
              <div key={d.id} className="row" style={{ gap: 10, minHeight: 48, padding: '8px 14px', border: '1px dashed var(--terracotta)', borderRadius: 10, background: 'var(--paper)', marginBottom: 8 }}>
                <span style={{ flex: 1, fontWeight: 500 }}>{d.name}</span>
                <span className="xs" style={{ color: 'var(--terracotta)', fontWeight: 600 }}>Kommende · ikke gjennomført</span>
              </div>
            ))}
            {destDreams.map(d => (
              <div key={d.id} className="row" style={{ gap: 10, minHeight: 48, padding: '8px 14px', border: '1px dotted #8F9A86', borderRadius: 10, background: 'var(--cream)', marginBottom: 8 }}>
                <span style={{ flex: 1, fontWeight: 500, color: 'var(--olive-deep)' }}>{d.name}</span>
                <span className="xs" style={{ color: 'var(--olive-deep)' }}>Drøm</span>
              </div>
            ))}
          </div>
        )}
        {/* Search and filters */}
        <div className="stack" style={{ position: 'absolute', left: 12, right: 12, top: 12, gap: 8, pointerEvents: 'none', zIndex: 1020 }}>
          <div className="row" style={{ gap: 8, pointerEvents: 'auto' }}>
            <label className="row" style={{ flex: 1, gap: 8, minHeight: 46, padding: '0 14px', borderRadius: 999, background: 'rgba(255,252,246,.97)', border: '1px solid rgba(46,53,47,.15)', boxShadow: '0 2px 8px rgba(46,53,47,.12)' }}>
              <span aria-hidden="true" className="muted">⌕</span>
              <input value={s.mapQuery} onChange={e => useStore.setState({ mapQuery: e.target.value })} placeholder="Søk etter reise, sted eller minne" aria-label="Søk" style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', fontSize: 15, outline: 'none' }} />
              {s.mapQuery && <button onClick={() => useStore.setState({ mapQuery: '' })} aria-label="Tøm søk" style={{ border: 0, background: 'transparent', fontSize: 18, padding: 4 }}>×</button>}
            </label>
            <button onClick={() => useStore.setState(st => ({ mapList: !st.mapList }))} style={{ minHeight: 46, padding: '0 14px', borderRadius: 999, background: 'rgba(255,252,246,.97)', border: '1px solid rgba(46,53,47,.15)', boxShadow: '0 2px 8px rgba(46,53,47,.12)', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>
              {s.mapList ? 'Vis kart' : 'Vis liste'}
            </button>
          </div>
          <div className="row wrap" style={{ gap: 6, pointerEvents: 'auto' }}>
            {yearChips.map(c => {
              const on = s.mapYear === c.id;
              return (
                <button key={c.id} onClick={() => useStore.setState({ mapYear: c.id, mapTrip: 'alle', mapSel: null })} aria-pressed={on}
                  style={{ minHeight: 34, padding: '0 12px', borderRadius: 999, border: '1px solid rgba(46,53,47,.18)', fontSize: 13, fontWeight: 500, background: on ? 'var(--ink)' : 'rgba(255,252,246,.95)', color: on ? 'var(--paper)' : 'var(--ink)' }}>{c.label}</button>
              );
            })}
            <select value={s.mapTrip} onChange={e => useStore.setState({ mapTrip: e.target.value, mapSel: null, sheet: 'open' })} aria-label="Filtrer på reise"
              style={{ minHeight: 34, padding: '0 10px', borderRadius: 999, border: '1px solid rgba(46,53,47,.18)', background: 'rgba(255,252,246,.97)', fontSize: 13, maxWidth: 180 }}>
              <option value="alle">Alle reiser</option>
              {trips.map(t => <option key={t.id} value={t.id}>{t.title + ' · ' + t.dateLabel}</option>)}
            </select>
          </div>
        </div>
        {isM && (
          <>
            {s.sheet === 'closed' && (
              <button onClick={() => useStore.setState({ sheet: 'open' })} className="btn btn-dark" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 16, fontSize: 14, boxShadow: '0 4px 14px rgba(46,53,47,.3)', zIndex: 1020 }}>Vis panel</button>
            )}
            <section aria-label="Valgt sted" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: s.sheet === 'open' ? '64%' : s.sheet === 'peek' ? '132px' : '0px', background: 'var(--paper)', borderRadius: '18px 18px 0 0', boxShadow: '0 -6px 24px rgba(46,53,47,.18)', display: 'flex', flexDirection: 'column', transition: 'height .3s ease', zIndex: 1025, overflow: 'hidden' }}>
              <div className="row" style={{ justifyContent: 'space-between', padding: '6px 8px 0 8px', flex: 'none' }}>
                <button onClick={() => useStore.setState(st => ({ sheet: st.sheet === 'open' ? 'peek' : 'open' }))} aria-label={s.sheet === 'open' ? 'Vis mindre' : 'Vis mer'} style={{ flex: 1, height: 36, border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: 40, height: 5, borderRadius: 3, background: 'rgba(46,53,47,.25)' }} />
                </button>
                <button onClick={() => useStore.setState({ sheet: 'closed' })} aria-label="Lukk panel" className="icon-btn">×</button>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 24px' }}><Panel s={s} trips={trips} /></div>
            </section>
          </>
        )}
      </div>
      {!isM && (
        <aside aria-label="Valgt sted" style={{ width: 380, flex: 'none', background: 'var(--paper)', borderLeft: '1px solid var(--line)', overflow: 'auto', padding: '24px 22px 32px' }}>
          <Panel s={s} trips={trips} />
        </aside>
      )}
    </>
  );
}

function Panel({ s, trips }: { s: State; trips: TripView[] }) {
  const navigate = useNavigate();
  const q = s.mapQuery.trim().toLowerCase();
  const visitedPlaces = s.places.filter(p => p.kind === 'place');
  const dests = s.places.filter(p => p.kind === 'destination');
  const selDest = s.mapSel?.kind === 'destination' ? dests.find(d => d.id === s.mapSel!.id) : undefined;
  const selPlace = s.mapSel?.kind === 'place' ? visitedPlaces.find(p => p.id === s.mapSel!.id) : undefined;
  const mapTripObj = s.mapTrip !== 'alle' ? trips.find(t => t.id === s.mapTrip) : undefined;
  const mode = q ? 'search' : selPlace ? 'place' : selDest ? 'dest' : mapTripObj ? 'trip' : 'oversikt';
  const backBtn = (label: string, onClick: () => void) => <button onClick={onClick} className="link-btn" style={{ fontSize: 13, marginBottom: 8 }}>{label}</button>;

  if (mode === 'search') {
    const results = [
      ...trips.filter(t => (t.title + ' ' + t.destLabel).toLowerCase().includes(q)).map(t => ({ id: 't' + t.id, kind: 'Reise', label: t.title, sub: t.destLabel + ' · ' + t.dateLabel, click: () => navigate(paths.trip(t.id)) })),
      ...visitedPlaces.filter(p => p.name.toLowerCase().includes(q)).map(p => ({ id: 'p' + p.id, kind: 'Sted', label: p.name, sub: typeInfo(p.type).label, click: () => focusDest(p) })),
      ...s.memories.filter(m => (m.title + ' ' + m.text).toLowerCase().includes(q)).map(m => ({ id: 'm' + m.id, kind: 'Minne', label: m.title, sub: memDate(m), click: () => navigate(paths.memory(m.id)) })),
    ];
    return (
      <>
        <Eyebrow style={{ margin: '4px 0 10px' }}>{results.length} treff</Eyebrow>
        {results.map(r => (
          <button key={r.id} onClick={r.click} className="row-btn" style={{ minHeight: 52, padding: '8px 0', borderBottom: rowSep }}>
            <span style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--terracotta)', fontWeight: 600, width: 48, flex: 'none' }}>{r.kind}</span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontWeight: 500 }}>{r.label}</span><span className="xs muted" style={{ display: 'block' }}>{r.sub}</span></span>
          </button>
        ))}
        {!results.length && (
          <div style={{ padding: '28px 8px', textAlign: 'center' }}>
            <div className="empty-title">Ingen treff på «{s.mapQuery}»</div>
            <p className="muted" style={{ fontSize: 14, margin: '8px 0 16px', textWrap: 'pretty' }}>Prøv et stedsnavn, en reisetittel eller et ord fra et minne. Du kan også legge til det du leter etter.</p>
            <button className="btn btn-outline" onClick={() => { startMemory(null); navigate(paths.newMemory()); }}>Legg til minne</button>
          </div>
        )}
      </>
    );
  }

  if (mode === 'place' && selPlace) {
    const T = typeInfo(selPlace.type);
    return (
      <>
        {backBtn('‹ Oversikt', clearMapSel)}
        <div className="row" style={{ gap: 10 }}>
          <Pin glyph={T.glyph} size={36} />
          <div><Eyebrow>{T.label}</Eyebrow><h2 className="serif" style={{ fontWeight: 500, fontSize: 24, lineHeight: 1.1 }}>{selPlace.name}</h2></div>
        </div>
        <p className="small muted" style={{ margin: '10px 0 14px' }}>Hvert besøk har sine egne bilder, notater og vurderinger. Ingenting slås sammen.</p>
        <PlaceVisits s={s} placeId={selPlace.id} trips={trips} />
        <button onClick={() => navigate(paths.place(selPlace.id))} className="link-btn" style={{ padding: '4px 0' }}>Alle besøk på dette stedet ›</button>
      </>
    );
  }

  if (mode === 'dest' && selDest) {
    const selTrips = trips.filter(t => selDest.tripIds.includes(t.id) && !t.planned);
    const upcoming = [
      ...trips.filter(t => selDest.tripIds.includes(t.id) && t.planned).map(t => ({ id: t.id, title: t.title, dateLabel: t.dateLabel, statusLabel: t.statusLabel })),
      ...s.upcoming.filter(u => u.dest === selDest.id).map(u => ({ id: u.id, title: u.title, dateLabel: 'Dato ikke lagt inn', statusLabel: 'Kommende reise' })),
    ];
    const hasTrips = selDest.tripIds.length > 0;
    const places = visitedPlaces.filter(p => p.dest === selDest.id);
    return (
      <>
        {backBtn('‹ Oversikt', clearMapSel)}
        <Eyebrow>{selDest.country}</Eyebrow>
        <h2 className="serif" style={{ fontWeight: 500, fontSize: 30, margin: '2px 0 14px', lineHeight: 1.1 }}>{selDest.name}</h2>
        {hasTrips && selTrips.map(t => (
          <div key={t.id} className="card-sm" style={{ boxShadow: '0 1px 2px rgba(46,53,47,.05)', marginBottom: 12, overflow: 'hidden' }}>
            <button onClick={() => navigate(paths.trip(t.id))} className="ph ph-btn" aria-label={t.title} style={{ height: 120 }}>
              <Img photo={t.cover} />
              {t.cover?.src && <span className="demo-tag" style={{ bottom: 8 }}>demo</span>}
            </button>
            <div style={{ padding: '12px 14px 14px' }}>
              <Eyebrow>{t.dateLabel}</Eyebrow>
              <div className="serif" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.1, margin: '2px 0 4px' }}>{t.title}</div>
              <div className="small muted" style={{ marginBottom: 12 }}>{t.statusLabel} · {t.memCount} minner</div>
              <div className="row wrap" style={{ gap: 8 }}>
                <button className="btn btn-primary" style={{ minHeight: 40, padding: '0 16px', fontSize: 14 }} onClick={() => navigate(paths.trip(t.id))}>Åpne reiseboken</button>
                <button className="btn btn-outline clear" style={{ minHeight: 40, padding: '0 14px', fontSize: 14 }} onClick={() => useStore.setState({ mapTrip: t.id, mapSel: null, sheet: 'open' })}>Vis stedene</button>
              </div>
            </div>
          </div>
        ))}
        {upcoming.map(t => (
          <div key={t.id} style={{ border: '1px dashed var(--terracotta)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <Eyebrow accent>{t.statusLabel}</Eyebrow>
            <div className="serif" style={{ fontSize: 22, fontWeight: 500, margin: '2px 0 4px' }}>{t.title}</div>
            <div className="small muted" style={{ marginBottom: 12 }}>{t.dateLabel} · telles ikke som gjennomført</div>
            <button className="btn btn-outline clear" style={{ minHeight: 40, padding: '0 14px', fontSize: 14 }} onClick={() => navigate(paths.dreams())}>Åpne under Drømmer</button>
          </div>
        ))}
        {selDest.status === 'drom' && (
          <div style={{ border: '1px dotted #8F9A86', borderRadius: 10, padding: 14, background: 'var(--cream)' }}>
            <Eyebrow>Vi drømmer om</Eyebrow>
            <p className="muted" style={{ margin: '6px 0 12px', fontSize: 14 }}>Ikke besøkt ennå. Et sted vi har lyst til.</p>
            <button className="btn btn-outline clear" style={{ minHeight: 40, padding: '0 14px', fontSize: 14 }} onClick={() => navigate(paths.dreams())}>Åpne under Drømmer</button>
          </div>
        )}
        {hasTrips && (
          <>
            <Eyebrow style={{ margin: '10px 0 6px' }}>Steder her</Eyebrow>
            <div className="row wrap" style={{ gap: 6 }}>
              {places.map(p => (
                <button key={p.id} onClick={() => focusDest(p)} className="row" style={{ minHeight: 36, padding: '0 12px 0 6px', border: '1px solid rgba(46,53,47,.18)', borderRadius: 999, background: 'var(--paper)', fontSize: 13, fontWeight: 500, gap: 6 }}>
                  <Pin glyph={typeInfo(p.type).glyph} size={24} style={{ fontSize: 11 }} />{p.name}
                </button>
              ))}
            </div>
          </>
        )}
      </>
    );
  }

  if (mode === 'trip' && mapTripObj) {
    const places = visitedPlaces.filter(p => p.tripIds.includes(mapTripObj.id));
    return (
      <>
        {backBtn('‹ Alle reiser', () => useStore.setState({ mapTrip: 'alle', mapSel: null }))}
        <Eyebrow>{mapTripObj.dateLabel}</Eyebrow>
        <h2 className="serif" style={{ fontWeight: 500, fontSize: 26, margin: '2px 0 4px', lineHeight: 1.1 }}>{mapTripObj.title}</h2>
        <p className="small muted" style={{ margin: '0 0 14px' }}>{mapTripObj.destLabel} · {mapTripObj.statusLabel}</p>
        <button className="btn btn-primary btn-block" style={{ marginBottom: 18 }} onClick={() => navigate(paths.trip(mapTripObj.id))}>Åpne reiseboken</button>
        <Eyebrow style={{ margin: '0 0 6px' }}>Steder på denne reisen</Eyebrow>
        {places.map(p => (
          <button key={p.id} onClick={() => focusDest(p)} className="row-btn" style={{ minHeight: 50, padding: '6px 0', borderBottom: rowSep }}>
            <Pin glyph={typeInfo(p.type).glyph} size={30} bg="var(--terracotta)" />
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontWeight: 500 }}>{p.name}</span><span className="xs muted" style={{ display: 'block' }}>{typeInfo(p.type).label}</span></span>
          </button>
        ))}
      </>
    );
  }

  // Overview
  const visited = dests.filter(d => d.status === 'besokt');
  const planned = dests.filter(d => d.status === 'planlagt');
  const dreams = dests.filter(d => d.status === 'drom');
  return (
    <>
      <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 12, margin: '4px 0 4px' }}>
        <h2 className="serif" style={{ fontWeight: 500, fontSize: 24 }}>Stedene våre</h2>
        <span className="small muted">{trips.filter(t => !t.planned).length} reiser · {visitedPlaces.length} steder · {s.memories.length} minner</span>
      </div>
      <p className="small muted" style={{ margin: '0 0 16px' }}>{s.mapZoom < 9 ? 'Zoom inn for å se restauranter, hoteller og steder' : 'Trykk på et sted for å se besøkene'}</p>
      <Eyebrow style={{ margin: '0 0 8px' }}>Besøkt</Eyebrow>
      {visited.map(d => (
        <button key={d.id} onClick={() => focusDest(d)} className="row-btn" style={{ padding: '10px 0', borderBottom: rowSep, minHeight: 64 }}>
          <span className="ph" style={{ width: 52, height: 52, borderRadius: 8, flex: 'none' }}><Img photo={d.photo} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="serif" style={{ display: 'block', fontSize: 20, fontWeight: 500, lineHeight: 1.1 }}>{d.name}</span>
            <span className="small muted" style={{ display: 'block' }}>{d.country} · {d.tripIds.length + (d.tripIds.length === 1 ? ' reise' : ' reiser')}</span>
          </span>
          <span style={{ color: 'var(--faint)', fontSize: 18 }}>›</span>
        </button>
      ))}
      {planned.length > 0 && (
        <>
          <Eyebrow accent style={{ margin: '18px 0 8px' }}>Kommende · ikke gjennomført</Eyebrow>
          {planned.map(d => (
            <button key={d.id} onClick={() => focusDest(d)} className="row-btn" style={{ padding: '10px 12px', border: '1px dashed var(--terracotta)', borderRadius: 10, minHeight: 52, marginBottom: 8 }}>
              <span style={{ flex: 1, fontWeight: 500 }}>{d.name}</span><span className="xs muted">Dato ikke lagt inn</span>
            </button>
          ))}
        </>
      )}
      {dreams.length > 0 && (
        <>
          <Eyebrow style={{ margin: '18px 0 8px' }}>Vi drømmer om</Eyebrow>
          <div className="row wrap" style={{ gap: 6 }}>
            {dreams.map(d => (
              <button key={d.id} onClick={() => focusDest(d)} style={{ minHeight: 36, padding: '0 12px', border: '1px dotted #8F9A86', borderRadius: 999, background: 'var(--cream)', color: 'var(--olive-deep)', fontSize: 13, fontWeight: 500 }}>☆ {d.name}</button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function PlaceVisits({ s, placeId, trips }: { s: State; placeId: string; trips: TripView[] }) {
  const navigate = useNavigate();
  const visits = s.memories.filter(m => m.placeId === placeId);
  return (
    <>
      {visits.map(m => {
        const v = memCard(s, m);
        const t = trips.find(x => x.id === m.tripId);
        return (
          <div key={m.id} className="card-sm" style={{ padding: 14, marginBottom: 12 }}>
            <Eyebrow>{v.dateLabel} · {t?.title ?? ''}</Eyebrow>
            <div className="serif" style={{ fontSize: 20, fontWeight: 500, margin: '2px 0 10px' }}>{v.title}</div>
            <div className="row" style={{ gap: 6, marginBottom: 12 }}>
              {m.photos.map((p, i) => <PhotoButton key={p.id} photo={p} list={m.photos} index={i} radius={6} style={{ width: 64, height: 64, aspectRatio: 'auto', flex: 'none' }} />)}
            </div>
            {m.visit && ratingRows(s, m).map(r => (
              <div key={r.id} className="row" style={{ alignItems: 'flex-start', gap: 8, padding: '6px 0', borderTop: '1px solid rgba(46,53,47,.08)' }}>
                <Avatar who={r.id} size={22} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{r.name}</span>{' '}
                  {r.rated ? <span aria-label={r.starLabel} style={{ color: 'var(--terracotta)', letterSpacing: 1 }}>{r.stars}</span> : <span className="muted" style={{ fontStyle: 'italic' }}>Ikke vurdert</span>}
                  <span className="muted" style={{ display: 'block' }}>{r.text}</span>
                </span>
              </div>
            ))}
            <button className="btn btn-dark btn-block" style={{ marginTop: 8, minHeight: 40, fontSize: 14 }} onClick={() => navigate(paths.memory(m.id))}>Åpne besøket</button>
          </div>
        );
      })}
    </>
  );
}
