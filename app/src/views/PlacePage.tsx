import { Link, useNavigate, useParams } from 'react-router-dom';
import { BackLink, Empty, Pin } from '../components/bits';
import { PhotoButton } from '../components/Photo';
import { typeInfo, fmtRange } from '../lib/format';
import { paths, useBack } from '../lib/nav';
import { usePageTitle } from '../lib/page';
import { memCard, ratingRows } from '../store/derive';
import { useStore } from '../store/store';
import { RatingCell } from './trip/common';

/** One place, every visit kept separately – a new visit never overwrites an old one. */
export default function PlacePage() {
  const { placeId = '' } = useParams();
  const s = useStore();
  const navigate = useNavigate();
  const back = useBack('/');
  const place = s.places.find(p => p.id === placeId);
  usePageTitle(place?.name ?? 'Sted');
  if (!place) return <Empty title="Fant ikke stedet"><p style={{ marginTop: 10 }}><Link to={paths.trips()}>Til alle reiser</Link></p></Empty>;

  const T = typeInfo(place.type);
  const destName = place.kind === 'destination' ? place.country : s.places.find(d => d.id === place.dest)?.name;
  const visits = s.memories.filter(m => m.placeId === place.id).map(m => {
    const t = s.trips.find(x => x.id === m.tripId);
    return { ...memCard(s, m), tripTitle: t?.title ?? '', tripDate: t ? fmtRange(t) : '', ratings: ratingRows(s, m) };
  });

  return (
    <>
      {!s.isMobile && <BackLink onClick={back} />}
      <div className="row" style={{ gap: 14, marginBottom: 6 }}>
        <Pin glyph={T.glyph} size={44} />
        <div>
          <div className="eyebrow">{T.label}{destName ? ' · ' + destName : ''}</div>
          <h1 className="serif" style={{ fontWeight: 500, fontSize: 36, lineHeight: 1.05, margin: '2px 0 0' }}>{place.name}</h1>
        </div>
      </div>
      <p className="muted" style={{ margin: '8px 0 24px', fontSize: 14, maxWidth: 560 }}>Besøkt på {place.tripIds.length} {place.tripIds.length === 1 ? 'reise' : 'reiser'}. Hvert besøk beholder sine egne bilder, notater og vurderinger – et nytt besøk overskriver aldri et gammelt.</p>
      {!visits.length && <div className="empty muted" style={{ padding: 32 }}>Ingen minner er knyttet til dette stedet ennå.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 }}>
        {visits.map(v => (
          <article key={v.id} className="card stack" style={{ padding: 16, gap: 10 }}>
            <div className="eyebrow">{v.dateLabel} · {v.tripTitle}</div>
            <button onClick={() => navigate(paths.memory(v.id))} className="serif" style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', fontSize: 24, fontWeight: 500, lineHeight: 1.1, color: 'var(--ink)' }}>{v.title}</button>
            {v.photos.length > 0 && (
              <div className="row wrap" style={{ gap: 6 }}>
                {v.photos.map((p, i) => <PhotoButton key={p.id} photo={p} list={v.photos} index={i} radius={6} style={{ width: 72, height: 72, aspectRatio: 'auto' }} />)}
              </div>
            )}
            {v.text && <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.text}</p>}
            {v.visit && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, borderTop: '1px solid rgba(46,53,47,.1)', paddingTop: 10 }}>
                {v.ratings.map(r => <RatingCell key={r.id} r={r} />)}
              </div>
            )}
            <button onClick={() => navigate(paths.memory(v.id))} style={{ minHeight: 40, padding: '0 14px', borderRadius: 999, border: '1px solid var(--line-strong)', background: 'transparent', fontWeight: 500, fontSize: 14, alignSelf: 'flex-start' }}>Åpne besøket</button>
          </article>
        ))}
      </div>
    </>
  );
}
