import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Shield, RefreshCw, Lock } from 'lucide-react';
import { api } from '../api';
import { useVault } from '../VaultContext';
import { VaultResultCard } from '../components/VaultResultCard';
import { StatusBanner } from '../components/StatusBanner';
import { SyncStatusBadge } from '../components/SyncStatusBadge';
import type { RedactedEntryMetadata } from '@app/shared';
import clsx from 'clsx';

export const AskVault: React.FC = () => {
  const navigate = useNavigate();
  const { isLocked } = useVault();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<RedactedEntryMetadata[]>([]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isModelOffline, setIsModelOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected entry for explicit unlock reveal modal
  const [revealingEntryId, setRevealingEntryId] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  const sampleQueries = [
    'work google account',
    'github login',
    'stripe payments api key',
    'wifi credentials',
  ];

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    if (isLocked) {
      setError('Vault is locked. Unlock your vault to search metadata.');
      return;
    }

    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    setAiAnswer(null);

    try {
      // 1. Search metadata via local API
      const metaRes = await api.searchMetadata(searchQuery);
      const matches: RedactedEntryMetadata[] = metaRes.metadata || [];
      setResults(matches);

      // 2. Format local assistance answer
      if (matches.length > 0) {
        setAiAnswer(
          `Found ${matches.length} matching item(s) by analyzing non-secret metadata on this device.`
        );
      } else {
        setAiAnswer(null);
      }
    } catch (err: any) {
      if (err?.message?.includes('Locked')) {
        setError('Vault is locked. Metadata access is revoked.');
      } else {
        // Graceful fallback to offline heuristic search
        setIsModelOffline(true);
        try {
          const fallbackRes = await api.searchMetadata(searchQuery);
          setResults(fallbackRes.metadata || []);
        } catch {
          setError('Unable to perform search.');
        }
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleRevealClick = async (id: string) => {
    setRevealingEntryId(id);
    setIsRevealing(true);
    setRevealedSecret(null);

    try {
      const fullEntry = await api.getEntry(id);
      if (fullEntry.entry.type === 'login') {
        setRevealedSecret(fullEntry.entry.password || 'No password set');
      } else if (fullEntry.entry.type === 'api_key') {
        setRevealedSecret(fullEntry.entry.apiKey || 'No API key set');
      } else if (fullEntry.entry.type === 'note') {
        setRevealedSecret(fullEntry.entry.content || 'Empty note');
      }
    } catch {
      setRevealedSecret('Unable to decrypt secret. Ensure vault is unlocked.');
    } finally {
      setIsRevealing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header with Title and Trust Boundary */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Search className="w-6 h-6 text-[var(--color-brand-orange)]" />
            Ask Your Vault
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Natural-language metadata search over your offline, encrypted entries.
          </p>
        </div>

        <SyncStatusBadge mode="local" />
      </div>

      {/* Security Invariant Notice */}
      <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-assist-surface)] border border-[var(--color-brand-periwinkle)]/50 flex items-start gap-3">
        <Shield className="w-5 h-5 text-[var(--color-brand-periwinkle)] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-[var(--color-text)] leading-relaxed">
          <span className="font-semibold">Privacy Invariant: </span>
          Search operates solely over allowed metadata (titles, domains, tags, field labels).
          Passwords, recovery codes, and secret payloads are <strong>never</strong> searched or
          passed to the AI model.
        </div>
      </div>

      {isLocked && (
        <StatusBanner
          variant="warning"
          title="Vault is Locked"
          description="AI metadata access is revoked. Please unlock the vault to search."
          action={{
            label: 'Unlock Vault',
            onClick: () => navigate('/lock'),
          }}
        />
      )}

      {error && !isLocked && (
        <StatusBanner variant="error" title="Search Error" description={error} />
      )}

      {isModelOffline && (
        <StatusBanner
          variant="offline"
          title="Local AI Inference Offline"
          description="Local model is offline or disabled. Search automatically falls back to deterministic metadata keyword search."
        />
      )}

      {/* Query Input Box */}
      <div className="bg-[var(--color-paper)] p-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0" />
          <input
            type="text"
            value={query}
            disabled={isLocked}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            placeholder="e.g., 'my work google account' or 'stripe production key'"
            className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none"
          />
          <button
            type="button"
            disabled={!query.trim() || isSearching || isLocked}
            onClick={() => handleSearch()}
            className={clsx(
              'flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all focus:ring-2 focus:ring-[var(--color-brand-orange)]',
              query.trim() && !isSearching && !isLocked
                ? 'bg-[var(--color-brand-orange)] text-[var(--color-text)] hover:opacity-90'
                : 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
            )}
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Ask Vault
              </>
            )}
          </button>
        </div>

        {/* Example Queries */}
        {!hasSearched && (
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
            <span>Examples:</span>
            <div className="flex flex-wrap gap-2">
              {sampleQueries.map((sq) => (
                <button
                  key={sq}
                  type="button"
                  onClick={() => {
                    setQuery(sq);
                    handleSearch(sq);
                  }}
                  className="px-2.5 py-1 rounded-full bg-[var(--color-canvas)] hover:bg-[var(--color-border)] text-[var(--color-text)] transition-colors"
                >
                  "{sq}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {isSearching && (
        <div className="p-8 rounded-[var(--radius-lg)] bg-[var(--color-paper)] border border-[var(--color-border)] flex flex-col items-center justify-center text-center gap-3">
          <RefreshCw className="w-8 h-8 text-[var(--color-brand-orange)] animate-spin" />
          <h3 className="text-sm font-semibold">Searching selected metadata on this device…</h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Comparing query against titles, domains, and tags without exposing secret payloads.
          </p>
        </div>
      )}

      {!isSearching && hasSearched && (
        <div className="flex flex-col gap-4">
          {aiAnswer && (
            <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-paper)] border border-[var(--color-brand-orange)]/40 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[var(--color-brand-orange)] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[var(--color-text)] leading-relaxed">
                {aiAnswer}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] px-1">
            <span>{results.length} metadata result(s) found</span>
            <span>Passwords masked by default</span>
          </div>

          {results.length === 0 ? (
            <div className="p-8 rounded-[var(--radius-lg)] bg-[var(--color-paper)] border border-[var(--color-border)] text-center flex flex-col items-center justify-center gap-2">
              <h3 className="text-sm font-semibold">No metadata matches found</h3>
              <p className="text-xs text-[var(--color-text-muted)] max-w-sm">
                Try searching with different keywords, check the spelling, or view all items in
                your vault.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((item) => (
                <VaultResultCard
                  key={item.id}
                  metadata={item}
                  onRevealClick={handleRevealClick}
                  onOpenDetails={(id) => navigate(`/entry/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Explicit Unlock Reveal Modal */}
      {revealingEntryId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reveal-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-[var(--radius-xl)] bg-[var(--color-paper)] border border-[var(--color-border)] p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 id="reveal-modal-title" className="text-base font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--color-brand-orange)]" />
                Explicit Secret Reveal
              </h3>
              <button
                type="button"
                onClick={() => setRevealingEntryId(null)}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-[var(--color-text-muted)]">
              This secret was retrieved locally from your decrypted vault session upon deliberate click.
            </p>

            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-canvas)] border border-[var(--color-border)] font-mono text-sm break-all text-[var(--color-text)] select-all">
              {isRevealing ? 'Decrypting...' : revealedSecret}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevealingEntryId(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-[var(--color-brand-orange)] text-[var(--color-text)] hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
