import { useEffect, useId, useRef } from 'react';
import Button from './Button';

const confirmVariantClass = {
  primary: 'primary',
  danger: 'danger',
  success: 'success',
};

export default function ConfirmDialog({
  open,
  title = 'Confirm Action',
  description = 'Are you sure you want to continue?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  busy = false,
  onConfirm,
  onCancel,
  children,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const raf = window.requestAnimationFrame(() => {
      cancelButtonRef.current?.focus();
    });

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onCancel?.();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-lg surface-card p-6 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-main text-lg font-semibold">
          {title}
        </h2>
        <p id={descriptionId} className="text-soft mt-2 text-sm">
          {description}
        </p>
        {children ? <div className="mt-4">{children}</div> : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button ref={cancelButtonRef} variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariantClass[confirmVariant] || 'primary'}
            onClick={onConfirm}
            loading={busy}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
