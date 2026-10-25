import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PEOPLE, fmtTime, otherPerson } from '../lib/format';
import { paths } from '../lib/nav';
import { colors, queueStatus } from '../store/derive';
import { isOnline, retryAll, startImport, startMemory, useStore } from '../store/store';
import { Avatar, Dot } from './bits';
import { Img, stamp } from './Photo';

export function Lightbox() {
  const lb = useStore(s => s.lightbox);
  const tx = useRef(0);
  const close = () => useStore.setState({ lightbox: null });
  const step = (d: number) => useStore.setState(s => (s.lightbox ? { lightbox: { ...s.lightbox, i: Math.min(s.lightbox.list.length - 1, Math.max(0, s.lightbox.i + d)) } } : {}));
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!lb) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [!!lb]);
  if (!lb) return null;
  const p = lb.list[lb.i];
  const by = PEOPLE[p.by || 'knut'];
  return (
    <div role="dialog" aria-modal="true" aria-label="Bilde i full visning" onTouchStart={e => { tx.current = e.touches[0].clientX; }} onTouchEnd={e => { const dx = e.changedTouches[0].clientX - tx.current; if (dx > 50) step(-1); else if (dx < -50) step(1); }}
      style={{ position: 'fixed', inset: 0, background: '#1E231F', zIndex: 1080, display: 'flex', flexDirection: 'column', color: 'var(--paper)' }}>
      <div className="row" style={{ justifyContent: 'space-between', padding: '10px 12px' }}>
        <span style={{ fontSize: 13, opacity: 0.8 }}>{lb.i + 1} / {lb.list.length}</span>
        <button ref={closeRef} onClick={close} aria-label="Lukk" style={{ width: 44, height: 44, borderRadius: '50%', border: 0, background: 'rgba(255,252,246,.12)', color: 'var(--paper)', fontSize: 22 }}>×</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
        <Img photo={p} alt={p.caption} className="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} />
        {lb.i > 0 && <button onClick={() => step(-1)} aria-label="Forrige bilde" style={lbNav('left')}>‹</button>}
        {lb.i < lb.list.length - 1 && <button onClick={() => step(1)} aria-label="Neste bilde" style={lbNav('right')}>›</button>}
      </div>
      <div className="row" style={{ padding: '14px 16px 20px', alignItems: 'flex-start', gap: 10 }}>
        <Avatar who={by} size={24} />
        <span style={{ flex: 1 }}>
          <span className="serif" style={{ display: 'block', fontSize: 17 }}>{p.caption}</span>
          <span style={{ display: 'block', fontSize: 12, opacity: 0.75, marginTop: 2 }}>{stamp(p)} · Tatt av {by.name}{p.src ? ' · demo-illustrasjon' : ''}</span>
        </span>
      </div>
    </div>
  );
}
const lbNav = (side: 'left' | 'right') => ({ position: 'absolute' as const, [side]: 8, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', border: 0, background: 'rgba(255,252,246,.15)', color: 'var(--paper)', fontSize: 22 });

export function Toasts() {
  const toasts = useStore(s => s.toasts);
  return (
    <div aria-live="polite" style={{ position: 'fixed', left: 0, right: 0, bottom: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none', zIndex: 1090 }}>
      {toasts.map(t => (
        <div key={t.id} className="fade" style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '10px 16px', borderRadius: 999, fontSize: 14, fontWeight: 500, boxShadow: '0 6px 20px rgba(46,53,47,.3)', maxWidth: '90%', textAlign: 'center' }}>{t.text}</div>
      ))}
    </div>
  );
}

function useEscape(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
}

/** Context for «Legg til»: the trip (and day) the user is looking at, if any. */
export function AddMenu({ tripId, date }: { tripId?: string | null; date?: string }) {
  const open = useStore(s => s.addOpen);
  const isMobile = useStore(s => s.isMobile);
  const navigate = useNavigate();
  const close = () => useStore.setState({ addOpen: false });
  useEscape(open, close);
  if (!open) return null;
  const go = (to: string) => { close(); navigate(to); };
  const item = (glyph: string, bg: string, title: string, sub: string, onClick: () => void) => (
    <button onClick={onClick} className="row" style={{ gap: 14, minHeight: 56, padding: '8px 12px', borderRadius: 12, border: 0, background: 'var(--cream)', textAlign: 'left' }}>
      <span style={{ width: 40, height: 40, borderRadius: '50%', background: bg, color: 'var(--paper)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }} aria-hidden="true">{glyph}</span>
      <span><span style={{ display: 'block', fontWeight: 600 }}>{title}</span><span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{sub}</span></span>
    </button>
  );
  return (
    <div className="scrim" onClick={close} style={{ alignItems: 'flex-end', zIndex: 1060 }}>
      <div role="dialog" aria-modal="true" aria-label="Legg til" className="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, gap: 8, marginBottom: isMobile ? 72 : 0 }}>
        <div className="serif" style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Legg til</div>
        {item('▤', 'var(--olive)', 'Ny reise', 'Også eldre turer med usikker dato', () => go(paths.newTrip()))}
        {item('✎', 'var(--terracotta)', 'Minne', 'Tekst, bilder, sted – fungerer uten nett', () => { startMemory(tripId, date); go(paths.newMemory()); })}
        {item('▣', 'var(--ink)', 'Bilder', 'Velg flere, få forslag til dato og sted', () => { startImport(tripId); go(paths.import()); })}
        <button onClick={close} className="btn btn-ghost">Avbryt</button>
      </div>
    </div>
  );
}

export function SyncPanel() {
  const s = useStore();
  const close = () => useStore.setState({ syncOpen: false });
  useEscape(s.syncOpen, close);
  if (!s.syncOpen) return null;
  const qs = queueStatus(s);
  const online = isOnline(s);
  const other = PEOPLE[otherPerson(s.user)].name;
  const cloud = s.mode === 'cloud';
  const label = (i: (typeof s.queue)[number]) => ({ venter: online ? 'Venter' : 'Venter på nett', laster: i.photos ? 'Laster opp ' + i.done + ' av ' + i.photos + ' bilder' : 'Sender …', feil: 'Kunne ikke sendes – ' + i.done + ' av ' + i.photos + ' bilder sendt', synk: 'Synkronisert' })[i.status];
  const color = (i: (typeof s.queue)[number]) => ({ venter: colors.amber, laster: colors.terracotta, feil: colors.terracotta, synk: colors.oliveDeep })[i.status];
  const otherChanges = Math.max(0, s.sync.pending - s.queue.length);
  return (
    <div className="scrim" onClick={close} style={{ alignItems: 'flex-start' }}>
      <div role="dialog" aria-modal="true" aria-label="Synkronisering" className="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, gap: 12, marginTop: 24 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="serif" style={{ fontSize: 22, fontWeight: 500 }}>Synkronisering</div>
          <button onClick={close} aria-label="Lukk" className="icon-btn" style={{ fontSize: 22 }}>×</button>
        </div>
        <div className="row" style={{ gap: 8, fontWeight: 600, color: qs.tone }}><Dot color={qs.tone} size={10} />{qs.label}</div>
        {!cloud ? (
          <div className="small muted">Appen er ikke koblet til det felles arkivet. Alt lagres bare på denne telefonen, og {other} ser det ikke.</div>
        ) : (
          <>
            <div className="small muted">Siste vellykkede synkronisering: {fmtTime(s.lastSync)}. Endringer sendes med en gang når det er nett, og når appen åpnes igjen. Store opplastinger fortsetter bare mens appen er åpen.</div>
            {s.queue.length > 0 || otherChanges > 0 ? (
              <div className="stack">
                {s.queue.map(i => {
                  const m = s.memories.find(x => x.id === i.id);
                  return (
                    <div key={i.id} className="row" style={{ gap: 10, padding: '10px 0', borderTop: '1px solid rgba(46,53,47,.08)', fontSize: 14 }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 500 }}>{i.kind} · {i.title}</span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{i.photos} bilder fra denne telefonen · skrivestatus: {m ? (m.writeStatus === 'arbeid' ? 'Under arbeid' : 'Ferdig') : ''}</span>
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: color(i), textAlign: 'right' }}>{label(i)}</span>
                    </div>
                  );
                })}
                {otherChanges > 0 && <div className="small muted" style={{ padding: '10px 0', borderTop: '1px solid rgba(46,53,47,.08)' }}>{otherChanges} andre endring{otherChanges === 1 ? '' : 'er'} (reiser, steder, drømmer) venter på å bli sendt.</div>}
              </div>
            ) : (
              <div style={{ padding: 12, border: '1px dashed rgba(46,53,47,.25)', borderRadius: 10, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>Ingenting venter. Alt som er lagret her finnes også på {other}s telefon.</div>
            )}
            {s.sync.phase === 'error' && <p className="small" style={{ color: 'var(--terracotta)' }}>Serveren svarte ikke som forventet. Alt er fortsatt lagret på denne telefonen. Nytt forsøk lager ikke duplikater.</p>}
            {online && (s.sync.pending > 0 || s.sync.phase === 'error') && <button className={'btn ' + (s.sync.phase === 'error' ? 'btn-primary' : 'btn-dark')} onClick={retryAll}>{s.sync.phase === 'error' ? 'Prøv igjen' : 'Fortsett synkronisering nå'}</button>}
          </>
        )}
        <p className="xs muted">Synkronisering er ikke en sikkerhetskopi: sletter en av dere noe, forsvinner det hos begge. Last ned en kopi under Innstillinger → Eksport.</p>
      </div>
    </div>
  );
}
