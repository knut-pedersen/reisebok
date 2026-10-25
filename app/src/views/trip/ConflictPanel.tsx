import { useState } from 'react';
import { Avatar } from '../../components/bits';
import type { Conflict } from '../../data/types';
import { fmtTime, PEOPLE, type Person } from '../../lib/format';

/** Both of you rewrote the same shared text: show both versions and let one be kept, or a combined one written. */
export default function ConflictPanel({ conflict, me, what, onResolve }: { conflict: Conflict; me: Person; what: string; onResolve: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [merge, setMerge] = useState('');
  const author = PEOPLE[conflict.by];
  const mutedSmall = { minHeight: 38, padding: '0 12px', borderRadius: 999, border: '1px solid var(--line-strong)', background: 'transparent', fontSize: 13, fontWeight: 500 };
  const resolve = (text: string) => { onResolve(text); setOpen(false); };
  return (
    <>
      <div className="row wrap" style={{ marginTop: 16, background: 'var(--paper)', border: '1px solid var(--terracotta)', borderRadius: 10, padding: '14px 16px', gap: 12, alignItems: 'flex-start' }}>
        <Avatar who={author} size={26} />
        <div style={{ flex: 1, minWidth: 200, fontSize: 14 }}><strong>{author.name} endret {what} samtidig som deg</strong> ({fmtTime(conflict.at)}). Begge versjonene er beholdt. Sammenlign før dere lagrer en felles versjon.</div>
        <button className="btn btn-primary btn-sm" onClick={() => { setOpen(true); setMerge(conflict.theirs); }}>Sammenlign</button>
      </div>
      {open && (
        <div className="card-sm fade" style={{ marginTop: 10, padding: 16, borderColor: 'rgba(46,53,47,.15)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
            <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Din versjon ({me.name})</div>
              <p className="serif" style={{ margin: '0 0 10px', fontSize: 17 }}>{conflict.mine}</p>
              <button style={mutedSmall} onClick={() => resolve(conflict.mine)}>Behold min</button>
            </div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>{author.name}s versjon</div>
              <p className="serif" style={{ margin: '0 0 10px', fontSize: 17 }}>{conflict.theirs}</p>
              <button style={mutedSmall} onClick={() => resolve(conflict.theirs)}>Behold {author.name}s</button>
            </div>
          </div>
          <div className="eyebrow" style={{ margin: '14px 0 6px' }}>Eller skriv en felles versjon</div>
          <textarea className="input" rows={3} value={merge} onChange={e => setMerge(e.target.value)} aria-label="Felles versjon" style={{ padding: '10px 12px', fontSize: 17 }} />
          <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn btn-dark btn-sm" style={{ padding: '0 16px' }} onClick={() => resolve(merge)}>Lagre felles versjon</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Avbryt</button>
          </div>
        </div>
      )}
    </>
  );
}
