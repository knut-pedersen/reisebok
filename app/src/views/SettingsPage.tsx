import { useNavigate } from 'react-router-dom';
import { Avatar, BackLink, Dot } from '../components/bits';
import { resetAll } from '../lib/db';
import { PEOPLE, fmtTime, otherPerson } from '../lib/format';
import { paths, useBack } from '../lib/nav';
import { usePageTitle } from '../lib/page';
import { queueStatus, tripMeta } from '../store/derive';
import { logout, openExport, removeOffline, startOffline, switchUser, useStore } from '../store/store';

const scopeLabel = { visning: 'visningskopier', alle: 'alle originalbilder', tekst: 'bare tekst' };

export default function SettingsPage() {
  const s = useStore();
  const navigate = useNavigate();
  const back = useBack('/');
  usePageTitle('Innstillinger');
  const qs = queueStatus(s);
  const me = PEOPLE[s.user], other = PEOPLE[otherPerson(s.user)];
  const pending = s.queue.filter(i => i.status !== 'synk').length;
  const reset = async () => {
    if (!confirm('Tilbakestille til demoinnholdet? Alt som er lagt til på denne telefonen slettes.')) return;
    await resetAll();
    location.reload();
  };
  const section = { padding: 16 } as const;

  return (
    <>
      {!s.isMobile && <BackLink onClick={back} />}
      <div className="stack" style={{ maxWidth: 720, gap: 24 }}>
        <h1 className="page-title">Innstillinger</h1>
        <section className="card" style={section}>
          <h2 className="h2" style={{ margin: '0 0 12px' }}>Våre profiler</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            {[{ who: 'knut' as const, sub: 'Egen innlogging · skriver på norsk' }, { who: 'anna' as const, sub: 'Egen innlogging · skriver på svensk' }].map(p => (
              <div key={p.who} className="row" style={{ gap: 12, padding: 12, borderRadius: 10, background: 'var(--cream)' }}>
                <Avatar who={p.who} size={40} style={{ fontSize: 15 }} />
                <span><span style={{ display: 'block', fontWeight: 600 }}>{PEOPLE[p.who].name}</span><span className="xs muted" style={{ display: 'block' }}>{p.sub}</span></span>
              </div>
            ))}
          </div>
          <p style={{ margin: '12px 0 10px', fontSize: 14 }}>Du er logget inn som <strong>{me.name}</strong>. Ett felles arkiv, privat for dere to – ingen offentlig deling eller følgere.</p>
          <div className="row wrap" style={{ gap: 8 }}>
            <button className="btn btn-outline clear btn-sm" onClick={switchUser}>Bytt til {other.name} (simulert)</button>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Logg ut</button>
          </div>
        </section>
        <section className="card" style={section}>
          <h2 className="h2" style={{ margin: '0 0 8px' }}>Synkronisering</h2>
          <div className="row" style={{ gap: 8, fontWeight: 600, color: qs.tone }}><Dot color={qs.tone} size={10} />{qs.label}</div>
          <p className="small muted" style={{ margin: '6px 0 10px' }}>Siste vellykkede synkronisering: {fmtTime(s.lastSync)} · {pending} venter. Synkronisering og sikkerhetskopiering er forskjellige funksjoner; lokal lagring er ingen sikkerhetskopi.</p>
          <button className="btn btn-outline clear btn-sm" onClick={() => useStore.setState({ syncOpen: true })}>Vis køen og simuler tilstander</button>
        </section>
        <section className="card" style={section}>
          <h2 className="h2" style={{ margin: '0 0 4px' }}>Tilgjengelig offline</h2>
          <p className="small muted" style={{ margin: '0 0 10px' }}>Bare nedlastet innhold vises uten nett. Kart krever nett i første versjon.</p>
          {s.trips.map(t0 => {
            const t = tripMeta(s, t0);
            const dl = s.offlineDl[t.id];
            const ready = dl?.status === 'klar';
            const label = dl ? (ready ? 'Tilgjengelig · ' + scopeLabel[dl.scope] : dl.status === 'pause' ? 'Pause – venter på nett' : dl.pct + ' %') : 'Ikke lastet ned';
            return (
              <div key={t.id} className="row wrap" style={{ gap: 12, padding: '10px 0', borderTop: '1px solid rgba(46,53,47,.08)' }}>
                <span style={{ flex: 1, minWidth: 160 }}><span style={{ display: 'block', fontWeight: 500 }}>{t.title}</span><span className="xs muted" style={{ display: 'block' }}>{label}</span></span>
                {ready
                  ? <button className="btn btn-sm" style={{ padding: '0 12px', fontSize: 13, color: 'var(--terracotta)', fontWeight: 500 }} onClick={() => removeOffline(t.id)}>Fjern</button>
                  : <button className="btn btn-outline clear btn-sm" style={{ padding: '0 12px', fontSize: 13 }} onClick={() => startOffline(t.id, 'visning')}>Last ned visningskopier</button>}
              </div>
            );
          })}
        </section>
        <section className="card" style={section}>
          <h2 className="h2" style={{ margin: '0 0 4px' }}>Eksport</h2>
          <p className="small muted" style={{ margin: '0 0 10px' }}>Last ned én reise eller hele arkivet: originalbilder, tekst, bildetekster, datoer, steder, forfattere og vurderinger i åpne formater.</p>
          <button className="btn btn-dark" style={{ fontSize: 14, padding: '0 16px' }} onClick={() => { openExport(null); navigate(paths.export()); }}>Last ned reisebok</button>
        </section>
        <button onClick={() => navigate(paths.about())} className="row" style={{ textAlign: 'left', border: '1px dashed var(--line-strong)', borderRadius: 12, padding: '14px 16px', background: 'transparent', justifyContent: 'space-between', gap: 12 }}>
          <span><span style={{ display: 'block', fontWeight: 600 }}>Om appen</span><span className="small muted" style={{ display: 'block' }}>Designvalg, hva som kan testes, hva som er simulert, tekniske spørsmål</span></span>
          <span style={{ color: 'var(--faint)', fontSize: 18 }}>›</span>
        </button>
        <div>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 13, padding: 0 }} onClick={reset}>Tilbakestill demoinnhold</button>
        </div>
      </div>
    </>
  );
}
