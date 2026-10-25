import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar, BackLink, Empty } from '../components/bits';
import ConfirmDialog, { DeleteLink } from '../components/ConfirmDialog';
import { PhotoButton } from '../components/Photo';
import { PEOPLE } from '../lib/format';
import { paths, useBack } from '../lib/nav';
import { usePageTitle } from '../lib/page';
import { memCard, ratingRows } from '../store/derive';
import { addComment, deleteComment, deleteMemory, deletePhoto, rate, saveMemText, setRatingText, setWrite, useStore } from '../store/store';
import { pill } from './trip/common';

export default function MemoryPage() {
  const { memId = '' } = useParams();
  const s = useStore();
  const navigate = useNavigate();
  const raw = s.memories.find(m => m.id === memId);
  const back = useBack(raw ? paths.trip(raw.tripId) : paths.trips());
  usePageTitle(raw?.title ?? 'Minne');
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [comment, setComment] = useState('');
  const [confirm, setConfirm] = useState<{ kind: 'mem' } | { kind: 'photo'; id: string } | { kind: 'comment'; i: number } | null>(null);
  if (!raw) return <Empty title="Fant ikke minnet"><p style={{ marginTop: 10 }}><Link to={paths.trips()}>Til alle reiser</Link></p></Empty>;

  const m = memCard(s, raw);
  const trip = s.trips.find(t => t.id === raw.tripId);
  const me = PEOPLE[s.user];
  const inStory = !!trip?.story.some(b => b.type === 'memory' && b.id === raw.id);
  const editedBy = raw.editedBy ? PEOPLE[raw.editedBy].name : raw.createdBy ? PEOPLE[raw.createdBy].name : 'begge';
  const startEdit = () => { setText(raw.text); setEditing(true); };
  const box = { flex: 1, minWidth: 200, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, gap: 6 };
  const smallBtn = { marginLeft: 'auto', minHeight: 36, padding: '0 12px', borderRadius: 999, border: '1px solid var(--line-strong)', background: 'transparent', fontWeight: 500, fontSize: 12 };

  return (
    <>
      {!s.isMobile && <BackLink onClick={back} />}
      <div style={{ maxWidth: 760 }}>
        <div className="eyebrow row wrap" style={{ gap: 8 }}>
          <span className="row" style={{ gap: 6 }}><span className="pin" style={{ width: 20, height: 20, fontSize: 10, fontWeight: 600 }} aria-hidden="true">{m.glyph}</span>{m.typeLabel}</span>
          <span>·</span><span>{m.dateLabel}</span><span>·</span>
          {trip && <button onClick={() => navigate(paths.trip(trip.id))} style={{ border: 0, background: 'transparent', padding: 0, font: 'inherit', color: 'var(--terracotta)', letterSpacing: 'inherit', textTransform: 'inherit' }}>{trip.title}</button>}
        </div>
        <h1 className="serif" style={{ fontWeight: 500, fontSize: 40, lineHeight: 1.05, margin: '6px 0 10px', letterSpacing: '-.01em', textWrap: 'balance' }}>{m.title}</h1>
        <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
          {m.hasPlace ? (
            <>
              <button onClick={() => navigate(paths.place(raw.placeId!))} className="row" style={{ gap: 6, minHeight: 40, padding: '0 12px', borderRadius: 999, border: '1px solid rgba(46,53,47,.2)', background: 'var(--paper)', fontSize: 13, fontWeight: 500 }}>◎ {m.placeName} <span style={{ color: 'var(--faint)' }}>›</span></button>
              <button onClick={() => navigate(paths.trip(raw.tripId, { tab: 'steder', vis: 'kart', mem: raw.id }))} style={{ ...pill.outline, padding: '0 12px' }}>Vis på reisens kart</button>
            </>
          ) : (
            <span className="small muted">Uten sted – vises i historien og dagsoversikten</span>
          )}
          {inStory && <button onClick={() => navigate(paths.trip(raw.tripId, { mem: raw.id }))} style={{ ...pill.outline, padding: '0 12px' }}>Se i historien</button>}
        </div>

        <div className="row wrap" style={{ gap: 10, alignItems: 'stretch', marginBottom: 20 }}>
          <div style={box}>
            <div className="eyebrow">Skrivestatus · deres eget valg</div>
            <div className="row wrap" style={{ gap: 8 }}>
              {m.isWorking ? (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--terracotta)' }}>✎ Under arbeid</span>
                  {m.startedByName && <span className="xs muted">· påbegynt av {m.startedByName}</span>}
                  <button onClick={() => setWrite(raw.id, 'ferdig')} style={smallBtn}>Merk som ferdig</button>
                </>
              ) : (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--olive-deep)' }}>✓ Ferdig</span>
                  <button onClick={() => setWrite(raw.id, 'arbeid')} style={smallBtn}>Sett til under arbeid</button>
                </>
              )}
            </div>
            <div className="xs muted">Publiserer ingenting. Arkivet er privat for dere to.</div>
          </div>
          <div style={box}>
            <div className="eyebrow">Lagringsstatus</div>
            <div className="row" style={{ gap: 8, fontWeight: 600, color: m.syncColor }}><span className="dot" style={{ background: m.syncColor }} />{m.syncLabel}</div>
            <div className="xs muted">{m.syncDetail}</div>
          </div>
        </div>

        {raw.photos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 22, alignItems: 'start' }}>
            {raw.photos.map((p, i) => (
              <figure key={p.id}>
                <PhotoButton photo={p} list={raw.photos} index={i} demoTag />
                <figcaption className="row small muted" style={{ marginTop: 6, gap: 10, justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span>{p.caption}</span>
                  <button onClick={() => setConfirm({ kind: 'photo', id: p.id })} aria-label={'Slett bilde' + (p.caption ? ' «' + p.caption + '»' : ' ' + (i + 1))} style={{ border: 0, background: 'transparent', padding: '4px 0', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Slett bilde</button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <div className="eyebrow">Felles tekst · skrevet av {editedBy}</div>
          {!editing && <button onClick={startEdit} style={{ border: 0, background: 'transparent', padding: 0, fontSize: 13, color: 'var(--terracotta)', fontWeight: 500 }}>Rediger</button>}
        </div>
        {!editing ? (
          <>
            {raw.text && <p className="serif" style={{ fontSize: 19, lineHeight: 1.55, margin: '0 0 22px', textWrap: 'pretty' }}>{raw.text}</p>}
            {m.isUnfinished && !raw.text && (
              <div className="row wrap" style={{ margin: '0 0 22px', padding: 16, border: '1px dashed var(--line-strong)', borderRadius: 10, gap: 12 }}>
                <span className="hand" style={{ fontSize: 22, color: 'var(--olive-deep)', flex: 1 }}>Bildene er på plass. Historien mangler.</span>
                <button onClick={startEdit} style={{ ...pill.dark, padding: '0 16px' }}>Skriv teksten</button>
              </div>
            )}
          </>
        ) : (
          <>
            <textarea className="input" rows={5} value={text} onChange={e => setText(e.target.value)} placeholder="Skriv den felles historien om dette minnet …" aria-label="Felles tekst" />
            <div className="row" style={{ gap: 8, margin: '10px 0 22px' }}>
              <button className="btn btn-primary" onClick={() => { saveMemText(raw.id, text); setEditing(false); }}>Lagre</button>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>Avbryt</button>
            </div>
          </>
        )}

        {raw.visit && (
          <>
            <h2 className="serif" style={{ fontWeight: 500, fontSize: 24, margin: '8px 0 4px' }}>Våre vurderinger</h2>
            <p className="small muted" style={{ margin: '0 0 12px' }}>Vurderingene gjelder dette besøket. Et nytt besøk får sin egen vurdering.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginBottom: 26 }}>
              {ratingRows(s, raw).map(r => (
                <div key={r.id} className="card" style={{ padding: '14px 16px' }}>
                  <div className="row" style={{ gap: 8, marginBottom: 8 }}><Avatar who={r} size={26} /><span style={{ fontWeight: 600 }}>{r.name}</span>{r.isMine && <span style={{ fontSize: 11, color: 'var(--muted)' }}>(deg)</span>}</div>
                  {r.isMine ? (
                    <>
                      <div role="radiogroup" aria-label="Din vurdering" className="row" style={{ gap: 2 }}>
                        {[1, 2, 3, 4, 5].map(n => {
                          const on = r.value != null && n <= r.value;
                          return <button key={n} role="radio" aria-checked={r.value === n} aria-label={n + (n === 1 ? ' stjerne' : ' stjerner')} onClick={() => rate(raw.id, n)} style={{ width: 40, height: 40, border: 0, background: 'transparent', fontSize: 26, lineHeight: 1, color: on ? 'var(--terracotta)' : 'var(--faint)' }}>{on ? '★' : '☆'}</button>;
                        })}
                        {r.rated && <button onClick={() => rate(raw.id, null)} style={{ marginLeft: 6, border: 0, background: 'transparent', fontSize: 12, color: 'var(--muted)', minHeight: 40 }}>Fjern</button>}
                      </div>
                      {!r.rated && <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>Ikke vurdert – trykk på en stjerne, eller la være.</div>}
                      <input value={r.text} onChange={e => setRatingText(raw.id, e.target.value)} placeholder="Kort kommentar (valgfritt)" aria-label="Kort kommentar til din vurdering" className="input soft" style={{ marginTop: 10, minHeight: 40, padding: '8px 10px', fontSize: 14, borderColor: 'rgba(46,53,47,.2)' }} />
                    </>
                  ) : (
                    <>
                      {r.rated ? <div aria-label={r.starLabel} style={{ color: 'var(--terracotta)', fontSize: 22, letterSpacing: 2, lineHeight: 1 }}>{r.stars}</div> : <div style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic' }}>Ikke vurdert ennå</div>}
                      {r.text && <p className="hand" style={{ margin: '8px 0 0', fontSize: 20, lineHeight: 1.2 }}>{r.text}</p>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <h2 className="serif" style={{ fontWeight: 500, fontSize: 24, margin: '8px 0 12px' }}>Egne kommentarer</h2>
        {raw.comments.map((c, i) => (
          <div key={i} className="row" style={{ gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            <Avatar who={c.by} size={26} />
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '4px 14px 14px 14px', padding: '10px 14px', maxWidth: 560 }}>
              <div className="eyebrow" style={{ letterSpacing: '.06em' }}>{PEOPLE[c.by].name}</div>
              <div className="hand" style={{ fontSize: 21, lineHeight: 1.2 }}>{c.text}</div>
            </div>
            {c.by === s.user && <button onClick={() => setConfirm({ kind: 'comment', i })} aria-label="Slett kommentaren din" style={{ border: 0, background: 'transparent', padding: '8px 0', fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>Slett</button>}
          </div>
        ))}
        <form className="row" style={{ gap: 8, alignItems: 'flex-start' }} onSubmit={e => { e.preventDefault(); addComment(raw.id, comment); setComment(''); }}>
          <Avatar who={me} size={26} style={{ marginTop: 9 }} />
          <input value={comment} onChange={e => setComment(e.target.value)} placeholder={'Din egen kommentar, ' + me.name + ' …'} aria-label="Din egen kommentar" className="input" style={{ flex: 1, padding: '8px 12px' }} />
          <button type="submit" className="btn btn-dark" style={{ padding: '0 14px', fontSize: 14 }}>Legg til</button>
        </form>
        {raw.local && <p className="xs muted row" style={{ margin: '20px 0 0', gap: 6 }}><span className="dot" style={{ width: 8, height: 8, background: 'var(--amber)' }} />Lagt til på denne telefonen. Synkroniseringsstatus finner du øverst.</p>}
        <div style={{ borderTop: '1px solid var(--line)', marginTop: 32, paddingTop: 8 }}>
          <DeleteLink label="Slett minnet" onClick={() => setConfirm({ kind: 'mem' })} />
        </div>
      </div>
      {confirm?.kind === 'mem' && (
        <ConfirmDialog title={'Slette «' + raw.title + '»?'} confirmLabel="Slett minnet" onClose={() => setConfirm(null)}
          onConfirm={() => { const tid = raw.tripId; deleteMemory(raw.id); navigate(paths.trip(tid), { replace: true }); }}>
          Teksten, {raw.photos.length === 1 ? 'bildet' : 'de ' + raw.photos.length + ' bildene'}, kommentarene og vurderingene slettes fra arkivet. Minnet forsvinner fra historien, dagene og kartet. Dette kan ikke angres.
        </ConfirmDialog>
      )}
      {confirm?.kind === 'photo' && (
        <ConfirmDialog title="Slette bildet?" confirmLabel="Slett bildet" onClose={() => setConfirm(null)} onConfirm={() => deletePhoto(raw.id, confirm.id)}>
          Bildet slettes fra minnet, fra reisens bilder og fra bokvisningen. Originalfilen i telefonens eget bildegalleri berøres ikke. Dette kan ikke angres.
        </ConfirmDialog>
      )}
      {confirm?.kind === 'comment' && (
        <ConfirmDialog title="Slette kommentaren din?" confirmLabel="Slett kommentaren" onClose={() => setConfirm(null)} onConfirm={() => deleteComment(raw.id, confirm.i)}>
          «{raw.comments[confirm.i]?.text}»
        </ConfirmDialog>
      )}
    </>
  );
}
