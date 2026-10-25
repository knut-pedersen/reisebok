import { useEffect, useRef, type CSSProperties, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackLink, Dot } from '../components/bits';
import { Img } from '../components/Photo';
import type { ImportItem } from '../data/types';
import { fmtDate, fmtShort, weekday } from '../lib/format';
import { paths, useBack } from '../lib/nav';
import { usePageTitle } from '../lib/page';
import { colors, tripMeta } from '../store/derive';
import {
  addImportFiles, applyDateFix, applyPlaceFix, confirmPlace, dropDup, groupKey, impConfirmDo, impSet, isOnline, keepDup,
  moveImp, removeImp, retryFailed, setGroupTarget, setImpCaption, setItemDate, setItemPlace, startImport, startUpload,
  toggleImpBook, toggleImpFeat, useDemoImport, useStore, type ImportState,
} from '../store/store';

const STATUS_COLOR: Record<ImportItem['status'], string> = { venter: colors.faint, laster: colors.amber, ok: colors.oliveDeep, feil: colors.terracotta, nett: colors.amber };
const STATUS_LABEL: Record<ImportItem['status'], string> = { venter: 'Venter', laster: 'Laster opp …', ok: 'Lagt til', feil: 'Feilet – prøv igjen', nett: 'Venter på nett' };

const panel: CSSProperties = { padding: '14px 16px', marginBottom: 12 };
const selectStyle: CSSProperties = { minHeight: 44, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(46,53,47,.25)', background: 'var(--cream)' };
const h2: CSSProperties = { fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 22, margin: '0 0 10px' };

function Thumb({ item, size, radius = 6, outline }: { item: { src?: string; blobKey?: string }; size: number; radius?: number; outline?: boolean }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size, borderRadius: radius, overflow: 'hidden', background: '#D9CBB6', flex: 'none', outline: outline ? '2px solid #8A6D3B' : undefined }}>
      <Img photo={item} />
    </span>
  );
}

function PanelHead({ color, children }: { color: string; children: React.ReactNode }) {
  return <div className="row" style={{ gap: 8, fontWeight: 600 }}><Dot color={color} size={10} />{children}</div>;
}

