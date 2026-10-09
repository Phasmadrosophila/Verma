import React from 'react';
import { Sparkles, Check, X, Edit2, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

export type SuggestionStatus = 'proposed' | 'accepted' | 'rejected';

export interface SuggestionCardProps {
  id?: string;
  type?: 'tag' | 'mapping' | 'deduplication' | 'general';
  title: string;
  description: string;
  proposedValue: string | string[];
  originalValue?: string | string[];
  confidence?: 'high' | 'medium' | 'low';
  status?: SuggestionStatus;
  reason?: string;
  onAccept: () => void;
  onReject: () => void;
  onEdit?: () => void;
  className?: string;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  type = 'general',
  title,
  description,
  proposedValue,
  originalValue,
  confidence = 'high',
  status = 'proposed',
  reason,
  onAccept,
  onReject,
  onEdit,
  className,
}) => {
  const isProposed = status === 'proposed';
  const isAccepted = status === 'accepted';
  const isRejected = status === 'rejected';

  const formatValue = (val: string | string[]) => {
    if (Array.isArray(val)) {
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {val.map((item, idx) => (
            <span
              key={idx}
              className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] font-medium text-[var(--color-text)]"
            >
              #{item}
            </span>
          ))}
        </div>
      );
    }
    return <span className="font-mono text-xs font-semibold">{val}</span>;
  };

  return (
    <div
      data-testid="suggestion-card"
      data-status={status}
      className={clsx(
        'p-5 rounded-[var(--radius-lg)] border transition-all flex flex-col gap-3',
        isProposed &&
          'bg-[var(--color-assist-surface)] border-[var(--color-brand-periwinkle)]/50 shadow-sm',
        isAccepted &&
          'bg-[var(--color-surface)] border-green-500/40 opacity-95',
        isRejected &&
          'bg-[var(--color-canvas)] border-[var(--color-border)] opacity-60',
        className
      )}
    >
      {/* Top Header: Badge + Confidence */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isProposed ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--color-brand-periwinkle)]/20 text-[var(--color-text)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand-periwinkle)]" />
              Suggestion · {type === 'tag' ? 'Tags' : type === 'mapping' ? 'Mapping' : 'Action'}
            </span>
          ) : isAccepted ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-700">
              <Check className="w-3.5 h-3.5" />
              Applied to Vault
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-500/10 text-zinc-600">
              <X className="w-3.5 h-3.5" />
              Rejected
            </span>
          )}

          {confidence && isProposed && (
            <span
              className={clsx(
                'text-[10px] uppercase font-mono px-2 py-0.5 rounded',
                confidence === 'high'
                  ? 'bg-green-500/15 text-green-700 font-medium'
                  : confidence === 'medium'
                    ? 'bg-amber-500/15 text-amber-700 font-medium'
                    : 'bg-zinc-500/15 text-zinc-600'
              )}
            >
              {confidence} confidence
            </span>
          )}
        </div>

        {isProposed && (
          <span className="text-[11px] text-[var(--color-text-muted)] italic">
            Not saved yet
          </span>
        )}
      </div>

      {/* Main Title & Description */}
      <div>
        <h4 className="text-sm font-semibold text-[var(--color-text)]">{title}</h4>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Comparison: Original vs Proposed */}
      <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-paper)] border border-[var(--color-border)] flex flex-col gap-2">
        {originalValue && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span className="font-medium text-[var(--color-text-muted)]">Current:</span>
            {formatValue(originalValue)}
            <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] mx-1" />
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-[var(--color-text)]">Proposed:</span>
          {formatValue(proposedValue)}
        </div>
        {reason && (
          <div className="text-[11px] text-[var(--color-text-muted)] mt-1 pt-1 border-t border-[var(--color-border)]">
            <span className="font-medium text-[var(--color-text)]">Why:</span> {reason}
          </div>
        )}
      </div>

      {/* Action Decision Controls (Accept / Edit / Reject) */}
      {isProposed && (
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--color-border)]/60">
          <button
            type="button"
            onClick={onReject}
            aria-label="Reject suggestion"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--color-border)] bg-[var(--color-paper)] hover:bg-[var(--color-canvas)] text-[var(--color-text)] transition-colors focus:ring-2 focus:ring-[var(--color-brand-orange)]"
          >
            <X className="w-3.5 h-3.5 text-zinc-500" />
            Reject
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit suggestion"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--color-border)] bg-[var(--color-paper)] hover:bg-[var(--color-canvas)] text-[var(--color-text)] transition-colors focus:ring-2 focus:ring-[var(--color-brand-orange)]"
            >
              <Edit2 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              Edit
            </button>
          )}

          <button
            type="button"
            onClick={onAccept}
            aria-label="Accept suggestion"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-brand-orange)] text-[var(--color-text)] hover:opacity-90 transition-opacity focus:ring-2 focus:ring-[var(--color-brand-orange)]"
          >
            <Check className="w-3.5 h-3.5 text-[var(--color-text)]" />
            Accept
          </button>
        </div>
      )}
    </div>
  );
};
