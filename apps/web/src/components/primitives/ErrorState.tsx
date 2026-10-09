import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';
import clsx from 'clsx';

export interface ErrorStateProps {
  title: string;
  description: string;
  consequence?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  description,
  consequence,
  action,
  secondaryAction,
  className,
}) => {
  return (
    <div
      role="alert"
      className={clsx(
        'flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-[var(--radius-xl)] bg-[var(--color-paper)] border border-red-500/30 shadow-xs max-w-lg mx-auto my-6',
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-600 flex-shrink-0">
        <AlertCircle className="w-7 h-7" />
      </div>

      <h3 className="text-interface-heading font-semibold text-[var(--color-text)] mb-2">
        {title}
      </h3>

      <p className="text-body text-[var(--color-text-muted)] max-w-sm mb-4 leading-relaxed">
        {description}
      </p>

      {consequence && (
        <div className="w-full p-3 rounded-[var(--radius-md)] bg-[var(--color-canvas)] border border-[var(--color-border)] text-xs text-[var(--color-text)] mb-6 text-left">
          <span className="font-semibold text-[var(--color-text)]">Status: </span>
          <span>{consequence}</span>
        </div>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {secondaryAction && (
            <Button variant="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button variant="primary" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
