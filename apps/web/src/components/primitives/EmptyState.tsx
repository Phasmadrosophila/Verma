import React from 'react';
import { Button } from './Button';
import clsx from 'clsx';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}) => {
  return (
    <div
      role="region"
      aria-label={title}
      className={clsx(
        'flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-[var(--radius-xl)] bg-[var(--color-paper)] border border-[var(--color-border)] shadow-xs max-w-lg mx-auto my-6',
        className
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-full bg-[var(--color-canvas)] border border-[var(--color-border)] flex items-center justify-center mb-4 text-[var(--color-brand-orange)] flex-shrink-0">
          {icon}
        </div>
      )}

      <h3 className="text-interface-heading font-semibold text-[var(--color-text)] mb-2">
        {title}
      </h3>

      <p className="text-body text-[var(--color-text-muted)] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {secondaryAction && (
            <Button variant="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button variant="primary" leftIcon={action.icon} onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
