import { Img, PhotoButton } from '../../components/Photo';
import { fmtDate, parseIso, weekday } from '../../lib/format';
import { memCard, type TripView } from '../../store/derive';
import { setTripCover, togglePhoto, type State } from '../../store/store';
import type { Photo } from '../../data/types';

/** «Dager»: optional chapters, one per date, plus memories without an exact day. */
export function DaysTab({ s, trip, onOpenDay, onOpenMem, onAddMemory }: { s: State; trip: TripView; onOpenDay: (i: number) => void; onOpenMem: (id: string) => void; onAddMemory: () => void }) {
  const inDays = new Set(trip.days.flatMap(d => d.memoryIds));
  const loose = s.memories.filter(m => m.tripId === trip.id && !inDays.has(m.id) && !m.galleryOnly).map(m => memCard(s, m));
  return (
    <>
      {trip.days.length > 0 ? (
        <>
          <p className="muted" style={{ margin: '0 0 16px', fontSize: 14 }}>Dagene er valgfrie kapitler. Et minne kan legges til uten at alle dagene fylles ut.</p>
          {trip.days.map((d, i) => {
            const ms = d.memoryIds.map(id => s.memories.find(m => m.id === id)).filter(Boolean);
            const written = ms.length > 0;
            const thumb = ms[0]?.photos[0];
            return (
              <button key={d.date} onClick={() => onOpenDay(i)} className="row-btn" style={{ gap: 14, borderBottom: '1px solid var(--line)', padding: '12px 0', minHeight: 72 }}>
                <span style={{ width: 56, flex: 'none', textAlign: 'center' }}>
                  <span className="eyebrow" style={{ display: 'block' }}>Dag {i + 1}</span>
                  <span className="serif" style={{ display: 'block', fontSize: 24, fontWeight: 500, lineHeight: 1 }}>{parseIso(d.date).d}</span>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="xs muted" style={{ display: 'block' }}>{weekday(d.date)} {fmtDate(d.date)}</span>
                  {written ? (
                    <>
                      <span className="serif" style={{ display: 'block', fontSize: 19, fontWeight: 500 }}>{d.title || ms[0]!.title}</span>
                      <span className="small muted" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ms.map(m => m!.title).join(' · ')}</span>
                    </>
                  ) : (
                    <>
                      <span className="hand" style={{ display: 'block', fontSize: 20, color: 'var(--faint)' }}>Ikke skrevet ennå</span>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--terracotta)', fontWeight: 500 }}>+ Legg til minne</span>
                    </>
                  )}
                </span>
                {written && <span className="ph" style={{ width: 56, height: 56, borderRadius: 8, flex: 'none' }}>{thumb && <Img photo={thumb} />}</span>}
              </button>
            );
          })}
        </>
      ) : (
        <div className="empty">
          <div className="empty-title">Ingen dager ennå</div>
          <p className="muted" style={{ margin: '6px 0 14px', fontSize: 14 }}>Legg til et minne med dato, så oppstår dagen av seg selv.</p>
          <button className="btn btn-primary" onClick={onAddMemory}>+ Legg til minne</button>
        </div>
      )}
      {loose.length > 0 && (
        <>
          <h3 className="serif" style={{ fontWeight: 500, fontSize: 20, margin: '24px 0 4px' }}>Minner uten eksakt dag</h3>
          <p className="small muted" style={{ margin: '0 0 6px' }}>Vises i historien og bokvisningen med den datoen dere kjenner.</p>
          {loose.map(m => (
            <button key={m.id} onClick={() => onOpenMem(m.id)} className="row-btn" style={{ borderBottom: '1px solid var(--line)', padding: '10px 0', minHeight: 52 }}>
              <span className="pin" style={{ width: 28, height: 28, fontSize: 12 }} aria-hidden="true">{m.glyph}</span>
              <span style={{ flex: 1 }}><span style={{ display: 'block', fontWeight: 500 }}>{m.title}</span><span className="xs muted" style={{ display: 'block' }}>{m.dateLabel} · {m.photos.length} bilder</span></span>
            </button>
          ))}
        </>
      )}
    </>
  );
}

