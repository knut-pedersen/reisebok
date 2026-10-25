import { useEffect, useMemo, useState } from 'react';
import MapView, { type MapFocus } from '../../components/MapView';
import { PhotoButton } from '../../components/Photo';
import { byMemDate, fmtDate, memDate, weekday } from '../../lib/format';
import { mapData, memCard, type TripView } from '../../store/derive';
import { isOnline, type State } from '../../store/store';
import { pill } from './common';

interface Props {
  s: State;
  trip: TripView;
  selMem: string | null;
  vis: 'tidslinje' | 'kart';
  onSelect: (id: string | null) => void;
  onVis: (v: 'tidslinje' | 'kart') => void;
  onOpenMem: (id: string) => void;
  onInStory: (id: string) => void;
}

/** «Steder»: the timeline and the trip map are linked by the selected memory. */
export default function PlacesTab({ s, trip, selMem, vis, onSelect, onVis, onOpenMem, onInStory }: Props) {
  const isM = s.isMobile;
  const online = isOnline(s);
  const [placeChoice, setPlaceChoice] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const data = useMemo(() => mapData(s, trip.id), [s.places, trip.id]);
  const fit = useMemo(() => data.places.map(p => [p.lat, p.lng] as [number, number]), [data]);

  const mems = s.memories.filter(m => m.tripId === trip.id && !m.galleryOnly).sort(byMemDate);
  const sel = selMem ? s.memories.find(m => m.id === selMem && m.tripId === trip.id) : undefined;
  const selPlace = sel?.placeId ? s.places.find(p => p.id === sel.placeId) : undefined;
  const tlMode = !isM || vis === 'tidslinje';
  const mapMode = !isM || vis === 'kart';

  // Selecting a memory brings its place into view on the map.
  useEffect(() => {
    if (selPlace && mapMode) setFocus(f => ({ id: selPlace.id, lat: selPlace.lat, lng: selPlace.lng, zoom: 15, n: (f?.n ?? 0) + 1 }));
  }, [selMem, mapMode]);

  const select = (id: string) => { setPlaceChoice(null); onSelect(id); };
  const onMarker = (kind: 'destination' | 'place', id: string) => {
    if (kind !== 'place') return;
    const ms = mems.filter(m => m.placeId === id);
    if (ms.length === 1) select(ms[0].id);
    else if (ms.length > 1) { setPlaceChoice(id); onSelect(null); }
  };
  const pc = placeChoice ? s.places.find(p => p.id === placeChoice) : undefined;

  let last: string | null = null;
  return (
    <>
      {isM && (
        <div role="tablist" className="segmented" style={{ marginBottom: 12 }}>
          {(['tidslinje', 'kart'] as const).map(v => <button key={v} role="tab" aria-selected={vis === v} onClick={() => onVis(v)} style={{ padding: '0 18px' }}>{v === 'kart' ? 'Kart' : 'Tidslinje'}</button>)}
        </div>
      )}
      <p className="small muted" style={{ margin: '0 0 14px' }}>Velg et minne i tidslinjen for å se det på kartet, eller trykk på en markør for å finne minnet. Valget beholdes når dere bytter visning.</p>
      <div style={{ display: 'grid', gridTemplateColumns: isM ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
        {tlMode && (
          <div style={{ minWidth: 0 }}>
            {mems.map(raw => {
              const m = memCard(s, raw);
              const head = !raw.date ? 'Dato ikke angitt' : raw.date.length === 7 ? memDate(raw) : weekday(raw.date) + ' ' + fmtDate(raw.date);
              const showHead = head !== last;
              last = head;
              const selected = selMem === m.id;
              return (
                <div key={m.id}>
                  {showHead && <div className="eyebrow" style={{ margin: '14px 0 6px' }}>{head}</div>}
                  <div data-mem={m.id} style={{ border: '1px solid ' + (selected ? 'var(--terracotta)' : 'var(--line)'), background: selected ? 'var(--paper)' : 'transparent', borderRadius: 10, marginBottom: 8, transition: 'background .25s,border-color .25s' }}>
                    <button onClick={() => select(m.id)} aria-pressed={selected} className="row-btn" style={{ padding: '10px 12px', minHeight: 58 }}>
                      <span className="pin" aria-hidden="true" style={{ width: 32, height: 32, fontSize: 12, background: m.hasPlace ? (selected ? 'var(--terracotta)' : 'var(--olive)') : 'transparent', color: m.hasPlace ? 'var(--paper)' : 'var(--faint)', border: m.hasPlace ? 'none' : '1px dashed var(--faint)' }}>{m.glyph}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 500, fontSize: 15 }}>{m.title}</span>
                        <span className="xs muted" style={{ display: 'block' }}>{m.hasPlace ? m.placeName : 'Uten sted – vises i historien og dagene'}</span>
                      </span>
                      {m.isWorking && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, border: '1px dashed var(--terracotta)', color: 'var(--terracotta)', fontWeight: 600, whiteSpace: 'nowrap' }}>Under arbeid</span>}
                    </button>
                    {selected && (
                      <div className="stack fade" style={{ padding: '0 12px 12px 56px', gap: 10 }}>
                        {raw.photos.length > 0 && (
                          <div className="row" style={{ gap: 6 }}>
                            {raw.photos.slice(0, 3).map((p, i) => <PhotoButton key={p.id} photo={p} list={raw.photos} index={i} radius={6} style={{ width: 64, height: 64, aspectRatio: 'auto', flex: 'none' }} />)}
                          </div>
                        )}
                        <div className="row wrap" style={{ gap: 6 }}>
                          <button onClick={() => onOpenMem(m.id)} style={{ ...pill.dark, minHeight: 38, fontSize: 13 }}>Åpne minnet</button>
                          <button onClick={() => onInStory(m.id)} style={{ ...pill.outline, minHeight: 38, padding: '0 12px' }}>Se i historien</button>
                          {isM && m.hasPlace && <button onClick={() => onVis('kart')} style={{ ...pill.outline, minHeight: 38, padding: '0 12px' }}>◎ Vis på kartet</button>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {mapMode && (
          <div className="stack" style={{ position: 'sticky', top: isM ? 0 : 58, gap: 10, minWidth: 0 }}>
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: isM ? '58vh' : 'calc(100vh - 180px)', minHeight: 320, border: '1px solid rgba(46,53,47,.15)', background: '#E8E0D2' }}>
              {online ? (
                <MapView data={data} filter={{ tripId: trip.id }} selectedId={selPlace?.id ?? placeChoice} fit={fit} fitKey={trip.id} focus={focus} title="Kart over stedene på denne reisen" onSelect={onMarker} onDeselect={() => setPlaceChoice(null)} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Kartet er ikke tilgjengelig uten nett. Alle minner og steder vises i tidslinjen.</div>
              )}
            </div>
            {pc && (
              <div className="fade" style={{ background: 'var(--paper)', border: '1px solid var(--terracotta)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Flere minner på {pc.name}</div>
                {mems.filter(m => m.placeId === pc.id).map(m => (
                  <button key={m.id} onClick={() => select(m.id)} className="row-btn" style={{ justifyContent: 'space-between', gap: 10, minHeight: 46, padding: '6px 0', borderTop: '1px solid rgba(46,53,47,.08)' }}>
                    <span style={{ fontWeight: 500 }}>{m.title}</span><span className="xs muted" style={{ whiteSpace: 'nowrap' }}>{memDate(m)}</span>
                  </button>
                ))}
              </div>
            )}
            {isM && vis === 'kart' && sel && (() => {
              const c = memCard(s, sel);
              return (
                <div className="stack" style={{ background: 'var(--paper)', border: '1px solid rgba(46,53,47,.15)', borderRadius: 10, padding: '12px 14px', gap: 8 }}>
                  <div className="eyebrow">{c.dateLabel}</div>
                  <div className="serif" style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.15 }}>{c.title}</div>
                  <div className="small muted">{c.placeName}</div>
                  <div className="row wrap" style={{ gap: 6 }}>
                    <button onClick={() => onOpenMem(c.id)} style={{ ...pill.dark, fontSize: 13 }}>Åpne minnet</button>
                    <button onClick={() => onVis('tidslinje')} style={{ ...pill.outline, padding: '0 12px' }}>Vis i tidslinjen</button>
                    <button onClick={() => onInStory(c.id)} style={{ ...pill.outline, padding: '0 12px' }}>Se i historien</button>
                  </div>
                </div>
              );
            })()}
            {!sel && !pc && <p className="xs muted">Minner uten kjent sted vises i tidslinjen med stiplet markør, men ikke på kartet.</p>}
          </div>
        )}
      </div>
    </>
  );
}
