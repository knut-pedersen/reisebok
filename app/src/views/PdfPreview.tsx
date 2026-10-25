import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Img } from '../components/Photo';
import type { Photo } from '../data/types';
import { paths } from '../lib/nav';
import type { BookPage, TripView } from '../store/derive';
import { toast, useStore } from '../store/store';

/** Simulated preview of the PDF made from the book view (same selection and order). */
export default function PdfPreview({ trip, pages, onClose }: { trip: TripView; pages: BookPage[]; onClose: () => void }) {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const thumbOf = (p: BookPage): Photo | null =>
    p.kind === 'cover' ? trip.cover : p.kind === 'photo' ? p.photo : p.kind === 'memory' ? p.small[0] ?? null : null;
  const labelOf = (p: BookPage) =>
    p.kind === 'cover' ? trip.title : p.kind === 'intro' ? 'Innledning' : p.kind === 'photo' ? p.memTitle : p.kind === 'memory' ? p.mem.title : p.kind === 'places' ? 'Stedene' : 'Slutt';

  const goArchive = () => {
    onClose();
    useStore.setState({ exportSel: 'alt', exportFormat: 'zip', exportStep: 0, exportPct: 0 });
    navigate(paths.export());
  };

  return (
    <div className="scrim" onClick={onClose} style={{ background: 'rgba(46,53,47,.4)', zIndex: 1070, alignItems: 'flex-start' }}>
      <div role="dialog" aria-modal="true" aria-label="Forhåndsvisning av PDF" className="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, padding: 20, gap: 14, marginTop: 24 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <div className="eyebrow">Forhåndsvisning · simulert</div>
            <div className="serif" style={{ fontSize: 24, fontWeight: 500 }}>{trip.title}.pdf</div>
          </div>
          <button onClick={onClose} aria-label="Lukk" className="icon-btn" style={{ fontSize: 22 }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(92px,1fr))', gap: 10 }}>
          {pages.slice(0, 8).map((p, i) => {
            const th = thumbOf(p);
            return (
              <div key={i} className="stack" style={{ gap: 4 }}>
                <div style={{ position: 'relative', aspectRatio: '5 / 7', background: 'var(--cream)', border: '1px solid rgba(46,53,47,.15)', boxShadow: '0 1px 3px rgba(46,53,47,.12)', overflow: 'hidden' }}>
                  {th && <Img photo={th} className="" style={{ position: 'absolute', left: '10%', top: '10%', width: '80%', height: '55%', objectFit: 'cover' }} />}
                  <span style={{ position: 'absolute', left: '10%', right: '10%', bottom: '10%', height: 4, background: 'rgba(46,53,47,.2)', borderRadius: 2 }} />
                  <span style={{ position: 'absolute', left: '10%', right: '30%', bottom: '16%', height: 4, background: 'rgba(46,53,47,.2)', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i + 1} · {labelOf(p)}</span>
              </div>
            );
          })}
        </div>
        <ul className="small muted stack" style={{ margin: 0, paddingLeft: 18, gap: 2 }}>
          <li>{pages.length} sider · A4 stående · samme utvalg og rekkefølge som bokvisningen</li>
          <li>Kommentarer og vurderinger følger valgene i bokvisningen</li>
          <li>Bilder i visningskvalitet. En lesbar PDF er ikke et komplett arkiv.</li>
        </ul>
        <div className="row wrap" style={{ gap: 8 }}>
          <button className="btn btn-primary" style={{ minHeight: 46 }} onClick={() => toast('Simulert: PDF-eksport er et senere utviklingstrinn')}>Last ned PDF (simulert)</button>
          <button className="btn btn-outline clear" style={{ minHeight: 46, whiteSpace: 'normal' }} onClick={goArchive}>Komplett arkiv med originalbilder (ZIP) ›</button>
        </div>
        <p className="xs muted">PDF-eksport er et senere utviklingstrinn. Trykt fotobok, bestilling og betaling er ikke med nå.</p>
      </div>
    </div>
  );
}
