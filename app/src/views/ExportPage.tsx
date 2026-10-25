import { useNavigate } from 'react-router-dom';
import { BackLink, Dot, Eyebrow } from '../components/bits';
import { PEOPLE } from '../lib/format';
import { paths, useBack } from '../lib/nav';
import { usePageTitle } from '../lib/page';
import { downloadExport, exportFileName, formatSize, lastExport } from '../lib/exportZip';
import { colors, memCard, ratingRows, tripMeta } from '../store/derive';
import { prepareExport, toast, useStore } from '../store/store';

export default function ExportPage() {
  const s = useStore();
  const navigate = useNavigate();
  const back = useBack('/innstillinger');
  usePageTitle('Eksport');
  const trips = s.trips.map(t => tripMeta(s, t));
  const done = trips.filter(t => !t.planned);
  const exportTrip = trips.find(t => t.id === s.exportSel) || null;
  const options = [
    ...done.map(t => ({ id: t.id, label: t.title, sub: t.destLabel + ' · ' + t.dateLabel + ' · ' + t.photoCount + ' bilder' })),
    { id: 'alt', label: 'Hele arkivet', sub: done.length + ' reiser · ' + s.memories.length + ' minner' },
  ];
  const result = s.exportStep >= 2 ? lastExport : null;
  const exportName = result?.name ?? exportFileName(s.exportSel, s.trips);
  const pct = s.exportPct + '%';
  const previewPdf = () => {
    if (s.exportSel === 'alt') { toast('PDF lages per reise. Velg en reise, eller bruk komplett arkiv for alt.'); return; }
    navigate(paths.book(s.exportSel, true));
  };

  const optionList = (
    <div className="stack" style={{ gap: 8 }}>
      {options.map(o => {
        const on = s.exportSel === o.id;
        return (
          <button key={o.id} onClick={() => useStore.setState({ exportSel: o.id })} aria-pressed={on} className="row" style={{ gap: 12, textAlign: 'left', minHeight: 60, padding: '10px 14px', borderRadius: 10, background: 'var(--paper)', border: '1px solid ' + (on ? 'var(--ink)' : 'rgba(46,53,47,.15)') }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              {on && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ink)' }} />}
            </span>
            <span><span style={{ display: 'block', fontWeight: 500 }}>{o.label}</span><span className="xs muted" style={{ display: 'block' }}>{o.sub}</span></span>
          </button>
        );
      })}
    </div>
  );

  // Readable version: the trip, or the whole archive trip by trip.
  const readableTrips = s.exportSel === 'alt' ? done : exportTrip ? [exportTrip] : [];
  const sans = { fontFamily: 'var(--sans)' };

  return (
    <>
      {!s.isMobile && <BackLink onClick={back} />}
      <div className="stack" style={{ maxWidth: 720, gap: 18 }}>
        <h1 className="page-title">Last ned reisebok</h1>
        <div role="tablist" className="segmented" style={{ alignSelf: 'flex-start' }}>
          {([['pdf', 'Lesbar PDF'], ['zip', 'Komplett arkiv (ZIP)']] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={s.exportFormat === id} onClick={() => useStore.setState({ exportFormat: id, exportStep: 0 })}>{label}</button>
          ))}
        </div>
        {s.exportFormat === 'pdf' ? (
          <>
            <p className="muted" style={{ fontSize: 14 }}>En lesbar PDF av bokvisningen: omslag, innledning, utvalgte minner og fremhevede bilder i visningskvalitet. Den er ikke et komplett arkiv – originalbildene ligger i ZIP-eksporten.</p>
            {optionList}
            <button className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }} onClick={previewPdf}>Forhåndsvis PDF</button>
          </>
        ) : (
          <>
            {s.exportStep === 0 && (
              <>
                {optionList}
                <div className="card small muted" style={{ padding: '14px 16px' }}>
                  <strong style={{ color: 'var(--ink)' }}>Innhold i ZIP-filen</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <li><code>originaler/</code> – originalbildene slik de ble lastet opp</li>
                    <li><code>reisebok.html</code> – lesbar versjon med tekst, bildetekster og vurderinger</li>
                    <li><code>data.json</code> – strukturerte data: datoer, steder, forfattere, vurderinger</li>
                  </ul>
                </div>
                {s.exportError && <p className="small" role="alert" style={{ color: 'var(--terracotta)' }}>{s.exportError}</p>}
                <button className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }} onClick={prepareExport}>{s.exportError ? 'Prøv igjen' : 'Forbered eksport'}</button>
                <p className="xs muted">Filen lages på denne telefonen. Bilder som ikke ligger her, hentes fra det felles arkivet, så det trengs nett. Lagre filen et trygt sted, for eksempel på en PC eller i en skylagring dere eier.</p>
              </>
            )}
            {s.exportStep === 1 && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 600 }} role="status">Henter bilder og pakker {s.exportSel === 'alt' ? 'hele arkivet' : exportTrip?.title} … {pct}</div>
                <div className="progress" style={{ marginTop: 10 }}><div style={{ width: pct, transition: 'width .2s' }} /></div>
              </div>
            )}
            {s.exportStep === 2 && (
              <div className="card stack" style={{ padding: 16, gap: 10 }}>
                <div className="row" style={{ gap: 8, fontWeight: 600, color: colors.oliveDeep }}><Dot color={colors.oliveDeep} size={10} />Klar til nedlasting</div>
                <div className="mono small muted">{exportName}{result ? ' · ' + formatSize(result.blob.size) + ' · ' + result.photos + (result.photos === 1 ? ' bilde' : ' bilder') : ''}</div>
                {result && result.missing.length > 0 && (
                  <p className="small" style={{ color: 'var(--amber)' }}>
                    {result.missing.length} {result.missing.length === 1 ? 'bilde kunne' : 'bilder kunne'} ikke hentes og mangler i filen (listet i MANGLER.txt). Illustrasjonsbilder fra internett og bilder som ikke er lastet opp ennå, kan mangle uten nett.
                  </p>
                )}
                <div className="row wrap" style={{ gap: 8 }}>
                  <button className="btn btn-primary" disabled={!result} onClick={() => result && downloadExport(result)}>Last ned ZIP</button>
                  <button className="btn btn-outline clear" onClick={() => useStore.setState({ exportStep: 3 })}>Vis lesbar versjon</button>
                  <button className="btn btn-ghost" onClick={() => useStore.setState({ exportStep: 0 })}>Lag en ny</button>
                </div>
                {!result && <p className="xs muted">Filen er ikke lenger i minnet. Trykk «Lag en ny».</p>}
                <p className="xs muted">Filen inneholder originalbildene, en lesbar reisebok.html som kan åpnes i hvilken som helst nettleser (og skrives ut som PDF), og data.json med alle datoer, steder, forfattere og vurderinger.</p>
              </div>
            )}
            {s.exportStep === 3 && (
              <>
                <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => useStore.setState({ exportStep: 2 })}>‹ Tilbake til eksport</button>
                <article className="serif" style={{ background: 'var(--paper)', border: '1px solid rgba(46,53,47,.15)', padding: s.isMobile ? '28px 20px' : '40px 36px', boxShadow: '0 2px 12px rgba(46,53,47,.08)' }}>
                  <div className="eyebrow" style={sans}>reisebok.html · Knut &amp; Anna</div>
                  {readableTrips.map((t, ti) => (
                    <div key={t.id} style={{ marginTop: ti ? 36 : 0 }}>
                      <h2 style={{ fontWeight: 500, fontSize: 36, lineHeight: 1.05, margin: '6px 0 4px' }}>{t.title}</h2>
                      <div className="muted" style={{ ...sans, fontSize: 14, marginBottom: 20 }}>{t.destLabel} · {t.dateLabel}</div>
                      {t.intro && <p style={{ fontStyle: 'italic', fontSize: 20, margin: '0 0 24px' }}>{t.intro}</p>}
                      {s.memories.filter(m => m.tripId === t.id).map(m => {
                        const c = memCard(s, m);
                        const captions = m.photos.map(p => p.caption).filter(Boolean).join(' · ');
                        const ratings = m.visit ? ratingRows(s, m).filter(r => r.rated || r.text) : [];
                        return (
                          <section key={m.id} style={{ borderTop: '1px solid var(--line)', padding: '16px 0' }}>
                            <Eyebrow style={sans}>{c.dateLabel} · {c.typeLabel}{c.hasPlace ? ' · ' + c.placeName : ''}</Eyebrow>
                            <h3 style={{ fontWeight: 500, fontSize: 24, margin: '4px 0 8px' }}>{m.title}</h3>
                            {m.text && <p style={{ margin: '0 0 8px', fontSize: 17, lineHeight: 1.5 }}>{m.text}</p>}
                            {captions && <div className="muted" style={{ ...sans, fontSize: 13 }}>Bilder ({m.photos.length}): {captions}</div>}
                            {m.comments.map((cm, i) => <div key={i} style={{ ...sans, fontSize: 14, marginTop: 6 }}><strong>{PEOPLE[cm.by].name}:</strong> {cm.text}</div>)}
                            {ratings.map(r => (
                              <div key={r.id} style={{ ...sans, fontSize: 14, marginTop: 4 }}>
                                <strong>{r.name}s vurdering:</strong> <span style={{ color: 'var(--terracotta)' }}>{r.stars}</span> {!r.rated && <em>Ikke vurdert</em>} {r.text}
                              </div>
                            ))}
                          </section>
                        );
                      })}
                    </div>
                  ))}
                  <p className="muted" style={{ ...sans, fontSize: 12, margin: '20px 0 0' }}>Eksportert fra «Vår reisebok». Strukturerte data ligger i data.json, originalbildene i mappen originaler/.</p>
                </article>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
