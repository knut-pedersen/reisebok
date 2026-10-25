import type { CSSProperties } from 'react';
import type { RatingRow } from '../../store/derive';
import { Avatar } from '../../components/bits';

/** Small round action buttons used across the trip, memory and place pages. */
export const pill = {
  dark: { minHeight: 40, padding: '0 14px', borderRadius: 999, border: 0, background: 'var(--ink)', color: 'var(--paper)', fontWeight: 600, fontSize: 14 } as CSSProperties,
  outline: { minHeight: 40, padding: '0 14px', borderRadius: 999, border: '1px solid var(--line-strong)', background: 'transparent', fontWeight: 500, fontSize: 13 } as CSSProperties,
  link: { border: 0, background: 'transparent', padding: '6px 0', color: 'var(--terracotta)', fontWeight: 500 } as CSSProperties,
};

/** Read-only rating: the two people side by side, «Ikke vurdert» distinct from a low score. */
export function RatingCell({ r }: { r: RatingRow }) {
  return (
    <div>
      <div className="row" style={{ gap: 6, fontSize: 13, fontWeight: 600 }}><Avatar who={r} size={20} />{r.name}</div>
      {r.rated ? <div aria-label={r.starLabel} style={{ color: 'var(--terracotta)', fontSize: 18, letterSpacing: 1, lineHeight: 1.2 }}>{r.stars}</div> : <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Ikke vurdert</div>}
      {r.text && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{r.text}</div>}
    </div>
  );
}
