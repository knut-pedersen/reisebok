import type { CSSProperties, ReactNode } from 'react';
import type { PersonId } from '../data/types';
import { PEOPLE, type Person } from '../lib/format';

export function Avatar({ who, size = 26, border, style }: { who: PersonId | Person; size?: number; border?: boolean; style?: CSSProperties }) {
  const p = typeof who === 'string' ? PEOPLE[who] : who;
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.44), background: p.color, border: border ? '2px solid var(--paper)' : undefined, ...style }}>
      {p.initial}
    </span>
  );
}

export function Pair({ size = 28 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex' }} aria-hidden="true">
      <Avatar who="knut" size={size} border />
      <Avatar who="anna" size={size} border style={{ marginLeft: -8 }} />
    </span>
  );
}

export function Pin({ glyph, size = 30, bg, style }: { glyph: string; size?: number; bg?: string; style?: CSSProperties }) {
  return (
    <span className="pin" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.4)), background: bg, ...style }}>
      {glyph}
    </span>
  );
}

export function Dot({ color, size = 9, style }: { color: string; size?: number; style?: CSSProperties }) {
  return <span className="dot" style={{ background: color, width: size, height: size, ...style }} />;
}

export function Eyebrow({ children, accent, style }: { children: ReactNode; accent?: boolean; style?: CSSProperties }) {
  return <div className={'eyebrow' + (accent ? ' accent' : '')} style={style}>{children}</div>;
}

export function Empty({ title, children, hand, style }: { title: ReactNode; children?: ReactNode; hand?: boolean; style?: CSSProperties }) {
  return (
    <div className="empty" style={style}>
      <div className={hand ? 'hand' : 'empty-title'} style={hand ? { fontSize: 28, color: 'var(--olive-deep)' } : undefined}>{title}</div>
      {children}
    </div>
  );
}

/** Back link shown above pages on desktop (mobile has it in the top bar). */
export function BackLink({ label = '‹ Tilbake', onClick }: { label?: string; onClick: () => void }) {
  return <button type="button" className="back-link" onClick={onClick}>{label}</button>;
}
