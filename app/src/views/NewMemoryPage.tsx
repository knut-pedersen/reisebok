import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackLink, Dot } from '../components/bits';
import { Img } from '../components/Photo';
import type { MemType } from '../data/types';
import { PEOPLE, TYPES } from '../lib/format';
import { paths, useBack } from '../lib/nav';
import { usePageTitle } from '../lib/page';
import { colors, tripMeta } from '../store/derive';
import { addDemoMemPhotos, addMemFiles, isOnline, resetMemForm, retrySave, saveMemory, useStore, type NewMemForm, type SaveStatus } from '../store/store';

const PHASE_COLOR: Record<SaveStatus['phase'], string> = { lagrer: colors.amber, lokalt: colors.oliveDeep, venter: colors.amber, laster: colors.terracotta, synk: colors.oliveDeep, feil: colors.terracotta };
const PRECISIONS: [NewMemForm['precision'], string][] = [['dag', 'Dag'], ['maned', 'Bare måned'], ['ukjent', 'Ukjent']];
const WRITE: [NewMemForm['writeStatus'], string][] = [['arbeid', 'Under arbeid'], ['ferdig', 'Ferdig']];

export default function NewMemoryPage() {
  const s = useStore();
  const navigate = useNavigate();
  const back = useBack('/reiser');
  const fileRef = useRef<HTMLInputElement>(null);
  usePageTitle('Nytt minne');
  const f = s.newMem;
  const upd = (patch: Partial<NewMemForm>) => useStore.setState(st => ({ newMem: { ...st.newMem, ...patch } }));
  const meName = PEOPLE[s.user].name;
  const online = isOnline(s);

  const st = s.saveStatus;
  const color = st ? PHASE_COLOR[st.phase] : '';
  const isSaved = !!st && ['lokalt', 'venter', 'laster', 'synk'].includes(st.phase);
  const saved = f.savedId ? s.memories.find(m => m.id === f.savedId) : undefined;
  const savedTrip = saved ? s.trips.find(t => t.id === saved.tripId) : undefined;
  const savedDayIdx = saved && savedTrip ? savedTrip.days.findIndex(d => d.date === saved.date) : -1;

  const trips = s.trips.map(t => tripMeta(s, t));
  const places = s.places.filter(p => p.kind === 'place');
  const types = (Object.keys(TYPES) as MemType[]).filter(k => k !== 'severdighet');
  const chipStyle = { minHeight: 40, fontSize: 14 } as const;

  return (
    <>
      {!s.isMobile && <BackLink onClick={back} />}
      <div className="stack" style={{ maxWidth: 640, gap: 16 }}>
        <h1 className="page-title">Nytt minne</h1>
        {st && (
          <div role="status" aria-live="polite" className="stack" style={{ background: 'var(--paper)', borderRadius: 12, padding: '14px 16px', gap: 6, border: '1px solid ' + color }}>
            <div className="row" style={{ gap: 8, fontWeight: 600, color }}><Dot color={color} size={10} />{st.label}</div>
            {st.detail && <div className="small muted">{st.detail}</div>}
            {saved && isSaved && (
              <div className="xs muted">Skrivestatus: <strong style={{ color: 'var(--ink)' }}>{saved.writeStatus === 'arbeid' ? 'Under arbeid' : 'Ferdig'}</strong> – uavhengig av lagringen. Minnet er lagt til én gang og vises i historien, på dagen og på kartet når sted og dato er kjent.</div>
            )}
            <div className="row wrap" style={{ gap: 8 }}>
              {st.canRetry && <button className="btn btn-primary btn-sm" onClick={retrySave}>Prøv igjen</button>}
              {isSaved && saved && (
                <>
                  <button className="btn btn-outline clear btn-sm" onClick={() => navigate(paths.memory(saved.id))}>Åpne minnet</button>
                  <button className="btn btn-outline clear btn-sm" onClick={() => navigate(paths.trip(saved.tripId, { mem: saved.id }))}>Se i historien</button>
                  {savedDayIdx >= 0 && <button className="btn btn-outline clear btn-sm" onClick={() => navigate(paths.day(saved.tripId, savedDayIdx))}>Se dagen</button>}
                  {!!saved.placeId && <button className="btn btn-outline clear btn-sm" onClick={() => navigate(paths.trip(saved.tripId, { tab: 'steder', vis: 'kart', mem: saved.id }))}>Se på kartet</button>}
                  <button className="btn btn-ghost btn-sm" onClick={resetMemForm}>Nytt minne</button>
                </>
              )}
            </div>
          </div>
        )}
        <label className="field">Tittel<input className="input serif-lg" value={f.title} onChange={e => upd({ title: e.target.value })} placeholder="f.eks. Kaffe på torget" /></label>
        <div role="group" aria-label="Type">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Type</div>
          <div className="row wrap" style={{ gap: 6 }}>
            {types.map(k => <button key={k} className="chip paper" style={chipStyle} aria-pressed={f.type === k} onClick={() => upd({ type: k })}>{TYPES[k].label}</button>)}
          </div>
        </div>
        <div className="row wrap" style={{ gap: 20, alignItems: 'flex-start' }}>
          <div role="group" aria-label="Hvor godt kjenner dere datoen?">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Hvor godt kjenner dere datoen?</div>
            <div className="row wrap" style={{ gap: 6 }}>
              {PRECISIONS.map(([id, label]) => <button key={id} className="chip paper" style={chipStyle} aria-pressed={f.precision === id} onClick={() => upd({ precision: id })}>{label}</button>)}
            </div>
          </div>
          <div role="group" aria-label="Skrivestatus">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Skrivestatus</div>
            <div className="row wrap" style={{ gap: 6 }}>
              {WRITE.map(([id, label]) => <button key={id} className="chip paper" style={chipStyle} aria-pressed={f.writeStatus === id} onClick={() => upd({ writeStatus: id })}>{label}</button>)}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <label className="field">Reise
            <select className="input" value={f.tripId} onChange={e => upd({ tripId: e.target.value })}>
              {trips.map(t => <option key={t.id} value={t.id}>{t.title + ' · ' + t.dateLabel}</option>)}
            </select>
          </label>
          {f.precision === 'dag' && <label className="field">Dato<input className="input" type="date" value={f.date} onChange={e => upd({ date: e.target.value })} /></label>}
          {f.precision === 'maned' && <label className="field">Måned<input className="input" type="month" value={f.month} onChange={e => upd({ month: e.target.value })} /></label>}
          <label className="field">Sted (valgfritt)
            <select className="input" value={f.placeId} onChange={e => upd({ placeId: e.target.value })}>
              <option value="">Ikke noe sted</option>
              {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>
        <label className="field">Felles tekst<textarea className="input" rows={5} value={f.text} onChange={e => upd({ text: e.target.value })} placeholder="Hva skjedde? Skriv på norsk eller svensk." /></label>
        <div>
          <div className="row" style={{ justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Bilder ({f.photos.length})</span>
            {f.photos.length > 0 && <button onClick={() => upd({ photos: [] })} style={{ border: 0, background: 'transparent', fontSize: 13, color: 'var(--muted)' }}>Fjern alle</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden="true"
            onChange={e => { const fs = Array.from(e.target.files || []); e.target.value = ''; if (fs.length) addMemFiles(fs); }} />
          <div className="row wrap" style={{ gap: 8 }}>
            {f.photos.slice(0, 6).map(p => (
              <span key={p.id} style={{ position: 'relative', width: 56, height: 56, borderRadius: 6, overflow: 'hidden', background: '#D9CBB6', display: 'inline-block' }}><Img photo={p} /></span>
            ))}
            {f.photos.length > 6 && <span className="small muted">+{f.photos.length - 6}</span>}
            <button className="btn btn-outline" style={{ padding: '0 14px', fontSize: 14 }} onClick={() => fileRef.current?.click()}>Velg fra telefonen</button>
            <button className="btn" style={{ padding: '0 14px', fontSize: 14, fontWeight: 500, color: 'var(--terracotta)' }} onClick={addDemoMemPhotos}>Legg ved 12 demobilder</button>
          </div>
        </div>
        <label className="field">Din egen kommentar, {meName} (valgfritt)<input className="input hand" style={{ fontSize: 20 }} value={f.comment} onChange={e => upd({ comment: e.target.value })} placeholder="Bare din, men synlig for begge" /></label>
        <div className="row wrap" style={{ gap: 8 }}>
          <button className="btn btn-primary btn-lg" onClick={() => saveMemory()} disabled={st?.phase === 'lagrer'}>Lagre minnet</button>
          {!online && <span style={{ fontSize: 13, color: colors.amber, fontWeight: 500 }}>Uten nett – lagres på telefonen først</span>}
        </div>
      </div>
    </>
  );
}
