import { removeOffline, resumeOffline, startOffline, useStore } from '../../store/store';

const scopeLabel = { visning: 'visningskopier', alle: 'alle originalbilder', tekst: 'bare tekst' };
const pickBtn = { textAlign: 'left' as const, minHeight: 44, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(46,53,47,.2)', background: 'var(--cream)', fontSize: 13 };

/** «Offline på denne telefonen»: download a trip with a chosen photo scope. */
export default function OfflineBox({ tripId }: { tripId: string }) {
  const od = useStore(s => s.offlineDl[tripId]);
  const picking = useStore(s => s.offlinePick === tripId);
  const label = od ? (od.status === 'klar' ? 'Tilgjengelig offline · ' + scopeLabel[od.scope] : od.status === 'pause' ? 'Nedlasting satt på pause – venter på nett' : 'Laster ned … ' + od.pct + ' %') : 'Ikke tilgjengelig offline';
  const smallOutline = { minHeight: 40, padding: '0 14px', borderRadius: 999, border: '1px solid var(--line-strong)', background: 'transparent', fontWeight: 500, fontSize: 13 };
  return (
    <div className="card stack" style={{ padding: '14px 16px', gap: 8 }}>
      <div className="eyebrow">Offline på denne telefonen</div>
      <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
      {od?.status === 'laster' && <div style={{ height: 6, borderRadius: 3, background: 'rgba(46,53,47,.1)', overflow: 'hidden' }}><div style={{ height: '100%', background: 'var(--olive)', transition: 'width .25s', width: od.pct + '%' }} /></div>}
      {od?.status === 'pause' && <button onClick={() => resumeOffline(tripId)} style={{ ...smallOutline, alignSelf: 'flex-start' }}>Fortsett nedlasting</button>}
      {od?.status === 'klar' && (
        <>
          <p className="xs muted">Bare det nedlastede innholdet vises uten nett. Kartfliser er ikke med.</p>
          <button onClick={() => removeOffline(tripId)} style={{ alignSelf: 'flex-start', minHeight: 36, padding: '0 12px', borderRadius: 999, border: 0, background: 'transparent', fontSize: 13, color: 'var(--terracotta)', fontWeight: 500 }}>Fjern fra telefonen</button>
        </>
      )}
      {!od && !picking && <button onClick={() => useStore.setState({ offlinePick: tripId })} style={{ ...smallOutline, alignSelf: 'flex-start' }}>Gjør tilgjengelig offline</button>}
      {picking && (
        <>
          <div className="small muted">Hvor mye skal lastes ned?</div>
          <button onClick={() => startOffline(tripId, 'visning')} style={pickBtn}><strong>Visningskopier</strong> · raske bilder, ca. 40 MB</button>
          <button onClick={() => startOffline(tripId, 'alle')} style={pickBtn}><strong>Alle originalbilder</strong> · ca. 1,2 GB</button>
          <button onClick={() => startOffline(tripId, 'tekst')} style={pickBtn}><strong>Bare tekst</strong> · under 1 MB</button>
          <button onClick={() => useStore.setState({ offlinePick: null })} style={{ minHeight: 36, border: 0, background: 'transparent', fontSize: 13, color: 'var(--muted)', alignSelf: 'flex-start' }}>Avbryt</button>
        </>
      )}
    </div>
  );
}
