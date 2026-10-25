import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BackLink, Empty } from '../components/bits';
import MapView from '../components/MapView';
import { Img, openLightbox, stamp } from '../components/Photo';
import { PEOPLE } from '../lib/format';
import { paths, useBack } from '../lib/nav';
import { getScroller, usePageTitle } from '../lib/page';
import { bookPages, mapData, tripMeta, type BookPage as Page, type TripView } from '../store/derive';
import { isOnline, togglePhoto, useStore } from '../store/store';
import PdfPreview from './PdfPreview';

type Shown = { page: Page; idx: number } | { blank: true; idx: -1 };

const toolBtn: CSSProperties = { minHeight: 40, padding: '0 12px', fontSize: 13 };

export default function BookPage() {
  const { tripId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const s = useStore();
  const back = useBack(paths.trip(tripId));
  const [spread, setSpread] = useState(0);
  const [panel, setPanel] = useState(false);
  const [pdf, setPdf] = useState(params.get('pdf') === '1');
  const raw = s.trips.find(t => t.id === tripId);
  usePageTitle(raw ? raw.title + ' · bok' : 'Reisebok');
  useEffect(() => { setSpread(0); }, [tripId]);
  const closePdf = useCallback(() => {
    setPdf(false);
    if (params.get('pdf')) setParams({}, { replace: true });
  }, [params, setParams]);
  const placesData = useMemo(() => mapData(s, tripId), [s.places, tripId]);

  if (!raw) return <Empty title="Fant ikke reisen"><p className="small muted" style={{ marginTop: 6 }}>Den kan være slettet, eller lenken er feil.</p></Empty>;

  const trip = tripMeta(s, raw);
  const isM = s.isMobile;
  const { pages, chapters } = bookPages(s, tripId);
  const nSpreads = 1 + Math.ceil((pages.length - 1) / 2);
  const k = Math.min(spread, nSpreads - 1);
  const blank: Shown = { blank: true, idx: -1 };
  const at = (i: number): Shown => (pages[i] ? { page: pages[i], idx: i } : blank);
  const visible: Shown[] = isM ? pages.map((page, idx) => ({ page, idx })) : k === 0 ? [blank, at(0)] : [at(2 * k - 1), at(2 * k)];
  const curPage = isM ? 0 : k === 0 ? 0 : 2 * k - 1;

  const jump = (idx: number) => {
    if (isM) {
      const sc = getScroller();
      const el = sc?.querySelector('[data-page="' + idx + '"]');
      if (sc && el) sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 70;
    } else setSpread(idx === 0 ? 0 : Math.floor((idx + 1) / 2));
  };
  const opt = (key: 'comments' | 'ratings') => useStore.setState(st => ({ bookOpts: { ...st.bookOpts, [key]: !st.bookOpts[key] } }));

  const photos = s.memories.filter(m => m.tripId === tripId).flatMap(m => m.photos);
  const nIn = photos.filter(p => p.inBook !== false).length, nF = photos.filter(p => p.featured).length;
  const bookSummary = 'Boken bruker ' + nIn + ' av ' + photos.length + ' bilder · ' + nF + ' fremhevet';
  const showMap = isOnline(s) && !isM;

  return (
    <>
      <div className="row wrap" style={{ gap: 10, marginBottom: 14 }}>
        {!isM && <BackLink label="‹ Tilbake til reisen" onClick={back} />}
        <div style={{ flex: 1 }} />
        <select value={curPage} onChange={e => jump(Number(e.target.value))} aria-label="Gå til kapittel" style={{ minHeight: 40, padding: '0 12px', borderRadius: 999, border: '1px solid rgba(46,53,47,.25)', background: 'var(--paper)', fontSize: 13, maxWidth: 260 }}>
          {chapters.map((c, i) => <option key={i} value={c.page}>{c.label}</option>)}
        </select>
        <button className="chip" style={toolBtn} aria-pressed={s.bookOpts.comments} onClick={() => opt('comments')}>Kommentarer</button>
        <button className="chip" style={toolBtn} aria-pressed={s.bookOpts.ratings} onClick={() => opt('ratings')}>Vurderinger</button>
        <button className="btn btn-outline clear" style={toolBtn} aria-expanded={panel} onClick={() => setPanel(v => !v)}>{panel ? 'Skjul bildeutvalg' : 'Bildeutvalg'}</button>
        <button className="btn btn-primary" style={{ ...toolBtn, padding: '0 14px' }} onClick={() => setPdf(true)}>Last ned som PDF</button>
      </div>
      {panel && (
        <div className="card fade" style={{ padding: '14px 16px', marginBottom: 18 }}>
          <div className="row wrap" style={{ justifyContent: 'space-between', gap: 10, alignItems: 'baseline', marginBottom: 10 }}>
            <strong>{bookSummary}</strong>
            <span className="xs muted">Endringer vises i boken med en gang. Bilder som tas ut, blir liggende i galleriet.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 10 }}>
            {photos.map(p => {
              const inB = p.inBook !== false;
              return (
                <div key={p.id} className="stack" style={{ gap: 4, opacity: inB ? 1 : 0.5 }}>
                  <div className="ph" style={{ aspectRatio: '1', borderRadius: 6 }}><Img photo={p} alt={p.caption} /></div>
                  <button className="chip feat" style={{ minHeight: 32, fontSize: 11 }} aria-pressed={!!p.featured} onClick={() => togglePhoto(p.id, 'featured')}>{p.featured ? '★ Fremhevet' : '☆ Fremhev'}</button>
                  <button className="chip book" style={{ minHeight: 32, fontSize: 11 }} aria-pressed={inB} onClick={() => togglePhoto(p.id, 'inBook')}>{inB ? '✓ I boken' : 'Ikke i boken'}</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!isM && (
        <div className="row" style={{ justifyContent: 'center', gap: 14, marginBottom: 12 }}>
          <button onClick={() => setSpread(Math.max(0, k - 1))} disabled={k === 0} aria-label="Forrige oppslag" style={{ ...navBtn, opacity: k > 0 ? 1 : 0.35 }}>‹</button>
          <span className="small muted" style={{ minWidth: 120, textAlign: 'center' }} aria-live="polite">Oppslag {k + 1} av {nSpreads}</span>
          <button onClick={() => setSpread(Math.min(nSpreads - 1, k + 1))} disabled={k >= nSpreads - 1} aria-label="Neste oppslag" style={{ ...navBtn, opacity: k < nSpreads - 1 ? 1 : 0.35 }}>›</button>
        </div>
      )}
      {isM && <p className="small muted" style={{ textAlign: 'center', margin: '0 0 12px' }}>{pages.length} sider</p>}
      <div style={{ display: 'grid', gridTemplateColumns: isM ? 'minmax(0,1fr)' : '1fr 1fr', gap: isM ? 16 : 0, maxWidth: 1000, margin: '0 auto' }}>
        {visible.map((v, i) => {
          const shade = isM ? '0 2px 10px rgba(46,53,47,.08)' : i === 0 ? 'inset -16px 0 24px -18px rgba(46,53,47,.4), 0 2px 10px rgba(46,53,47,.1)' : 'inset 16px 0 24px -18px rgba(46,53,47,.4), 0 2px 10px rgba(46,53,47,.1)';
          const isBlank = 'blank' in v;
          return (
            <section key={(isBlank ? 'blank' + i : 'pg' + v.idx) + '-' + k} data-page={v.idx} aria-label={isBlank ? 'Tom side' : 'Side ' + (v.idx + 1)}
              style={{ aspectRatio: isM ? 'auto' : '5 / 7', background: 'var(--paper)', padding: isM ? '28px 22px' : '40px 38px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(46,53,47,.1)', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: shade, animation: 'rbFade .3s ease', minHeight: isM && !isBlank && v.page.kind === 'cover' ? 420 : undefined }}>
              {isBlank ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--faint)' }}>
                  <div className="hand" style={{ fontSize: 26, color: 'var(--terracotta)' }}>Knut &amp; Anna</div>
                  <div style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 4 }}>Vår reisebok</div>
                </div>
              ) : (
                <PageBody page={v.page} trip={trip} showMap={showMap} placesData={placesData} />
              )}
              {!isBlank && v.page.kind !== 'cover' && <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: 'var(--faint)' }}>{v.idx + 1}</div>}
            </section>
          );
        })}
      </div>
      <p className="xs muted" style={{ maxWidth: 1000, margin: '14px auto 0', textAlign: 'center' }}>Bokvisningen henter alt fra minnene – ingen egen tekst, ingen kopier av bildene. Endre utvalget under «Bildeutvalg» eller på reisens «Bilder».</p>
      {pdf && <PdfPreview trip={trip} pages={pages} onClose={closePdf} />}
    </>
  );
}

