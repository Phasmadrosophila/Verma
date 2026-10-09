import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export interface LoadingStateProps {
  title?: string;
  description?: string;
  fullPage?: boolean;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Loading...',
  description,
  fullPage = false,
  className,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'flex flex-col items-center justify-center text-center p-8 gap-3',
        fullPage ? 'h-screen w-screen bg-[var(--color-canvas)] text-[var(--color-text)]' : 'py-12',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--color-paper)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0 text-[var(--color-brand-orange)] shadow-xs">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand-orange)]" />
      </div>

      <span className="text-sm font-semibold text-[var(--color-text)]">{title}</span>

      {description && (
        <p className="text-xs text-[var(--color-text-muted)] max-w-sm leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};
