import React from 'react';
import { KeyRound, FileText, Globe, Tag, ExternalLink, Lock, Eye } from 'lucide-react';
import type { RedactedEntryMetadata } from '@app/shared';
import clsx from 'clsx';

export interface VaultResultCardProps {
  metadata: RedactedEntryMetadata;
  searchReason?: string;
  onRevealClick?: (id: string) => void;
  onOpenDetails?: (id: string) => void;
  className?: string;
}

export const VaultResultCard: React.FC<VaultResultCardProps> = ({
  metadata,
  searchReason,
  onRevealClick,
  onOpenDetails,
  className,
}) => {
  const isLogin = metadata.type === 'login';
  const isApiKey = metadata.type === 'api_key';

  const TypeIcon = isLogin ? Globe : isApiKey ? KeyRound : FileText;

  return (
    <div
      data-testid="vault-result-card"
      data-entry-id={metadata.id}
      className={clsx(
        'p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-brand-orange)]/40 transition-all flex flex-col gap-3 shadow-xs',
        className
      )}
    >
      {/* Top Header: Type Icon, Title, and Domain/Tags */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[var(--color-canvas)] flex items-center justify-center flex-shrink-0 text-[var(--color-text)]">
            <TypeIcon className="w-4 h-4 text-[var(--color-brand-orange)]" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[var(--color-text)] flex flex-wrap items-center gap-2">
              <span className="break-words min-w-0">{metadata.title}</span>
              {metadata.domain && (
                <span className="text-xs text-[var(--color-text-muted)] font-normal break-all">
                  ({metadata.domain})
                </span>
              )}
            </h4>
            {searchReason && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Matched: {searchReason}
              </p>
            )}
          </div>
        </div>

        {onOpenDetails && (
          <button
            type="button"
            onClick={() => onOpenDetails(metadata.id)}
            aria-label={`View details for ${metadata.title}`}
            className="p-1 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-canvas)] transition-colors focus:ring-2 focus:ring-[var(--color-brand-orange)]"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tags row */}
      {metadata.tags && metadata.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
          {metadata.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-canvas)] text-[var(--color-text-muted)] font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Secret Field Boundary (AC-C-M0-03-02) */}
      {/* Secrets are strictly masked and never rendered in result cards */}
      <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-canvas)]/60 border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Lock className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
          <span
            data-testid="masked-secret"
            aria-label="Secret hidden"
            className="font-mono text-xs tracking-widest text-zinc-500 select-none"
          >
            ••••••••
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            ({isLogin ? 'Password' : isApiKey ? 'API Key' : 'Note body'} hidden)
          </span>
        </div>

        {onRevealClick && (
          <button
            type="button"
            onClick={() => onRevealClick(metadata.id)}
            aria-label={`Unlock to reveal secret for ${metadata.title}`}
            className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-full text-xs font-semibold bg-[var(--color-paper)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-warm-surface)] transition-colors focus-ring"
          >
            <Eye className="w-3 h-3 text-[var(--color-brand-orange)]" />
            Unlock to reveal
          </button>
        )}
      </div>
    </div>
  );
};
