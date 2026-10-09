import React from 'react';
import {
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Shield,
  WifiOff,
  X,
} from 'lucide-react';
import clsx from 'clsx';

export type StatusBannerVariant =
  | 'info'
  | 'warning'
  | 'error'
  | 'success'
  | 'ai-boundary'
  | 'offline';

export interface StatusBannerProps {
  variant?: StatusBannerVariant;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const VARIANT_CONFIGS = {
  info: {
    icon: Info,
    containerClass: 'bg-[var(--color-paper)] border-[var(--color-border)] text-[var(--color-text)]',
    iconClass: 'text-[var(--color-brand-periwinkle)]',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-[var(--color-warm-surface)]/80 border-[var(--color-brand-orange)]/40 text-[var(--color-text)]',
    iconClass: 'text-[var(--color-brand-orange)]',
  },
  error: {
    icon: XCircle,
    containerClass: 'bg-red-500/10 border-red-500/30 text-[var(--color-text)]',
    iconClass: 'text-red-600',
  },
  success: {
    icon: CheckCircle2,
    containerClass: 'bg-green-500/10 border-green-500/30 text-[var(--color-text)]',
    iconClass: 'text-green-600',
  },
  'ai-boundary': {
    icon: Shield,
    containerClass: 'bg-[var(--color-assist-surface)] border-[var(--color-brand-periwinkle)]/50 text-[var(--color-text)]',
    iconClass: 'text-[var(--color-brand-periwinkle)]',
  },
  offline: {
    icon: WifiOff,
    containerClass: 'bg-[var(--color-paper)] border-[var(--color-border)] text-[var(--color-text)]',
    iconClass: 'text-[var(--color-text-muted)]',
  },
};

export const StatusBanner: React.FC<StatusBannerProps> = ({
  variant = 'info',
  title,
  description,
  action,
  dismissible = false,
  onDismiss,
  className,
}) => {
  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.info;
  const IconComponent = config.icon;

  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';

  return (
    <div
      role={role}
      aria-label={title}
      className={clsx(
        'p-4 rounded-[var(--radius-lg)] border flex items-start justify-between gap-4 transition-all',
        config.containerClass,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <IconComponent className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', config.iconClass)} />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-[var(--color-text)] leading-snug">
            {title}
          </span>
          {description && (
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-brand-orange)] text-[var(--color-text)] hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]"
          >
            {action.label}
          </button>
        )}
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss banner"
            className="p-1 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-canvas)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
