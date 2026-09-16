import { useEffect, useRef, type ReactNode } from 'react';

/** Native modal semantics for existing HR forms without changing their handlers. */
export function HrModalFrame({ title, onClose, children, className = 'hr-legacy-modal' }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return <dialog ref={dialogRef} className={className} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}>
    {children}
  </dialog>;
}
