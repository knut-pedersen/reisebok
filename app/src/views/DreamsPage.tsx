import { useNavigate } from 'react-router-dom';
import { Img } from '../components/Photo';
import { paths } from '../lib/nav';
import { usePageTitle } from '../lib/page';
import { addDream, backToDream, removeDream, startDocumenting, toUpcoming, useStore, type DreamForm } from '../store/store';

export default function DreamsPage() {
  const s = useStore();
  const navigate = useNavigate();
  usePageTitle('Drømmer');
  const toggleForm = () => useStore.setState(st => ({ showDreamForm: !st.showDreamForm }));
  const field = (k: keyof DreamForm) => (e: React.ChangeEvent<HTMLInputElement>) => useStore.setState(st => ({ dreamForm: { ...st.dreamForm, [k]: e.target.value } }));
  const start = (id: string) => { const tid = startDocumenting(id); if (tid) navigate(paths.trip(tid, { tab: 'dager' })); };

  return (
    <>
      <div className="row wrap" style={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div><div className="kicker">Dit vi ikke har vært ennå</div><h1 className="lib-title">Drømmer</h1></div>
        <button className="btn btn-primary" onClick={toggleForm}>+ Nytt reisemål</button>
      </div>
      {s.showDreamForm && (
        <div className="card" style={{ padding: 18, marginBottom: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          <label className="field">Hvor<input className="input" value={s.dreamForm.title} onChange={field('title')} placeholder="f.eks. Kyoto" /></label>
          <label className="field">Land eller område<input className="input" value={s.dreamForm.place} onChange={field('place')} placeholder="f.eks. Japan" /></label>
          <label className="field" style={{ gridColumn: '1 / -1' }}>Hvorfor vi vil dit<input className="input" value={s.dreamForm.note} onChange={field('note')} placeholder="Kort notat" /></label>
          <label className="field">Når (valgfritt)<input className="input" value={s.dreamForm.when} onChange={field('when')} placeholder="f.eks. høsten 2027" /></label>
          <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
            <button className="btn btn-dark" onClick={addDream}>Legg til</button>
            <button className="btn btn-ghost" onClick={toggleForm}>Avbryt</button>
          </div>
        </div>
      )}
      <h2 className="h2-lg" style={{ margin: '0 0 12px' }}>Kommende reiser</h2>
      {!s.upcoming.length && <div className="muted" style={{ padding: 28, textAlign: 'center', border: '1px dashed var(--line-strong)', borderRadius: 12, marginBottom: 32 }}>Ingen kommende reiser. Flytt en drøm hit når den begynner å bli alvor.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16, marginBottom: 36 }}>
        {s.upcoming.map(u => (
          <article key={u.id} style={{ background: 'var(--paper)', border: '1px dashed var(--terracotta)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="ph" style={{ aspectRatio: '16 / 9' }}>
              {u.photo && <><Img photo={u.photo} />{u.photo.src && <span className="demo-tag">demo-illustrasjon</span>}</>}
              <span style={{ position: 'absolute', right: 10, top: 10, padding: '3px 10px', borderRadius: 999, background: 'var(--terracotta)', color: 'var(--paper)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Kommende</span>
            </div>
            <div className="stack" style={{ padding: '14px 16px 16px', gap: 6, flex: 1 }}>
              <div className="serif" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.1 }}>{u.title}</div>
              <div className="small muted">{[u.place, u.when || 'Dato ikke lagt inn'].filter(Boolean).join(' · ')}</div>
              <p style={{ margin: '4px 0 8px', fontSize: 14 }}>{u.note}</p>
              <div className="row wrap" style={{ gap: 8, marginTop: 'auto' }}>
                <button className="btn btn-dark btn-sm" onClick={() => start(u.id)}>Begynn å dokumentere</button>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 13, padding: '0 12px' }} onClick={() => backToDream(u.id)}>Tilbake til drøm</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <h2 className="h2-lg" style={{ margin: '0 0 12px' }}>Vi drømmer om</h2>
      {!s.dreams.length && (
        <div style={{ padding: '40px 24px', textAlign: 'center', border: '1px dashed var(--line-strong)', borderRadius: 12 }}>
          <div className="hand" style={{ fontSize: 28, color: 'var(--olive-deep)' }}>Ingen drømmer skrevet ned ennå</div>
          <p className="muted" style={{ fontSize: 14, margin: '6px 0 14px' }}>Et sted, en setning om hvorfor. Det holder.</p>
          <button className="btn btn-primary" onClick={toggleForm}>+ Nytt reisemål</button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
        {s.dreams.map(d => (
          <article key={d.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="ph" style={{ aspectRatio: '4 / 3', background: 'linear-gradient(135deg,#E3D8C6,#C2B39C)' }}>
              {d.photo ? <><Img photo={d.photo} />{d.photo.src && <span className="demo-tag">demo-illustrasjon</span>}</> : <span className="ph-note">bilde kan legges til</span>}
            </div>
            <div className="stack" style={{ padding: '14px 16px 16px', gap: 4, flex: 1 }}>
              <div className="serif" style={{ fontSize: 24, fontWeight: 500, lineHeight: 1.1 }}>{d.title}</div>
              <div className="small muted">{d.place}</div>
              <p className="hand" style={{ margin: '4px 0 6px', fontSize: 20, lineHeight: 1.2 }}>{d.note}</p>
              {d.when && <div className="xs muted">{d.when}</div>}
              <div className="row wrap" style={{ gap: 8, marginTop: 'auto', paddingTop: 8 }}>
                <button className="btn btn-outline clear btn-sm" style={{ fontSize: 13 }} onClick={() => toUpcoming(d.id)}>Gjør til kommende reise</button>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 13, padding: '0 10px' }} aria-label={'Fjern ' + d.title} onClick={() => removeDream(d.id)}>Fjern</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="xs muted" style={{ margin: '28px 0 0' }}>Booking, budsjett og dagsplanlegging ligger utenfor første versjon.</p>
    </>
  );
}
