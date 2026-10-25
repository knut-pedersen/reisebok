import { useEffect, useRef, type ReactNode } from 'react';

/** Asks before something is deleted for good. Focus starts on «Avbryt». */
export default function ConfirmDialog({ title, children, confirmLabel, onConfirm, onClose }: { title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, []);
  return (
    <div className="scrim" onClick={onClose} style={{ alignItems: 'center', zIndex: 1070 }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, gap: 12 }}>
        <h2 id="confirm-title" className="serif" style={{ fontSize: 22, fontWeight: 500 }}>{title}</h2>
        <div className="small muted" style={{ fontSize: 14 }}>{children}</div>
        <div className="row wrap" style={{ gap: 8, marginTop: 4 }}>
          <button className="btn btn-primary" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
          <button ref={cancelRef} className="btn btn-ghost" onClick={onClose}>Avbryt</button>
        </div>
      </div>
    </div>
  );
}

/** Quiet, clearly labelled delete link used at the bottom of pages. */
export function DeleteLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ border: 0, background: 'transparent', padding: '6px 0', minHeight: 40, color: 'var(--terracotta)', fontWeight: 500, fontSize: 14, textAlign: 'left' }}>
      {label}
    </button>
  );
}
