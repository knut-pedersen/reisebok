import { useNavigate } from 'react-router-dom';
import { Img } from '../components/Photo';
import { Eyebrow } from '../components/bits';
import { paths } from '../lib/nav';
import { usePageTitle } from '../lib/page';
import { tripMeta } from '../store/derive';
import { useStore } from '../store/store';

export default function Library() {
  const s = useStore();
  const navigate = useNavigate();
  usePageTitle('Reiser');
  const trips = s.trips.map(t => tripMeta(s, t));
  const years = [...new Set(s.trips.filter(t => t.start && t.status !== 'planlagt').map(t => t.start!.slice(0, 4)))].sort();
  const tq = s.tripQuery.trim().toLowerCase();
  const lib = trips.filter(t => !t.planned && (s.tripYear === 'alle' || t.year === s.tripYear) && (!tq || (t.title + ' ' + t.destLabel).toLowerCase().includes(tq)));
  const upcoming = trips.filter(t => t.planned);
  const newTrip = () => navigate(paths.newTrip());

  return (
    <>
      <div className="row wrap" style={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div><div className="kicker">Stedene vi har vært</div><h1 className="lib-title">Reiser</h1></div>
        <button className="btn btn-primary" onClick={newTrip}>+ Ny reise</button>
      </div>
      <div className="row wrap" style={{ gap: 8, marginBottom: 24 }}>
        {[{ id: 'alle', label: 'Alle år' }, ...years.map(y => ({ id: y, label: y }))].map(c => (
          <button key={c.id} className="chip" aria-pressed={s.tripYear === c.id} onClick={() => useStore.setState({ tripYear: c.id })}>{c.label}</button>
        ))}
        <label className="row" style={{ flex: 1, minWidth: 200, gap: 8, minHeight: 40, padding: '0 14px', borderRadius: 999, background: 'var(--paper)', border: '1px solid rgba(46,53,47,.2)' }}>
          <span aria-hidden="true" className="muted">⌕</span>
          <input value={s.tripQuery} onChange={e => useStore.setState({ tripQuery: e.target.value })} placeholder="Finn en reise eller destinasjon" aria-label="Søk i reiser" style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', outline: 'none', fontSize: 14 }} />
        </label>
      </div>
      {!lib.length && (
        <div style={{ padding: '56px 24px', textAlign: 'center', border: '1px dashed var(--line-strong)', borderRadius: 14 }}>
          <div className="serif" style={{ fontSize: 26, fontWeight: 500 }}>Ingen reiser her ennå</div>
          <p className="muted" style={{ margin: '8px auto 18px', maxWidth: 380, textWrap: 'pretty' }}>Ingen reiser passer til filteret. Nullstill søket, eller opprett en reise – også eldre turer der du bare husker måned eller år.</p>
          <div className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={() => useStore.setState({ tripQuery: '', tripYear: 'alle' })}>Nullstill</button>
            <button className="btn btn-primary" onClick={newTrip}>Ny reise</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 20 }}>
        {lib.map(t => (
          <article key={t.id} className="card" style={{ boxShadow: '0 1px 2px rgba(46,53,47,.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => navigate(paths.trip(t.id))} className="ph ph-btn" aria-label={t.title} style={{ aspectRatio: '4 / 3' }}>
              {t.cover ? (
                <>
                  <Img photo={t.cover} />
                  {t.cover.src && <span className="demo-tag">demo</span>}
                </>
              ) : <span className="ph-note">forsidebilde velges senere</span>}
            </button>
            <div className="stack" style={{ padding: '14px 16px 16px', gap: 4, flex: 1 }}>
              <Eyebrow>{t.dateLabel}</Eyebrow>
              <button onClick={() => navigate(paths.trip(t.id))} className="serif" style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', fontSize: 24, fontWeight: 500, lineHeight: 1.1, color: 'var(--ink)' }}>{t.title}</button>
              <div className="muted" style={{ fontSize: 14 }}>{t.destLabel}</div>
              <div className="row xs muted" style={{ marginTop: 8, gap: 8 }}>
                {t.unfinished && <span className="dot" style={{ width: 8, height: 8, background: 'var(--terracotta)' }} />}{t.statusLabel}
              </div>
            </div>
          </article>
        ))}
      </div>
      {upcoming.length > 0 && (
        <>
          <h2 className="serif" style={{ fontWeight: 500, fontSize: 24, margin: '36px 0 12px' }}>Påbegynt, ikke reist ennå</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
            {upcoming.map(t => (
              <button key={t.id} onClick={() => navigate(paths.trip(t.id))} className="stack" style={{ textAlign: 'left', border: '1px dashed var(--terracotta)', borderRadius: 12, padding: 16, background: 'transparent', gap: 4 }}>
                <span className="eyebrow accent">{t.statusLabel}</span>
                <span className="serif" style={{ fontSize: 22, fontWeight: 500 }}>{t.title}</span>
                <span className="small muted">{t.dateLabel}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
