import { useEffect, useState } from 'react';
import { Link, useNavigate, useNavigationType, useParams, useSearchParams } from 'react-router-dom';
import { Avatar, BackLink, Empty } from '../components/bits';
import ConfirmDialog, { DeleteLink } from '../components/ConfirmDialog';
import { Img } from '../components/Photo';
import { fmtTime, PEOPLE } from '../lib/format';
import { paths, useBack, type TripTab } from '../lib/nav';
import { scrollToMem, usePageTitle } from '../lib/page';
import { tripMeta } from '../store/derive';
import { deleteTrip, openExport, resolveConflict, startImport, startMemory, useStore } from '../store/store';
import { DaysTab, PhotosTab } from './trip/DaysPhotosTabs';
import OfflineBox from './trip/OfflineBox';
import PlacesTab from './trip/PlacesTab';
import StoryTab from './trip/StoryTab';

const TABS: [TripTab, string][] = [['historien', 'Historien'], ['dager', 'Dager'], ['steder', 'Steder'], ['bilder', 'Bilder']];

export default function TripPage() {
  const { tripId = '' } = useParams();
  const s = useStore();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const back = useBack(paths.trips());
  const [sp, setSp] = useSearchParams();
  const raw = s.trips.find(t => t.id === tripId);
  usePageTitle(raw?.title ?? 'Reise');

  const tab = (TABS.some(([id]) => id === sp.get('fane')) ? sp.get('fane') : 'historien') as TripTab;
  const selMem = sp.get('minne');
  const vis = sp.get('vis') === 'kart' ? 'kart' : 'tidslinje';
  const update = (patch: { fane?: TripTab; minne?: string | null; vis?: 'kart' | 'tidslinje' }) =>
    setSp(prev => {
      const n = new URLSearchParams(prev);
      if (patch.fane !== undefined) { if (patch.fane === 'historien') n.delete('fane'); else n.set('fane', patch.fane); }
      if (patch.minne !== undefined) { if (patch.minne) n.set('minne', patch.minne); else n.delete('minne'); }
      if (patch.vis !== undefined) { if (patch.vis === 'tidslinje') n.delete('vis'); else n.set('vis', patch.vis); }
      return n;
    }, { replace: true });

  // Arriving from «Se i historien» or «Vis på kartet» elsewhere: bring the memory into view.
  useEffect(() => {
    if (navType !== 'POP' && selMem) scrollToMem(selMem);
  }, [tripId]);

  const [conflictOpen, setConflictOpen] = useState(false);
  const [mergeText, setMergeText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!raw) {
    return <Empty title="Fant ikke reisen"><p style={{ marginTop: 10 }}><Link to={paths.trips()}>Til alle reiser</Link></p></Empty>;
  }
  const trip = tripMeta(s, raw);
  const isM = s.isMobile;
  const me = PEOPLE[s.user];
  const conflict = raw.conflict ? { ...raw.conflict, author: PEOPLE[raw.conflict.by] } : null;

  const setTab = (t: TripTab) => { update({ fane: t }); if (selMem && (t === 'historien' || t === 'steder')) scrollToMem(selMem); };
  const addMemory = () => { startMemory(trip.id); navigate(paths.newMemory()); };
  const continueWriting = () => setTab('dager');
  const openBook = () => navigate(paths.book(trip.id));
  const goImport = () => { startImport(trip.id); navigate(paths.import()); };
  const openMem = (id: string) => navigate(paths.memory(id));
  const showOnMap = (id: string) => { update({ fane: 'steder', vis: 'kart', minne: id }); scrollToMem(id); };
  const inStory = (id: string) => { update({ fane: 'historien', minne: id }); scrollToMem(id); };
  const resolve = (text: string) => { resolveConflict(trip.id, text); setConflictOpen(false); };
  const showAside = !isM && tab !== 'steder';
  const mutedSmall = { minHeight: 38, padding: '0 12px', borderRadius: 999, border: '1px solid var(--line-strong)', background: 'transparent', fontSize: 13, fontWeight: 500 };

  return (
    <>
      {!isM && <BackLink onClick={back} />}
      <section className="ph" style={{ borderRadius: 14, height: isM ? 300 : 440, color: 'var(--paper)' }}>
        {trip.cover && <Img photo={trip.cover} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(46,53,47,.82) 0%,rgba(46,53,47,.25) 55%,rgba(46,53,47,.05) 100%)' }} />
        {trip.cover?.src && <span className="demo-tag" style={{ left: 'auto', bottom: 'auto', right: 12, top: 12 }}>demo-illustrasjon</span>}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '20px 22px 22px' }}>
          <div style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600, opacity: 0.9 }}>{trip.dateLabel}</div>
          <h1 className="serif" style={{ fontWeight: 500, lineHeight: 1, margin: '6px 0 8px', letterSpacing: '-.01em', fontSize: isM ? 34 : 56, textWrap: 'balance' }}>{trip.title}</h1>
          <div className="row wrap" style={{ gap: 10, fontSize: 14 }}>
            <span>{trip.destLabel}</span>
            {trip.unfinished && <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(255,252,246,.18)', border: '1px solid rgba(255,252,246,.5)', fontSize: 12, fontWeight: 600 }}>{trip.statusLabel}</span>}
          </div>
        </div>
      </section>

      {conflict && (
        <>
          <div className="row wrap" style={{ marginTop: 16, background: 'var(--paper)', border: '1px solid var(--terracotta)', borderRadius: 10, padding: '14px 16px', gap: 12, alignItems: 'flex-start' }}>
            <Avatar who={conflict.author} size={26} />
            <div style={{ flex: 1, minWidth: 200, fontSize: 14 }}><strong>{conflict.author.name} endret innledningen samtidig som deg</strong> ({fmtTime(conflict.at)}). Begge versjonene er beholdt. Sammenlign før dere lagrer en felles versjon.</div>
            <button className="btn btn-primary btn-sm" onClick={() => { setConflictOpen(true); setMergeText(conflict.theirs); }}>Sammenlign</button>
          </div>
          {conflictOpen && (
            <div className="card-sm fade" style={{ marginTop: 10, padding: 16, borderColor: 'rgba(46,53,47,.15)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
                <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>Din versjon ({me.name})</div>
                  <p className="serif" style={{ margin: '0 0 10px', fontSize: 17 }}>{conflict.mine}</p>
                  <button style={mutedSmall} onClick={() => resolve(conflict.mine)}>Behold min</button>
                </div>
                <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>{conflict.author.name}s versjon</div>
                  <p className="serif" style={{ margin: '0 0 10px', fontSize: 17 }}>{conflict.theirs}</p>
                  <button style={mutedSmall} onClick={() => resolve(conflict.theirs)}>Behold {conflict.author.name}s</button>
                </div>
              </div>
              <div className="eyebrow" style={{ margin: '14px 0 6px' }}>Eller skriv en felles versjon</div>
              <textarea className="input" rows={3} value={mergeText} onChange={e => setMergeText(e.target.value)} aria-label="Felles versjon" style={{ padding: '10px 12px', fontSize: 17 }} />
              <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
                <button className="btn btn-dark btn-sm" style={{ padding: '0 16px' }} onClick={() => resolve(mergeText)}>Lagre felles versjon</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConflictOpen(false)}>Avbryt</button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="row wrap" style={{ gap: 8, margin: '16px 0 8px' }}>
        <button className="btn btn-primary" onClick={addMemory}>+ Legg til minne</button>
        {trip.unfinished && <button className="btn btn-outline" onClick={continueWriting}>Fortsett å skrive</button>}
        <button className="btn btn-dark" onClick={openBook}>Se som reisebok</button>
        <button className="btn btn-outline" onClick={goImport}>Legg til bilder</button>
        <button className="btn btn-outline" onClick={() => { openExport(trip.id); navigate(paths.export()); }}>Eksporter</button>
      </div>

      <div style={{ display: 'grid', gap: 32, alignItems: 'start', marginTop: 12, gridTemplateColumns: tab === 'steder' || isM ? 'minmax(0,1fr)' : 'minmax(0,1fr) 300px' }}>
        <div style={{ minWidth: 0 }}>
          {trip.intro && <p className="serif" style={{ fontStyle: 'italic', fontSize: 22, lineHeight: 1.35, margin: '4px 0 20px', textWrap: 'pretty' }}>{trip.intro}</p>}
          <div role="tablist" className="row" style={{ gap: 4, borderBottom: '1px solid rgba(46,53,47,.15)', marginBottom: 24, position: 'sticky', top: 0, background: 'var(--cream)', zIndex: 500, overflowX: 'auto' }}>
            {TABS.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                style={{ minHeight: 46, padding: '0 14px', border: 0, background: 'transparent', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', borderBottom: tab === id ? '2px solid var(--terracotta)' : '2px solid transparent', color: tab === id ? 'var(--ink)' : 'var(--muted)', marginBottom: -1 }}>{label}</button>
            ))}
          </div>
          {tab === 'historien' && <StoryTab s={s} trip={trip} selMem={selMem} onAddMemory={addMemory} onContinue={continueWriting} onOpenMem={openMem} onShowOnMap={showOnMap} />}
          {tab === 'dager' && <DaysTab s={s} trip={trip} onOpenDay={i => navigate(paths.day(trip.id, i))} onOpenMem={openMem} onAddMemory={addMemory} />}
          {tab === 'steder' && (
            <PlacesTab s={s} trip={trip} selMem={selMem} vis={vis}
              onSelect={id => update({ minne: id })}
              onVis={v => { update({ vis: v }); if (selMem) scrollToMem(selMem); }}
              onOpenMem={openMem} onInStory={inStory} />
          )}
          {tab === 'bilder' && <PhotosTab s={s} trip={trip} onOpenBook={openBook} onImport={goImport} />}
        </div>
        {showAside && (
          <aside className="stack" style={{ position: 'sticky', top: 0, gap: 12 }}>
            <div className="card" style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([[trip.memCount, 'minner'], [trip.photoCount, 'bilder'], [trip.placeCount, 'steder'], [trip.days.length, 'dager']] as const).map(([n, l]) => (
                <div key={l}><div className="serif" style={{ fontSize: 28, fontWeight: 500, lineHeight: 1 }}>{n}</div><div className="xs muted">{l}</div></div>
              ))}
            </div>
            <OfflineBox tripId={trip.id} />
            <p className="xs muted" style={{ padding: '0 4px' }}>Illustrerende demoinnhold. Bildene er nøytrale illustrasjonsfoto, ikke private bilder.</p>
            <div style={{ padding: '0 4px' }}><DeleteLink label="Slett reisen" onClick={() => setConfirmDelete(true)} /></div>
          </aside>
        )}
        {isM && (
          <div className="stack" style={{ gap: 12 }}>
            <OfflineBox tripId={trip.id} />
            <p className="xs muted">Illustrerende demoinnhold. Bildene er nøytrale illustrasjonsfoto, ikke private bilder.</p>
            <DeleteLink label="Slett reisen" onClick={() => setConfirmDelete(true)} />
          </div>
        )}
      </div>
      {confirmDelete && (
        <ConfirmDialog title={'Slette «' + trip.title + '»?'} confirmLabel="Slett reisen" onClose={() => setConfirmDelete(false)}
          onConfirm={() => { deleteTrip(trip.id); navigate(paths.trips(), { replace: true }); }}>
          {trip.memCount === 0 ? 'Reisen har ingen minner ennå.' : 'Alle ' + trip.memCount + (trip.memCount === 1 ? ' minne' : ' minner') + ' og ' + trip.photoCount + (trip.photoCount === 1 ? ' bilde' : ' bilder') + ' på reisen slettes, sammen med historien, dagene, kommentarene og vurderingene.'} Steder som bare hører til denne reisen, forsvinner fra kartet. Dette kan ikke angres.
        </ConfirmDialog>
      )}
    </>
  );
}
