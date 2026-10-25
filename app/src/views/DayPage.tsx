import { Link, useNavigate, useParams } from 'react-router-dom';
import { BackLink, Empty } from '../components/bits';
import { Img } from '../components/Photo';
import { fmtDate, weekday } from '../lib/format';
import { paths, useBack } from '../lib/nav';
import { usePageTitle } from '../lib/page';
import { memCard } from '../store/derive';
import { startMemory, useStore } from '../store/store';

export default function DayPage() {
  const { tripId = '', idx = '' } = useParams();
  const s = useStore();
  const navigate = useNavigate();
  const back = useBack(paths.trip(tripId, { tab: 'dager' }));
  const trip = s.trips.find(t => t.id === tripId);
  const i = Number(idx);
  const day = trip?.days[i];
  usePageTitle(day ? fmtDate(day.date) : 'Dag');
  if (!trip || !day) return <Empty title="Fant ikke dagen"><p style={{ marginTop: 10 }}><Link to={paths.trips()}>Til alle reiser</Link></p></Empty>;

  const mems = day.memoryIds.map(id => s.memories.find(m => m.id === id)).filter(Boolean).map(m => memCard(s, m!));
  const addMemory = () => { startMemory(trip.id, day.date); navigate(paths.newMemory()); };
  const title = day.title || mems[0]?.title;

  return (
    <>
      {!s.isMobile && <BackLink label={'‹ ' + trip.title} onClick={back} />}
      <div className="eyebrow">Dag {i + 1} · {trip.title}</div>
      <h1 className="serif" style={{ fontWeight: 500, fontSize: 36, lineHeight: 1.05, margin: '4px 0 4px' }}>{weekday(day.date)} {fmtDate(day.date)}</h1>
      {mems.length > 0 && title && <p className="serif muted" style={{ fontStyle: 'italic', fontSize: 20, margin: '0 0 24px' }}>{title}</p>}
      {!mems.length && (
        <div className="empty" style={{ marginTop: 20, padding: '36px 20px' }}>
          <div className="hand" style={{ fontSize: 28, color: 'var(--olive-deep)' }}>Ingenting skrevet om denne dagen ennå</div>
          <p className="muted" style={{ margin: '6px auto 16px', fontSize: 14, maxWidth: 360 }}>Det går fint. Legg til ett minne, eller la dagen stå tom.</p>
          <button className="btn btn-primary" onClick={addMemory}>+ Legg til minne</button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
        {mems.map(m => (
          <button key={m.id} onClick={() => navigate(paths.memory(m.id))} style={{ textAlign: 'left', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--paper)', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {m.thumb && <span className="ph" style={{ display: 'block', width: '100%', aspectRatio: m.thumb.w + ' / ' + m.thumb.h, maxHeight: 320 }}><Img photo={m.thumb} /></span>}
            <span style={{ display: 'block', padding: '14px 16px 16px' }}>
              <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="pin" style={{ width: 18, height: 18, fontSize: 10, fontWeight: 600 }} aria-hidden="true">{m.glyph}</span>{m.typeLabel}</span>
              <span className="serif" style={{ display: 'block', fontSize: 22, fontWeight: 500, lineHeight: 1.1, margin: '4px 0 6px' }}>{m.title}</span>
              {m.isUnfinished && !m.text && <span className="hand" style={{ display: 'block', fontSize: 18, color: 'var(--terracotta)' }}>Bare bilder så langt – teksten mangler</span>}
              {m.text && <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 14, color: 'var(--muted)' }}>{m.text}</span>}
            </span>
          </button>
        ))}
      </div>
      {mems.length > 0 && <button className="btn btn-outline" style={{ marginTop: 20 }} onClick={addMemory}>+ Legg til minne denne dagen</button>}
    </>
  );
}
