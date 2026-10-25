import { useState, type ReactNode } from 'react';
import { Avatar } from '../components/bits';
import { sendCode, signOut, verifyCode } from '../sync/client';
import { login, useStore } from '../store/store';

/** Turns Supabase auth errors into something useful in Norwegian. */
function explain(e: unknown, step: 'send' | 'verify') {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  const status = (e as { status?: number })?.status;
  if (status === 429 || msg.includes('rate limit') || msg.includes('only request this after') || msg.includes('security purposes')) return 'Det er sendt mange e-poster på kort tid. Vent litt og prøv igjen – Supabase sender bare noen få i timen.';
  if (msg.includes('fetch') || msg.includes('network') || !navigator.onLine) return 'Fikk ikke kontakt med serveren. Sjekk nettet og prøv igjen.';
  if (step === 'send' && (msg.includes('signups not allowed') || msg.includes('not found') || msg.includes('not allowed') || status === 400 || status === 422)) return 'Denne adressen har ikke tilgang til reiseboken.';
  if (step === 'verify' && (msg.includes('expired') || msg.includes('invalid') || status === 403 || status === 401)) return 'Koden stemmer ikke eller er utløpt. Sjekk at du bruker den nyeste koden, eller be om en ny.';
  return 'Noe gikk galt. Prøv igjen om litt.';
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', background: 'var(--cream)', overflow: 'auto' }}>
      <div className="hand" style={{ fontSize: 30, color: 'var(--terracotta)', lineHeight: 1 }}>Knut &amp; Anna</div>
      <h1 className="serif" style={{ fontWeight: 500, fontSize: 48, lineHeight: 1.05, margin: '10px 0 14px', letterSpacing: '-.01em' }}>Vår reisebok</h1>
      <p className="muted" style={{ margin: '0 0 36px', fontSize: 17, maxWidth: 360, textWrap: 'pretty' }}>Stedene vi har vært. Øyeblikkene vi vil huske.</p>
      {children}
    </div>
  );
}

export default function LoginPage() {
  const mode = useStore(s => s.mode);
  const authState = useStore(s => s.authState);
  const email = useStore(s => s.email);
  if (mode === 'local') return <LocalLogin />;
  if (authState === 'checking') return <div style={{ position: 'fixed', inset: 0, background: 'var(--cream)' }} aria-busy="true" />;
  if (authState === 'noAccess') {
    return (
      <Frame>
        <div className="stack" style={{ gap: 12, width: '100%', maxWidth: 340 }}>
          <p style={{ fontSize: 15 }}><strong>{email || 'Denne adressen'}</strong> er logget inn, men står ikke på listen over de to som har tilgang til arkivet.</p>
          <p className="small muted">Logg ut og bruk adressen som er registrert, eller legg adressen til i medlemslisten i Supabase.</p>
          <button className="btn btn-dark" style={{ minHeight: 52, fontSize: 16 }} onClick={() => void signOut()}>Logg ut</button>
        </div>
      </Frame>
    );
  }
  return <CodeLogin />;
}

function LocalLogin() {
  return (
    <Frame>
      <div className="stack" style={{ gap: 12, width: '100%', maxWidth: 320 }}>
        <button className="btn btn-dark" style={{ minHeight: 52, fontSize: 16, gap: 10 }} onClick={() => login('knut')}><Avatar who="knut" size={28} />Fortsett som Knut</button>
        <button className="btn btn-dark" style={{ minHeight: 52, fontSize: 16, gap: 10 }} onClick={() => login('anna')}><Avatar who="anna" size={28} />Fortsett som Anna</button>
      </div>
      <p className="xs muted" style={{ margin: '28px 0 0', maxWidth: 320 }}>Ikke koblet til det felles arkivet – alt lagres bare på denne telefonen.</p>
    </Frame>
  );
}

function CodeLogin() {
  const [addr, setAddr] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const send = async (again = false) => {
    const a = addr.trim();
    if (!/^\S+@\S+\.\S+$/.test(a)) { setError('Skriv inn en gyldig e-postadresse.'); return; }
    setBusy(true); setError(''); setInfo('');
    try {
      await sendCode(a);
      setSent(true);
      if (again) setInfo('En ny lenke er sendt.');
    } catch (e) {
      setError(explain(e, 'send'));
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    const c = code.replace(/\s/g, '');
    if (!/^\d{6,10}$/.test(c)) { setError('Koden består av sifre fra e-posten.'); return; }
    setBusy(true); setError(''); setInfo('');
    try {
      await verifyCode(addr.trim(), c);
      // The auth listener signs us in and shows the app.
    } catch (e) {
      setError(explain(e, 'verify'));
      setBusy(false);
    }
  };
  const field = { minHeight: 52, fontSize: 17, textAlign: 'center' as const };

  return (
    <Frame>
      <form className="stack" style={{ gap: 12, width: '100%', maxWidth: 340 }} onSubmit={e => { e.preventDefault(); void (sent ? verify() : send()); }}>
        {!sent ? (
          <>
            <label className="field" style={{ textAlign: 'left' }}>
              E-postadressen din
              <input className="input" type="email" inputMode="email" autoComplete="email" autoFocus value={addr} onChange={e => setAddr(e.target.value)} placeholder="navn@eksempel.no" style={field} disabled={busy} />
            </label>
            <button type="submit" className="btn btn-dark" style={{ minHeight: 52, fontSize: 16 }} disabled={busy}>{busy ? 'Sender …' : 'Send innloggingslenke'}</button>
            <p className="xs muted">Du får en innloggingslenke på e-post. Ingen passord å huske.</p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 15 }}>Vi har sendt en innloggingslenke til <strong>{addr.trim()}</strong>.</p>
            <p className="small muted">Åpne e-posten på denne telefonen og trykk på lenken. Åpner den seg i nettleseren, kan du gå tilbake til appen etterpå – du er da logget inn.</p>
            <label className="field" style={{ textAlign: 'left' }}>
              Har e-posten en kode? Skriv den inn her
              <input className="input mono" inputMode="numeric" autoComplete="one-time-code" autoFocus value={code} onChange={e => setCode(e.target.value)} placeholder="123456" style={{ ...field, letterSpacing: '.3em' }} disabled={busy} />
            </label>
            <button type="submit" className="btn btn-dark" style={{ minHeight: 52, fontSize: 16 }} disabled={busy}>{busy ? 'Logger inn …' : 'Logg inn med koden'}</button>
            <div className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void send(true)}>Send ny lenke</button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setSent(false); setCode(''); setError(''); setInfo(''); }}>Bruk en annen adresse</button>
            </div>
          </>
        )}
        {error && <p role="alert" className="small" style={{ color: 'var(--terracotta)', fontWeight: 500 }}>{error}</p>}
        {info && <p role="status" className="small muted">{info}</p>}
      </form>
      <p className="xs muted" style={{ margin: '28px 0 0', maxWidth: 320 }}>Privat arkiv for to. Bare Knut og Anna kan logge inn.</p>
    </Frame>
  );
}
