import { Avatar } from '../components/bits';
import { login } from '../store/store';

export default function LoginPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', background: 'var(--cream)' }}>
      <div className="hand" style={{ fontSize: 30, color: 'var(--terracotta)', lineHeight: 1 }}>Knut &amp; Anna</div>
      <h1 className="serif" style={{ fontWeight: 500, fontSize: 48, lineHeight: 1.05, margin: '10px 0 14px', letterSpacing: '-.01em' }}>Vår reisebok</h1>
      <p className="muted" style={{ margin: '0 0 36px', fontSize: 17, maxWidth: 360, textWrap: 'pretty' }}>Stedene vi har vært. Øyeblikkene vi vil huske.</p>
      <div className="stack" style={{ gap: 12, width: '100%', maxWidth: 320 }}>
        <button className="btn btn-dark" style={{ minHeight: 52, fontSize: 16, gap: 10 }} onClick={() => login('knut')}><Avatar who="knut" size={28} />Fortsett som Knut</button>
        <button className="btn btn-dark" style={{ minHeight: 52, fontSize: 16, gap: 10 }} onClick={() => login('anna')}><Avatar who="anna" size={28} />Fortsett som Anna</button>
      </div>
      <p className="xs muted" style={{ margin: '28px 0 0', maxWidth: 320 }}>Privat arkiv for to. Innloggingen er foreløpig simulert – ingen passord. Alt lagres på denne telefonen.</p>
    </div>
  );
}
