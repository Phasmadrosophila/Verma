import React from 'react';
import { Shield, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

export type SyncStateMode = 'local' | 'offline' | 'syncing' | 'synced' | 'blocked' | 'confirming';

export interface SyncStatusBadgeProps {
  mode?: SyncStateMode;
  details?: string;
  className?: string;
}

interface StateConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  defaultDetails: string;
  badgeStyle: string;
}

const STATE_CONFIGS: Record<SyncStateMode, StateConfig> = {
  local: {
    icon: Shield,
    label: 'Local mode · On-Device',
    defaultDetails: 'Vault computation and metadata remain on this device.',
    badgeStyle: 'bg-[var(--color-paper)] text-[var(--color-text)] border-[var(--color-border)]',
  },
  offline: {
    icon: WifiOff,
    label: 'Working offline',
    defaultDetails: 'Wi-Fi disabled. Local vault and on-device AI are ready.',
    badgeStyle: 'bg-[var(--color-warm-surface)] text-[var(--color-text)] border-[var(--color-border)]',
  },
  syncing: {
    icon: RefreshCw,
    label: 'Syncing directly',
    defaultDetails: 'Connecting to paired desktop peer over authenticated transport.',
    badgeStyle: 'bg-[var(--color-assist-surface)] text-[var(--color-text)] border-[var(--color-brand-periwinkle)]/40',
  },
  synced: {
    icon: CheckCircle2,
    label: 'Synced directly',
    defaultDetails: 'Encrypted vault is up to date with paired peers.',
    badgeStyle: 'bg-green-500/10 text-green-700 border-green-500/30',
  },
  blocked: {
    icon: AlertTriangle,
    label: 'Sync blocked',
    defaultDetails: 'Peer unreachable. Local vault remains 100% available.',
    badgeStyle: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  },
  confirming: {
    icon: ShieldAlert,
    label: 'Awaiting confirmation',
    defaultDetails: 'Nothing saved yet. You confirm first.',
    badgeStyle: 'bg-[var(--color-warm-surface)] text-[var(--color-text)] border-[var(--color-brand-orange)]/40',
  },
};

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  mode = 'local',
  details,
  className,
}) => {
  const config = STATE_CONFIGS[mode] || STATE_CONFIGS.local;
  const IconComponent = config.icon;
  const isSpinning = mode === 'syncing';

  return (
    <div
      role="status"
      aria-label={`Status: ${config.label}`}
      className={clsx(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
        config.badgeStyle,
        className
      )}
      title={details || config.defaultDetails}
    >
      <IconComponent className={clsx('w-3.5 h-3.5 flex-shrink-0', isSpinning && 'animate-spin')} />
      <span className="font-medium tracking-tight">{config.label}</span>
    </div>
  );
};
