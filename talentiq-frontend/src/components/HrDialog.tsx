import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Accessible native dialog: focus containment, Escape, and focus restoration. */
export function HrDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => { node?.close(); };
  }, []);
  return <dialog ref={dialog} className="hr-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="hr-dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="hr-icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>
    {children}
  </dialog>;
}