export default function ImportPage() {
  const s = useStore();
  const navigate = useNavigate();
  const back = useBack('/reiser');
  const fileRef = useRef<HTMLInputElement>(null);
  usePageTitle('Legg til bilder');

  useEffect(() => { if (!useStore.getState().imp) startImport(null); }, []);
  const imp = s.imp;
  if (!imp) return null;

  const online = isOnline(s);
  const placeOptions = s.places.filter(p => p.kind === 'place');
  const trips = s.trips.map(t => tripMeta(s, t));
  const tripSel = s.trips.find(t => t.id === imp.tripChoice);
  const tripTitle = imp.tripChoice === 'ny' ? (imp.newTripTitle.trim() || 'ny reise') : (tripSel?.title ?? 'ny reise');
  const items = imp.items;
  const num = (it: ImportItem) => items.indexOf(it) + 1;
  const placeOf = (id: string | null) => (id ? s.places.find(p => p.id === id) : undefined);
  const hasPos = (i: ImportItem) => !!i.pos || !!i.place;
  const posLabel = (i: ImportItem) => {
    const pl = placeOf(i.place);
    if (pl) return pl.name + (i.conf === 'usikker' ? ' (usikkert)' : i.conf === 'bekreftet' ? ' (bekreftet)' : '');
    return i.pos ? 'Posisjon funnet – sted ikke valgt' : 'Mangler posisjon';
  };
  const takenLabel = (i: ImportItem) => (i.taken ? fmtDate(i.taken) + ' kl. ' + i.taken.slice(11, 16) : 'Mangler dato');

  const missingDate = items.filter(i => !i.taken).length;
  const missingPos = items.filter(i => !hasPos(i)).length;
  const uncertain = items.filter(i => i.conf === 'usikker');
  const dups = items.filter(i => !!i.dupOf);

  // Groups by capture day
  const groupsMap: Record<string, ImportItem[]> = {};
  items.forEach(it => { (groupsMap[groupKey(it)] ||= []).push(it); });
  const target = (k: string): 'dag' | 'minne' | 'bilder' => {
    const dayHit = tripSel?.days.find(d => d.date === k);
    return imp.groupTarget[k] || (dayHit ? 'dag' : 'minne');
  };
  const groups = Object.keys(groupsMap).sort().map(k => {
    const g = groupsMap[k];
    const dayHit = tripSel?.days.find(d => d.date === k);
    const meta = imp.groupMeta[k] || {};
    const mpl = placeOf(meta.place ?? null);
    return {
      key: k, items: g, count: g.length,
      label: k === 'uten' ? g.length + (g.length === 1 ? ' bilde' : ' bilder') + ' uten dato' : 'Disse ' + g.length + ' bildene ser ut til å være fra samme dag',
      dateLabel: k === 'uten' ? 'Dato må legges inn' : weekday(k) + ' ' + fmtDate(k),
      dayLabel: dayHit ? 'Legg til dagen ' + fmtShort(k) : 'Opprett dagen ' + (k === 'uten' ? '(ukjent dato)' : fmtShort(k)),
      dateLine: meta.dateFrom != null ? 'Dato for gruppen: ' + fmtDate(meta.date) + ' (fra bilde ' + meta.dateFrom + ', bekreftet)' : '',
      placeLine: meta.placeFrom != null ? 'Sted for gruppen: ' + (mpl ? mpl.name : '') + ' (fra bilde ' + meta.placeFrom + ', bekreftet)' : '',
    };
  });
  const tgtLabel = (k: string) => { const v = target(k); return v === 'dag' ? 'en del av dagen ' + (k === 'uten' ? '(ukjent dato)' : fmtShort(k)) : v === 'minne' ? 'et nytt minne' : 'bilder i «Bilder»'; };
  const confirmText = (it: ImportItem) => {
    const c = imp.confirm;
    if (!c || c.id !== it.id) return '';
    const k = groupKey(it);
    const gName = k === 'uten' ? 'uten dato' : fmtDate(k);
    const pl = placeOf(it.place);
    return c.kind === 'dato'
      ? 'Endrer gruppen «' + gName + '» (' + groupsMap[k].length + ' bilder), som blir ' + tgtLabel(k) + ' i «' + tripTitle + '»: dato settes til ' + fmtDate(it.taken) + ' kl. ' + (it.taken || '').slice(11, 16) + ' fra dette bildet.'
      : 'Endrer gruppen «' + gName + '» (' + groupsMap[k].length + ' bilder), som blir ' + tgtLabel(k) + ' i «' + tripTitle + '»: stedet settes til ' + (pl ? pl.name : '') + '. Posisjonen er et forslag – bekreft at det var her dere var.';
  };

  const ok = items.filter(i => i.status === 'ok').length, fail = items.filter(i => i.status === 'feil').length, net = items.filter(i => i.status === 'nett').length;
  const pct = items.length ? Math.round((ok / items.length) * 100) : 0;
  const summary = fail ? ok + ' av ' + items.length + ' bilder lagt til · ' + fail + ' feilet' : net ? net + ' bilder venter på nett' : ok + ' av ' + items.length + ' bilder lagt til';
  const canRetry = fail > 0 || (net > 0 && online);

  const step = (n: ImportState['step']) => impSet({ step: n });
  const onFiles = (list: FileList | File[] | null) => {
    const fs = Array.from(list || []).filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    if (fs.length) addImportFiles(fs);
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); onFiles(e.dataTransfer.files); };

  return (
    <>
      {!s.isMobile && <BackLink onClick={back} />}
      <div style={{ maxWidth: 760 }}>
        <h1 className="serif" style={{ fontWeight: 500, fontSize: 34, lineHeight: 1.05, margin: '0 0 16px' }}>Legg til bilder</h1>
        <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
          {(['Velg bilder', 'Se forslag', 'Bekreft', 'Fremdrift'] as const).map((label, i) => {
            const n = i + 1;
            return (
              <li key={n} aria-current={n === imp.step ? 'step' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ height: 4, borderRadius: 2, background: n <= imp.step ? '#A9553C' : 'rgba(46,53,47,.15)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: n === imp.step ? '#2E352F' : '#5C6358' }}>{n}. {label}</span>
              </li>
            );
          })}
        </ol>
        {!online && (
          <div className="notice" style={{ marginBottom: 16 }}>
            <Dot color={colors.amber} style={{ marginTop: 6 }} />
            <span><strong>Du er uten nett.</strong> Du kan velge bilder som finnes på telefonen og organisere dem nå. Opplastingen legges i kø og sendes når nettet er tilbake.</span>
          </div>
        )}

        {imp.step === 1 && (
          <>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => { onFiles(e.target.files); e.target.value = ''; }} className="sr-only" tabIndex={-1} aria-hidden="true" />
            <div onDrop={onDrop} onDragOver={e => e.preventDefault()} style={{ border: '1px dashed rgba(46,53,47,.35)', borderRadius: 14, padding: '28px 20px', textAlign: 'center', background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-primary" style={{ minHeight: 52, padding: '0 22px', fontSize: 16 }} onClick={() => fileRef.current?.click()}>Velg bilder fra telefonen</button>
              <div className="small muted">Flere bilder samtidig.{!s.isMobile && ' Eller dra og slipp her.'}</div>
              <button className="btn btn-outline clear btn-sm" onClick={() => useDemoImport()}>Bruk 12 demobilder med metadata</button>
            </div>
            {imp.reading > 0 && <p className="small muted" role="status" style={{ marginTop: 12 }}>Leser bildeinformasjon … ({imp.reading} igjen)</p>}
            {items.length > 0 && (
              <>
                <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between', margin: '22px 0 10px', gap: 12, flexWrap: 'wrap' }}>
                  <h2 className="h2">{items.length} bilder valgt</h2>
                  {imp.fromFiles && <span className="xs muted">Dato og posisjon leses fra bildefilene når de finnes</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: 8 }}>
                  {items.map((it, i) => (
                    <div key={it.id} className="ph" style={{ aspectRatio: '1', borderRadius: 8 }}>
                      <Img photo={it} />
                      <button onClick={() => removeImp(it.id)} aria-label={'Fjern bilde ' + (i + 1)} style={{ position: 'absolute', right: 4, top: 4, width: 28, height: 28, borderRadius: '50%', border: 0, background: 'rgba(46,53,47,.7)', color: 'var(--paper)', fontSize: 16, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
                <button className="btn btn-dark btn-lg btn-block" style={{ marginTop: 20 }} disabled={imp.reading > 0} onClick={() => step(2)}>Se forslag</button>
              </>
            )}
          </>
        )}

        {imp.step === 2 && (
          <>
            <p className="muted" style={{ margin: '0 0 16px', fontSize: 14 }}>Forslagene er hentet fra bildefilenes dato og posisjon. Alt kan endres. En posisjon er ikke bevis for et bestemt besøk – du velger stedet.</p>
            {missingDate > 0 && (
              <div className="card" style={panel}>
                <PanelHead color={colors.terracotta}>{missingDate} bilder mangler dato</PanelHead>
                <p className="small muted" style={{ margin: '6px 0 10px' }}>Opplastingsdatoen brukes ikke som reisedato. Sett datoen selv for alle samtidig, eller enkeltvis under.</p>
                <div className="row wrap" style={{ gap: 8 }}>
                  <input type="date" value={imp.dateFix} onChange={e => impSet({ dateFix: e.target.value })} aria-label="Dato for bilder uten dato" style={selectStyle} />
                  <button className="btn btn-dark btn-sm" onClick={applyDateFix} style={{ minHeight: 44, padding: '0 16px' }}>Sett dato på {missingDate} bilder</button>
                </div>
              </div>
            )}
            {missingPos > 0 && (
              <div className="card" style={panel}>
                <PanelHead color={colors.terracotta}>{missingPos} bilder mangler posisjon</PanelHead>
                <p className="small muted" style={{ margin: '6px 0 10px' }}>Velg et sted for alle samtidig – eller la stedet stå tomt. Det stopper ikke importen.</p>
                <div className="row wrap" style={{ gap: 8 }}>
                  <select value={imp.placeFix} onChange={e => impSet({ placeFix: e.target.value })} aria-label="Sted for bilder uten posisjon" style={{ ...selectStyle, minWidth: 200 }}>
                    <option value="">Velg sted …</option>
                    {placeOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button className="btn btn-dark btn-sm" onClick={applyPlaceFix} style={{ minHeight: 44, padding: '0 16px' }}>Sett sted</button>
                </div>
              </div>
            )}
            {uncertain.length > 0 && (
              <div className="card" style={panel}>
                <PanelHead color={colors.amber}>{uncertain.length} usikre stedsforslag</PanelHead>
                {uncertain.map(it => (
                  <div key={it.id} className="row wrap" style={{ gap: 10, padding: '8px 0', borderTop: '1px solid rgba(46,53,47,.08)' }}>
                    <Thumb item={it} size={44} />
                    <span style={{ flex: 1, minWidth: 140, fontSize: 14 }}>Kanskje <strong>{placeOf(it.place)?.name}</strong>? <span className="xs muted">· usikkert</span></span>
                    <button className="btn btn-olive" style={{ minHeight: 40, padding: '0 12px', fontSize: 13 }} onClick={() => confirmPlace(it.id)}>Bekreft</button>
                    <select value="" onChange={e => setItemPlace(it.id, e.target.value)} aria-label="Velg annet sted" style={{ minHeight: 40, padding: '0 10px', borderRadius: 999, border: '1px solid rgba(46,53,47,.25)', background: 'var(--cream)', fontSize: 13 }}>
                      <option value="">Annet sted …</option>
                      {placeOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
            {dups.length > 0 && (
              <div className="card" style={panel}>
                <PanelHead color={colors.amber}>{dups.length} mulig duplikat</PanelHead>
                <p className="small muted" style={{ margin: '6px 0 8px' }}>Ingenting slettes automatisk. Du bestemmer.</p>
                {dups.map(it => {
                  const orig = items.find(x => x.id === it.dupOf);
                  return (
                    <div key={it.id} className="row wrap" style={{ gap: 10, padding: '8px 0', borderTop: '1px solid rgba(46,53,47,.08)' }}>
                      <span style={{ display: 'inline-flex', gap: 4 }}>{orig && <Thumb item={orig} size={44} />}<Thumb item={it} size={44} outline /></span>
                      <span style={{ flex: 1, minWidth: 140, fontSize: 14 }}>Samme tidspunkt og posisjon som bilde {orig ? num(orig) : '?'}</span>
                      <button className="btn btn-outline clear" style={{ minHeight: 40, padding: '0 12px', fontSize: 13 }} onClick={() => keepDup(it.id)}>Behold begge</button>
                      <button className="btn btn-dark" style={{ minHeight: 40, padding: '0 12px', fontSize: 13 }} onClick={() => dropDup(it.id)}>Fjern duplikatet</button>
                    </div>
                  );
                })}
              </div>
            )}
            <h2 style={{ ...h2, margin: '22px 0 10px' }}>Foreslått gruppering</h2>
            {groups.map(g => (
              <div key={g.key} className="card" style={panel}>
                <div className="eyebrow">{g.dateLabel}</div>
                {g.dateLine && <div style={{ fontSize: 12, color: 'var(--olive-deep)', fontWeight: 600 }}>✓ {g.dateLine}</div>}
                {g.placeLine && <div style={{ fontSize: 12, color: 'var(--olive-deep)', fontWeight: 600 }}>✓ {g.placeLine}</div>}
                <div style={{ fontWeight: 500, margin: '2px 0 10px' }}>{g.label} <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginLeft: 6 }}>forslag</span></div>
                <div className="stack" style={{ gap: 6 }}>
                  {g.items.map(it => {
                    const meta = imp.groupMeta[g.key] || {};
                    const n = num(it);
                    const showConfirm = imp.confirm?.id === it.id;
                    return (
                      <div key={it.id}>
                        <div className="row wrap" style={{ gap: 10, fontSize: 13 }}>
                          <Thumb item={it} size={40} />
                          <span style={{ flex: 1, minWidth: 120 }}>
                            <span style={{ display: 'block', color: it.taken ? '#2E352F' : '#A9553C' }}>{takenLabel(it)}</span>
                            <span style={{ display: 'block', color: 'var(--muted)' }}>{posLabel(it)}</span>
                          </span>
                          {!it.taken && <input type="date" value="" onChange={e => setItemDate(it.id, e.target.value)} aria-label={'Dato for bilde ' + n} style={{ minHeight: 36, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(46,53,47,.25)', background: 'var(--cream)', fontSize: 13 }} />}
                          {!!it.taken && meta.dateFrom == null && <button className="btn btn-outline clear" style={{ minHeight: 36, padding: '0 10px', fontSize: 12 }} onClick={() => impSet({ confirm: { id: it.id, kind: 'dato' } })}>Bruk dato fra bildet</button>}
                          {!!it.pos && !!it.place && meta.placeFrom == null && <button className="btn btn-outline clear" style={{ minHeight: 36, padding: '0 10px', fontSize: 12 }} onClick={() => impSet({ confirm: { id: it.id, kind: 'sted' } })}>Bruk bildets sted</button>}
                        </div>
                        {showConfirm && (
                          <div role="alertdialog" aria-label="Bekreft endring for gruppen" className="fade" style={{ margin: '4px 0 6px 50px', padding: '10px 12px', border: '1px solid #A9553C', borderRadius: 8, background: 'var(--cream)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <span>{confirmText(it)}</span>
                            <span className="row" style={{ gap: 6 }}>
                              <button className="btn btn-dark" style={{ minHeight: 38, padding: '0 14px', fontSize: 13 }} onClick={impConfirmDo}>Bekreft</button>
                              <button className="btn btn-ghost" style={{ minHeight: 38, padding: '0 12px', fontSize: 13 }} onClick={() => impSet({ confirm: null })}>Avbryt</button>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="row" style={{ gap: 8, marginTop: 16 }}>
              <button className="btn btn-outline clear btn-lg" style={{ padding: '0 16px' }} onClick={() => step(1)}>Tilbake</button>
              <button className="btn btn-dark btn-lg" style={{ flex: 1 }} onClick={() => step(3)}>Bekreft og organiser</button>
            </div>
          </>
        )}

        {imp.step === 3 && (
          <>
            <h2 style={h2}>Hvilken reise?</h2>
            <div className="stack" style={{ gap: 8, marginBottom: 22 }}>
              {trips.map(t => {
                const sel = imp.tripChoice === t.id;
                return (
                  <button key={t.id} onClick={() => impSet({ tripChoice: t.id })} aria-pressed={sel} className="row" style={{ gap: 12, textAlign: 'left', minHeight: 56, padding: '10px 14px', borderRadius: 10, background: 'var(--paper)', border: '1px solid ' + (sel ? '#2E352F' : 'rgba(46,53,47,.15)') }}>
                    <Radio on={sel} />
                    <span style={{ flex: 1 }}><span style={{ display: 'block', fontWeight: 500 }}>{t.title}</span><span className="xs muted" style={{ display: 'block' }}>{t.destLabel} · {t.dateLabel}</span></span>
                  </button>
                );
              })}
              <button onClick={() => impSet({ tripChoice: 'ny' })} aria-pressed={imp.tripChoice === 'ny'} className="row" style={{ gap: 12, textAlign: 'left', minHeight: 56, padding: '10px 14px', borderRadius: 10, background: 'transparent', border: '1px dashed rgba(46,53,47,.35)' }}>
                <Radio on={imp.tripChoice === 'ny'} /><span style={{ flex: 1, fontWeight: 500 }}>Ny reise</span>
              </button>
              {imp.tripChoice === 'ny' && <input className="input" value={imp.newTripTitle} onChange={e => impSet({ newTripTitle: e.target.value })} placeholder="Tittel på den nye reisen" aria-label="Tittel på den nye reisen" />}
            </div>
            <h2 style={h2}>Hvor skal gruppene?</h2>
            {groups.map(g => (
              <div key={g.key} className="row wrap" style={{ gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(46,53,47,.1)' }}>
                <span style={{ flex: 1, minWidth: 160 }}><span style={{ display: 'block', fontWeight: 500 }}>{g.dateLabel}</span><span className="xs muted" style={{ display: 'block' }}>{g.count} bilder</span></span>
                <select value={target(g.key)} onChange={e => setGroupTarget(g.key, e.target.value as 'dag' | 'minne' | 'bilder')} aria-label={'Plassering for ' + g.dateLabel} style={{ minHeight: 44, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(46,53,47,.25)', background: 'var(--paper)', fontSize: 14 }}>
                  <option value="dag">{g.dayLabel}</option>
                  <option value="minne">Nytt minne</option>
                  <option value="bilder">Bare i «Bilder»</option>
                </select>
              </div>
            ))}
            <h2 style={{ ...h2, margin: '22px 0 4px' }}>Forsidebilde, rekkefølge og bildetekster</h2>
            <p className="small muted" style={{ margin: '0 0 10px' }}>Valgfritt nå – kan endres senere under «Bilder». Standard: alle bilder er med i boken, ingen er fremhevet. Forside, fremheving og bok-utvalg er tre separate valg, og ingen av dem lager kopier.</p>
            <div className="stack" style={{ gap: 8 }}>
              {items.map((it, i) => (
                <div key={it.id} className="card-sm row" style={{ alignItems: 'flex-start', gap: 10, padding: '8px 10px' }}>
                  <Thumb item={it} size={56} />
                  <div className="stack" style={{ flex: 1, minWidth: 0, gap: 6 }}>
                    <input value={it.caption} onChange={e => setImpCaption(it.id, e.target.value)} placeholder="Bildetekst …" aria-label={'Bildetekst for bilde ' + (i + 1)} style={{ width: '100%', minHeight: 40, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(46,53,47,.15)', background: 'var(--cream)', fontSize: 14 }} />
                    <div className="row wrap" style={{ gap: 4 }}>
                      <button className="chip chip-sm feat" aria-pressed={it.featured} onClick={() => toggleImpFeat(it.id)}>{it.featured ? '★ Fremhevet i reiseboken' : '☆ Fremhev i reiseboken'}</button>
                      <button className="chip chip-sm book" aria-pressed={it.inBook !== false} onClick={() => toggleImpBook(it.id)}>{it.inBook !== false ? '✓ Tas med i bokvisningen' : 'Ikke med i boken'}</button>
                      <button className="chip chip-sm cover" aria-pressed={imp.cover === it.id} onClick={() => impSet({ cover: it.id })}>{imp.cover === it.id ? '● Forsidebilde' : 'Bruk som forside'}</button>
                    </div>
                  </div>
                  <span className="stack">
                    <button onClick={() => moveImp(it.id, -1)} aria-label="Flytt opp" style={{ width: 32, height: 22, border: 0, background: 'transparent', fontSize: 12, color: 'var(--muted)' }}>▲</button>
                    <button onClick={() => moveImp(it.id, 1)} aria-label="Flytt ned" style={{ width: 32, height: 22, border: 0, background: 'transparent', fontSize: 12, color: 'var(--muted)' }}>▼</button>
                  </span>
                </div>
              ))}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 20 }}>
              <button className="btn btn-outline clear btn-lg" style={{ padding: '0 16px' }} onClick={() => step(2)}>Tilbake</button>
              <button className="btn btn-primary btn-lg" style={{ flex: 1, whiteSpace: 'normal', textAlign: 'center' }} onClick={startUpload}>Legg til {items.length} bilder i «{tripTitle}»</button>
            </div>
          </>
        )}

        {imp.step === 4 && (
          <>
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <div style={{ fontWeight: 600 }} role="status">{summary}</div>
                <div className="xs muted">{pct} %</div>
              </div>
              <div className="progress" style={{ margin: '10px 0' }}><div style={{ width: pct + '%' }} /></div>
              {net > 0 && <p className="small muted" style={{ margin: '6px 0 10px' }}>Bildene er lagret på denne telefonen og venter på nett. Du kan lukke appen – køen fortsetter når du åpner den igjen med nett. Store opplastinger fullføres ikke i bakgrunnen mens appen er lukket.</p>}
              {fail > 0 && <p className="small" style={{ margin: '6px 0 10px', color: '#A9553C' }}>{fail} bilder kunne ikke lastes opp. De er fortsatt lagret på telefonen. Nytt forsøk lager ikke duplikater.</p>}
              <div className="row wrap" style={{ gap: 8 }}>
                {canRetry && <button className="btn btn-primary" style={{ padding: '0 16px', fontSize: 14 }} onClick={retryFailed}>Prøv igjen</button>}
                {ok > 0 && (imp.added || imp.tripChoice !== 'ny') &&<button className="btn btn-outline clear" style={{ fontSize: 14 }} onClick={() => navigate(paths.trip(imp.resultTripId || imp.tripChoice, { tab: 'bilder' }))}>Åpne reisen</button>}
              </div>
            </div>
            <div className="stack" style={{ gap: 6 }}>
              {items.map(it => (
                <div key={it.id} className="row" style={{ gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(46,53,47,.08)', fontSize: 14 }}>
                  <Thumb item={it} size={40} />
                  <span className="muted" style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</span>
                  <span className="row" style={{ gap: 6, fontWeight: 500, color: STATUS_COLOR[it.status] }}><Dot color={STATUS_COLOR[it.status]} size={8} />{STATUS_LABEL[it.status]}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #2E352F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      {on && <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2E352F' }} />}
    </span>
  );
}
