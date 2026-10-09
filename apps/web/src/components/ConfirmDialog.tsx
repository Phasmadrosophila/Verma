import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  consequence?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  consequence,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus confirm button when dialog opens
    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>('button, [tabindex="0"]') ?? []
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-[var(--radius-xl)] bg-[var(--color-paper)] border border-[var(--color-border)] p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                isDestructive
                  ? 'bg-red-500/10 text-red-600'
                  : 'bg-[var(--color-warm-surface)] text-[var(--color-brand-orange)]'
              )}
            >
              {isDestructive ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            </div>
            <div>
              <h3 id="dialog-title" className="text-base font-semibold text-[var(--color-text)]">
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="p-1 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-canvas)] transition-colors focus:ring-2 focus:ring-[var(--color-brand-orange)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div id="dialog-desc" className="flex flex-col gap-2 text-sm text-[var(--color-text-muted)]">
          <p className="leading-relaxed">{description}</p>
          {consequence && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-canvas)] border border-[var(--color-border)] text-xs text-[var(--color-text)] flex items-start gap-2">
              <span className="font-semibold flex-shrink-0">Note:</span>
              <span>{consequence}</span>
            </div>
          )}
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-canvas)] text-sm font-medium text-[var(--color-text)] transition-colors focus:ring-2 focus:ring-[var(--color-brand-orange)]"
          >
            {cancelText}
          </button>

          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className={clsx(
              'px-5 py-2 rounded-full text-sm font-semibold transition-opacity focus:ring-2 focus:ring-[var(--color-brand-orange)]',
              isDestructive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-[var(--color-brand-orange)] text-[var(--color-text)] hover:opacity-90'
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
