import { useNavigate } from 'react-router-dom';
import { BackLink } from '../components/bits';
import type { TripPrecision } from '../data/types';
import { paths, useBack } from '../lib/nav';
import { usePageTitle } from '../lib/page';
import { createTrip, useStore, type NewTripForm } from '../store/store';

const PRECISIONS: [TripPrecision, string][] = [['dag', 'Dag'], ['maned', 'Måned og år'], ['ar', 'Bare år'], ['ukjent', 'Ukjent']];

export default function NewTripPage() {
  const isMobile = useStore(s => s.isMobile);
  const f = useStore(s => s.newTrip);
  const navigate = useNavigate();
  const back = useBack('/reiser');
  usePageTitle('Ny reise');
  const upd = (patch: Partial<NewTripForm>) => useStore.setState(s => ({ newTrip: { ...s.newTrip, ...patch } }));
  const create = () => { const id = createTrip(); if (id) navigate(paths.trip(id, { tab: 'dager' }), { replace: true }); };
  const startLabel = f.precision === 'dag' ? 'Fra' : f.precision === 'maned' ? 'Måned' : 'År';
  const startType = f.precision === 'dag' ? 'date' : f.precision === 'maned' ? 'month' : 'number';

  return (
    <>
      {!isMobile && <BackLink onClick={back} />}
      <div className="stack" style={{ maxWidth: 560, gap: 16 }}>
        <h1 className="page-title">Ny reise</h1>
        <label className="field">Tittel<input className="input serif-lg" value={f.title} onChange={e => upd({ title: e.target.value })} placeholder="f.eks. Høstferie i Lisboa" /></label>
        <label className="field">Destinasjon(er)<input className="input" value={f.dest} onChange={e => upd({ dest: e.target.value })} placeholder="f.eks. Lisboa, Sintra" /></label>
        <div role="group" aria-label="Hvor nøyaktig husker dere tidspunktet?">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Hvor nøyaktig husker dere tidspunktet?</div>
          <div className="row wrap" style={{ gap: 6 }}>
            {PRECISIONS.map(([id, label]) => (
              <button key={id} className="chip chip-lg paper" aria-pressed={f.precision === id} onClick={() => upd({ precision: id, start: '' })}>{label}</button>
            ))}
          </div>
        </div>
        {f.precision !== 'ukjent' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
            <label className="field">{startLabel}<input className="input" type={startType} value={f.start} onChange={e => upd({ start: e.target.value })} placeholder={f.precision === 'ar' ? 'f.eks. 2019' : ''} min={f.precision === 'ar' ? 1900 : undefined} max={f.precision === 'ar' ? 2100 : undefined} /></label>
            {f.precision === 'dag' && <label className="field">Til<input className="input" type="date" value={f.end} min={f.start || undefined} onChange={e => upd({ end: e.target.value })} /></label>}
          </div>
        )}
        <p className="small muted">Forsidebilde og innledning kan legges til senere. Reisen lagres først på denne telefonen.</p>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-primary btn-lg" onClick={create}>Opprett reisen</button>
          <button className="btn btn-ghost btn-lg" style={{ padding: '0 14px' }} onClick={back}>Avbryt</button>
        </div>
      </div>
    </>
  );
}