const navBtn: CSSProperties = { width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(46,53,47,.25)', background: 'var(--paper)', fontSize: 20 };
const eyebrow: CSSProperties = { fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--olive-deep)', fontWeight: 600 };

function PageBody({ page, trip, showMap, placesData }: { page: Page; trip: TripView; showMap: boolean; placesData: ReturnType<typeof mapData> }) {
  switch (page.kind) {
    case 'cover':
      return (
        <>
          <div className="ph" style={{ position: 'absolute', inset: 0 }}>{trip.cover && <Img photo={trip.cover} />}</div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(46,53,47,.85),rgba(46,53,47,.1) 60%)' }} />
          <div style={{ position: 'relative', marginTop: 'auto', color: 'var(--paper)' }}>
            <div className="hand" style={{ fontSize: 24 }}>Knut &amp; Anna</div>
            <div className="serif" style={{ fontSize: 46, fontWeight: 500, lineHeight: 1, margin: '4px 0 8px', textWrap: 'balance' }}>{trip.title}</div>
            <div style={{ fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600 }}>{trip.destLabel} · {trip.dateLabel}</div>
          </div>
        </>
      );
    case 'intro':
      return (
        <div style={{ margin: 'auto 0' }}>
          <div style={{ ...eyebrow, marginBottom: 14 }}>Innledning</div>
          <p className="serif" style={{ fontStyle: 'italic', fontSize: 24, lineHeight: 1.4, margin: 0, textWrap: 'pretty' }}>{trip.intro}</p>
          <div className="hand" style={{ fontSize: 22, color: 'var(--terracotta)', marginTop: 18 }}>– Knut &amp; Anna</div>
        </div>
      );
    case 'photo': {
      const i = page.photos.indexOf(page.photo);
      return (
        <>
          <button type="button" onClick={() => openLightbox(page.photos, Math.max(0, i))} aria-label={'Åpne bilde: ' + (page.photo.caption || page.memTitle)}
            style={{ flex: 1, minHeight: 240, position: 'relative', border: 0, padding: 0, background: 'transparent' }}>
            <Img photo={page.photo} fit="contain" />
          </button>
          <div className="row" style={{ justifyContent: 'space-between', gap: 12, fontSize: 13, color: 'var(--muted)', alignItems: 'flex-start' }}>
            <span className="serif" style={{ flex: 1, minWidth: 0, fontStyle: 'italic', fontSize: 15, color: 'var(--ink)' }}>{page.photo.caption}</span>
            <span style={{ ...eyebrow, whiteSpace: 'nowrap' }}>{stamp(page.photo)}</span>
          </div>
        </>
      );
    }
    case 'memory': {
      const m = page.mem;
      return (
        <>
          {page.lead.map(l => l.isNote ? (
            <p key={l.key} className="hand" style={{ fontSize: 20, lineHeight: 1.2, margin: 0 }}>{l.text} <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--muted)' }}>– {l.by ? PEOPLE[l.by].name : ''}</span></p>
          ) : (
            <p key={l.key} className="serif" style={{ fontStyle: 'italic', fontSize: 16, lineHeight: 1.45, margin: 0, color: 'var(--ink-soft)' }}>{l.text}</p>
          ))}
          <div>
            <div style={eyebrow}>{page.date}{m.hasPlace && ' · ' + m.placeName}</div>
            <h3 className="serif" style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.1, margin: '4px 0 0' }}>{m.title}</h3>
          </div>
          {m.text && <p className="serif" style={{ fontSize: 16, lineHeight: 1.55, margin: 0, textWrap: 'pretty' }}>{m.text}</p>}
          {page.small.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 8 }}>
              {page.small.map(p => (
                <button key={p.id} type="button" className="ph ph-btn" aria-label={p.caption || 'Åpne bilde'} onClick={() => openLightbox(page.smallAll, Math.max(0, page.smallAll.indexOf(p)))} style={{ aspectRatio: '4 / 3', borderRadius: 4 }}>
                  <Img photo={p} />
                </button>
              ))}
            </div>
          )}
          {page.comments.length > 0 && (
            <div className="stack" style={{ gap: 4 }}>
              {page.comments.map((c, i) => (
                <div key={i} className="hand" style={{ fontSize: 19, lineHeight: 1.2 }}>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600, color: PEOPLE[c.by].color, letterSpacing: '.04em', textTransform: 'uppercase', marginRight: 6 }}>{PEOPLE[c.by].name}</span>{c.text}
                </div>
              ))}
            </div>
          )}
          {page.ratings.length > 0 && (
            <div className="row wrap" style={{ gap: 18, borderTop: '1px solid var(--line)', paddingTop: 8, fontSize: 13 }}>
              {page.ratings.map(r => (
                <span key={r.id}><strong>{r.name}</strong>{' '}
                  {r.rated ? <span aria-label={r.starLabel} style={{ color: 'var(--terracotta)', letterSpacing: 1 }}>{r.stars}</span> : <em className="muted">Ikke vurdert</em>}
                </span>
              ))}
            </div>
          )}
        </>
      );
    }
    case 'places':
      return (
        <>
          <div style={eyebrow}>Stedene</div>
          {showMap && (
            <div style={{ position: 'relative', flex: 1, minHeight: 200, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--line)' }}>
              <MapView data={placesData} filter={{ tripId: null }} selectedId={null} fit={placesData.places.map(p => [p.lat, p.lng] as [number, number])} fitKey={trip.id} title="Kart over stedene i boken" />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 14px', fontSize: 13 }}>
            {page.places.map(p => (
              <span key={p.id} className="row" style={{ gap: 6 }}>
                <span className="pin" aria-hidden="true" style={{ width: 20, height: 20, fontSize: 10 }}>{p.glyph}</span>{p.name}
              </span>
            ))}
          </div>
        </>
      );
    case 'end':
      return (
        <div style={{ margin: 'auto', textAlign: 'center' }}>
          <div className="hand" style={{ fontSize: 30, color: 'var(--terracotta)' }}>Knut &amp; Anna</div>
          <p className="xs muted" style={{ margin: '8px 0 0' }}>Satt sammen av minnene i «Vår reisebok». Illustrerende demoinnhold.</p>
        </div>
      );
  }
}
