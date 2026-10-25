import { useState } from 'react';
import { Avatar } from '../../components/bits';
import { Img, PhotoButton, stamp } from '../../components/Photo';
import { memCard, type TripView } from '../../store/derive';
import { addInterText, addToStory, moveBlock, removeBlock, type State } from '../../store/store';
import type { Photo } from '../../data/types';

interface Props {
  s: State;
  trip: TripView;
  selMem: string | null;
  onAddMemory: () => void;
  onContinue: () => void;
  onOpenMem: (id: string) => void;
  onShowOnMap: (id: string) => void;
}

/** «Historien»: assembled from the memories plus the couple's own intro and in-between texts. */
export default function StoryTab({ s, trip, selMem, onAddMemory, onContinue, onOpenMem, onShowOnMap }: Props) {
  const [edit, setEdit] = useState(false);
  const [inter, setInter] = useState('');
  const tripMems = s.memories.filter(m => m.tripId === trip.id);
  const inStory = new Set(trip.story.filter(b => b.type === 'memory').map(b => (b as { id: string }).id));
  const notInStory = tripMems.filter(m => !inStory.has(m.id) && !m.galleryOnly).map(m => memCard(s, m));
  const highlights = trip.highlights.map(id => s.memories.find(m => m.id === id)).filter(Boolean).map(m => memCard(s, m!));

  return (
    <>
      <div className="row wrap" style={{ justifyContent: 'space-between', gap: 10, margin: '-6px 0 20px' }}>
        <span className="small muted" style={{ maxWidth: 460 }}>Historien er satt sammen av minnene deres. Rekkefølgen her endrer ikke datoene – dagsoversikten er alltid kronologisk.</span>
        <button onClick={() => setEdit(e => !e)} aria-pressed={edit} style={{ minHeight: 40, padding: '0 14px', borderRadius: 999, border: '1px solid var(--line-strong)', background: 'transparent', fontWeight: 500, fontSize: 13 }}>{edit ? 'Ferdig å ordne' : 'Ordne historien'}</button>
      </div>
      {!trip.story.length && (
        <div className="empty" style={{ padding: '28px 20px', marginBottom: 20 }}>
          <div className="empty-title">Historien er tom ennå</div>
          <p className="muted" style={{ margin: '6px 0 14px', fontSize: 14 }}>Hvert minne dere lagrer, havner her automatisk. Dere kan ordne og ta ut senere.</p>
          <button className="btn btn-primary" onClick={onAddMemory}>+ Legg til minne</button>
        </div>
      )}
      {trip.story.map((b, i) => {
        const m = b.type === 'memory' ? s.memories.find(x => x.id === b.id) : undefined;
        const kindLabel = b.type === 'memory' ? m?.title ?? 'Minne' : b.type === 'note' ? 'Notat' : 'Mellomtekst';
        return (
          <div key={i + (b.type === 'memory' ? b.id : b.type)} data-mem={m?.id} style={{ position: 'relative' }}>
            {edit && (
              <div className="row" style={{ gap: 6, margin: '0 0 8px', padding: '6px 8px', border: '1px dashed var(--line-strong)', borderRadius: 8, background: 'var(--paper)' }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong style={{ color: 'var(--ink)' }}>{kindLabel}</strong></span>
                <button onClick={() => moveBlock(trip.id, i, -1)} aria-label="Flytt opp" disabled={i === 0} style={{ width: 40, height: 40, border: 0, background: 'transparent', fontSize: 13, opacity: i === 0 ? 0.35 : 1 }}>▲</button>
                <button onClick={() => moveBlock(trip.id, i, 1)} aria-label="Flytt ned" disabled={i === trip.story.length - 1} style={{ width: 40, height: 40, border: 0, background: 'transparent', fontSize: 13, opacity: i === trip.story.length - 1 ? 0.35 : 1 }}>▼</button>
                <button onClick={() => removeBlock(trip.id, i)} style={{ minHeight: 36, padding: '0 10px', border: 0, background: 'transparent', fontSize: 12, color: 'var(--terracotta)', fontWeight: 500 }}>Ta ut</button>
              </div>
            )}
            {b.type === 'text' && <p className="serif" style={{ fontStyle: 'italic', fontSize: 20, lineHeight: 1.5, margin: '0 0 26px', maxWidth: 680, textWrap: 'pretty', color: 'var(--ink-soft)' }}>{b.text}</p>}
            {b.type === 'note' && (
              <div className="row" style={{ gap: 10, alignItems: 'flex-start', margin: '-6px 0 26px', padding: '12px 16px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '4px 14px 14px 14px', maxWidth: 520, transform: 'rotate(-.6deg)', boxShadow: '0 1px 2px rgba(46,53,47,.06)' }}>
                <Avatar who={b.by} size={24} />
                <span className="hand" style={{ fontSize: 22, lineHeight: 1.2 }}>{b.text}<span style={{ display: 'block', fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>– {b.by === 'knut' ? 'Knut' : 'Anna'}</span></span>
              </div>
            )}
            {m && <MemBlock s={s} memId={m.id} selected={selMem === m.id} onOpen={() => onOpenMem(m.id)} onMap={() => onShowOnMap(m.id)} />}
          </div>
        );
      })}
      {edit && (
        <div className="card stack" style={{ padding: '14px 16px', margin: '0 0 20px', gap: 10 }}>
          <div className="eyebrow">Legg til mellomtekst</div>
          <div className="row wrap" style={{ gap: 8 }}>
            <input value={inter} onChange={e => setInter(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { addInterText(trip.id, inter); setInter(''); } }} placeholder="En kort overgang mellom minnene …" aria-label="Mellomtekst" className="input soft serif" style={{ flex: 1, minWidth: 200, width: 'auto', padding: '8px 12px', fontSize: 17 }} />
            <button className="btn btn-dark" style={{ fontSize: 14, padding: '0 16px' }} onClick={() => { addInterText(trip.id, inter); setInter(''); }}>Legg til</button>
          </div>
          {notInStory.length > 0 && (
            <>
              <div className="eyebrow" style={{ marginTop: 6 }}>Ikke med i historien – finnes fortsatt i dagene og på kartet</div>
              {notInStory.map(m => (
                <div key={m.id} className="row" style={{ gap: 10, padding: '6px 0', borderTop: '1px solid rgba(46,53,47,.08)' }}>
                  <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontWeight: 500 }}>{m.title}</span><span className="xs muted" style={{ display: 'block' }}>{m.dateLabel}</span></span>
                  <button onClick={() => addToStory(trip.id, m.id)} style={{ minHeight: 40, padding: '0 14px', borderRadius: 999, border: '1px solid var(--line-strong)', background: 'transparent', fontWeight: 500, fontSize: 13 }}>+ Ta med</button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
      {trip.unfinished && (
        <div className="stack" style={{ borderTop: '1px dashed var(--line-strong)', padding: '22px 0 8px', gap: 12, alignItems: 'flex-start' }}>
          <div className="hand" style={{ fontSize: 24, color: 'var(--olive-deep)' }}>Her slutter det vi har skrevet så langt …</div>
          <button className="btn btn-dark" onClick={onContinue}>Fortsett å skrive</button>
        </div>
      )}
      {highlights.length > 0 && (
        <>
          <h2 className="h2-lg" style={{ margin: '36px 0 14px' }}>Høydepunkter</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
            {highlights.map(m => (
              <button key={m.id} onClick={() => onOpenMem(m.id)} style={{ textAlign: 'left', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <span className="ph" style={{ display: 'block', aspectRatio: '3 / 2', width: '100%' }}>{m.thumb && <Img photo={m.thumb} />}</span>
                <span style={{ display: 'block', padding: '10px 12px 12px' }}>
                  <span className="eyebrow" style={{ display: 'block' }}>{m.dateLabel}</span>
                  <span className="serif" style={{ display: 'block', fontSize: 18, fontWeight: 500, lineHeight: 1.15, marginTop: 2 }}>{m.title}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function MemBlock({ s, memId, selected, onOpen, onMap }: { s: State; memId: string; selected: boolean; onOpen: () => void; onMap: () => void }) {
  const raw = s.memories.find(x => x.id === memId)!;
  const m = memCard(s, raw);
  const ph = raw.photos;
  const feat = ph.filter(p => p.featured), rest = ph.filter(p => !p.featured);
  const tile = (p: Photo) => ({ list: ph, index: ph.indexOf(p) });
  return (
    <article style={{ margin: '0 -16px 30px', padding: '14px 16px 8px', borderLeft: '3px solid ' + (selected ? 'var(--terracotta)' : 'transparent'), background: selected ? 'rgba(169,85,60,.07)' : 'transparent', borderRadius: '0 10px 10px 0', transition: 'background .3s' }}>
      <div className="eyebrow row wrap" style={{ gap: 8 }}>
        <span className="pin" style={{ width: 20, height: 20, fontSize: 10, fontWeight: 600 }} aria-hidden="true">{m.glyph}</span>
        <span>{m.dateLabel}</span>
        {m.hasPlace && <span>· {m.placeName}</span>}
        {m.isWorking && <span style={{ padding: '2px 8px', borderRadius: 999, border: '1px dashed var(--terracotta)', color: 'var(--terracotta)', letterSpacing: '.04em' }}>Under arbeid</span>}
      </div>
      <button onClick={onOpen} className="serif" style={{ display: 'block', border: 0, background: 'transparent', padding: 0, textAlign: 'left', fontSize: 28, fontWeight: 500, lineHeight: 1.1, margin: '6px 0 14px', color: 'var(--ink)' }}>{m.title}</button>
      {feat.map(p => (
        <figure key={p.id} style={{ margin: '0 0 16px' }}>
          <PhotoButton photo={p} {...tile(p)} demoTag />
          <figcaption className="row" style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <span>{p.caption}</span>
            <span className="eyebrow" style={{ letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{stamp(p)}</span>
          </figcaption>
        </figure>
      ))}
      {raw.text ? (
        <p className="serif" style={{ fontSize: 19, lineHeight: 1.55, margin: '0 0 16px', maxWidth: 680, textWrap: 'pretty' }}>{raw.text}</p>
      ) : (
        <p className="hand" style={{ fontSize: 22, color: 'var(--olive-deep)', margin: '0 0 14px' }}>Teksten mangler ennå.</p>
      )}
      {rest.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8, margin: '0 0 12px', alignItems: 'start' }}>
          {rest.slice(0, 4).map(p => <PhotoButton key={p.id} photo={p} {...tile(p)} radius={6} />)}
        </div>
      )}
      <div className="row wrap" style={{ gap: '4px 16px', fontSize: 13, marginBottom: 6 }}>
        <button onClick={onOpen} style={{ border: 0, background: 'transparent', padding: '6px 0', color: 'var(--terracotta)', fontWeight: 500 }}>Åpne minnet</button>
        {m.hasPlace && <button onClick={onMap} style={{ border: 0, background: 'transparent', padding: '6px 0', color: 'var(--terracotta)', fontWeight: 500 }}>◎ Vis på kartet</button>}
        {rest.length > 4 && <span className="muted" style={{ padding: '6px 0' }}>+{rest.length - 4} i galleriet</span>}
      </div>
    </article>
  );
}