/** «Bilder»: every photo once, with the three separate choices: cover, featured, in the book. */
export function PhotosTab({ s, trip, onOpenBook, onImport }: { s: State; trip: TripView; onOpenBook: () => void; onImport: () => void }) {
  const all = s.memories.filter(m => m.tripId === trip.id).flatMap(m => m.photos.map(p => ({ p, m })));
  const list: Photo[] = all.map(a => a.p);
  if (!all.length) {
    return (
      <div className="empty">
        <div className="empty-title">Ingen bilder ennå</div>
        <p className="muted" style={{ margin: '6px 0 14px', fontSize: 14 }}>Velg bilder fra telefonen. Dato og sted foreslås, og du bekrefter.</p>
        <button className="btn btn-primary" onClick={onImport}>Legg til bilder</button>
      </div>
    );
  }
  const nIn = list.filter(p => p.inBook !== false).length, nF = list.filter(p => p.featured).length;
  const chip = { minHeight: 34, padding: '0 10px', borderRadius: 999, border: '1px solid rgba(46,53,47,.25)', fontSize: 12, fontWeight: 500 };
  return (
    <>
      <div className="row wrap card-sm" style={{ justifyContent: 'space-between', gap: 12, padding: '12px 14px', marginBottom: 16 }}>
        <span style={{ flex: 1, minWidth: 200 }}>
          <span style={{ display: 'block', fontWeight: 600 }}>Boken bruker {nIn} av {list.length} bilder · {nF} fremhevet</span>
          <span className="xs muted" style={{ display: 'block' }}>Fremhevede bilder får større plass i historien og boken. Bilder som ikke er med i boken, blir liggende her. Ingen kopier lages.</span>
        </span>
        <button className="btn btn-dark" style={{ minHeight: 42, padding: '0 16px', fontSize: 14 }} onClick={onOpenBook}>Se som reisebok</button>
      </div>
      <div style={{ columns: '2 200px', columnGap: 14 }}>
        {all.map(({ p, m }, i) => {
          const inB = p.inBook !== false;
          const isCover = !!trip.cover && trip.cover.id === p.id;
          return (
            <figure key={p.id} style={{ margin: '0 0 16px', breakInside: 'avoid', opacity: inB ? 1 : 0.5, transition: 'opacity .2s' }}>
              <PhotoButton photo={p} list={list} index={i} demoTag />
              <figcaption className="xs muted" style={{ marginTop: 4 }}>{p.caption}{p.caption ? ' · ' : ''}<span style={{ color: 'var(--faint)' }}>{m.title}</span></figcaption>
              <div className="row wrap" style={{ gap: 4, marginTop: 6 }}>
                <button onClick={() => togglePhoto(p.id, 'featured')} aria-pressed={!!p.featured} style={{ ...chip, background: p.featured ? 'var(--terracotta)' : 'transparent', color: p.featured ? 'var(--paper)' : 'var(--ink)' }}>{p.featured ? '★ Fremhevet' : '☆ Fremhev'}</button>
                <button onClick={() => togglePhoto(p.id, 'inBook')} aria-pressed={inB} style={{ ...chip, background: inB ? 'transparent' : 'var(--ink)', color: inB ? 'var(--ink)' : 'var(--paper)' }}>{inB ? '✓ I boken' : 'Ikke i boken'}</button>
                {isCover ? (
                  <span style={{ minHeight: 34, display: 'inline-flex', alignItems: 'center', padding: '0 10px', fontSize: 12, color: 'var(--olive-deep)', fontWeight: 600 }}>● Forside</span>
                ) : (
                  <button onClick={() => setTripCover(trip.id, p.id)} style={{ ...chip, border: 0, background: 'transparent', color: 'var(--muted)' }}>Bruk som forside</button>
                )}
              </div>
            </figure>
          );
        })}
      </div>
    </>
  );
}
