import { useEffect, useState } from 'react';
import { Link, useNavigate, useNavigationType, useParams, useSearchParams } from 'react-router-dom';
import { BackLink, Empty } from '../components/bits';
import ConfirmDialog, { DeleteLink } from '../components/ConfirmDialog';
import { Img } from '../components/Photo';
import { PEOPLE } from '../lib/format';
import { paths, useBack, type TripTab } from '../lib/nav';
import { scrollToMem, usePageTitle } from '../lib/page';
import { tripMeta } from '../store/derive';
import { deleteTrip, openExport, resolveConflict, startImport, startMemory, useStore } from '../store/store';
import { DaysTab, PhotosTab } from './trip/DaysPhotosTabs';
import OfflineBox from './trip/OfflineBox';
import PlacesTab from './trip/PlacesTab';
import StoryTab from './trip/StoryTab';
import ConflictPanel from './trip/ConflictPanel';

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

  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!raw) {
    return <Empty title="Fant ikke reisen"><p style={{ marginTop: 10 }}><Link to={paths.trips()}>Til alle reiser</Link></p></Empty>;
  }
  const trip = tripMeta(s, raw);
  const isM = s.isMobile;
  const me = PEOPLE[s.user];

  const setTab = (t: TripTab) => { update({ fane: t }); if (selMem && (t === 'historien' || t === 'steder')) scrollToMem(selMem); };
  const addMemory = () => { startMemory(trip.id); navigate(paths.newMemory()); };
  const continueWriting = () => setTab('dager');
  const openBook = () => navigate(paths.book(trip.id));
  const goImport = () => { startImport(trip.id); navigate(paths.import()); };
  const openMem = (id: string) => navigate(paths.memory(id));
  const showOnMap = (id: string) => { update({ fane: 'steder', vis: 'kart', minne: id }); scrollToMem(id); };
  const inStory = (id: string) => { update({ fane: 'historien', minne: id }); scrollToMem(id); };
  const showAside = !isM && tab !== 'steder';

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

      {raw.conflict && <ConflictPanel conflict={raw.conflict} me={me} what="innledningen" onResolve={text => resolveConflict(trip.id, text)} />}

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
