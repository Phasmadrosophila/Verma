import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, Edit2, Trash2, Eye, EyeOff, Lock, Copy } from 'lucide-react';
import type { VaultEntry } from '@app/shared';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBanner } from '../components/StatusBanner';

const SecretField = ({ label, value, isRevealed, copyToClipboard }: { label: string; value?: string; isRevealed: boolean; copyToClipboard: (text: string) => void }) => {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 mb-4 p-4 border border-[var(--color-border)] rounded-[var(--radius-lg)] bg-[var(--color-surface)]">
      <span className="text-label text-[var(--color-text-muted)]">{label}</span>
      <div className="flex items-center justify-between gap-3">
        <span
          className="text-body font-mono break-all"
          aria-label={isRevealed ? undefined : 'Secret hidden'}
        >
          {isRevealed ? value : '••••••••'}
        </span>
        {isRevealed && (
          <button
            type="button"
            onClick={() => copyToClipboard(value)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md focus-ring"
            aria-label={`Copy ${label}`}
          >
            <Copy className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

export const EntryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<VaultEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchEntry = async () => {
      try {
        setLoading(true);
        const data = await api.getEntry(id!);
        setEntry(data.entry);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch entry');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchEntry();
  }, [id]);

  const handleConfirmDelete = async () => {
    try {
      await api.deleteEntry(id!);
      setIsDeleteDialogOpen(false);
      navigate('/');
    } catch (err: any) {
      setIsDeleteDialogOpen(false);
      setError(err.message || 'Failed to delete');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) return <div role="status" aria-live="polite" className="text-body text-[var(--color-text-muted)] p-4">Loading entry details...</div>;
  if (!entry) return <div role="alert" className="text-body text-red-600 p-4">{error || 'Entry not found'}</div>;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto gap-6 pb-12">
      {error && (
        <StatusBanner
          variant="error"
          title="Operation Failed"
          description={error}
          dismissible={true}
          onDismiss={() => setError('')}
        />
      )}

      <div className="flex flex-wrap justify-between items-center gap-3">
        <button 
          type="button"
          onClick={() => navigate('/')}
          aria-label="Back to all items"
          className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-body transition-colors focus-ring rounded-md px-3 py-2 min-h-[40px]"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Back
        </button>
        <div className="flex gap-2 flex-wrap">
          <button 
            type="button"
            onClick={() => navigate(`/entry/${id}/edit`)}
            aria-label="Edit entry"
            className="flex items-center gap-2 bg-[var(--color-paper)] text-[var(--color-text)] px-4 py-2 rounded-full border border-[var(--color-border)] text-body hover:bg-[var(--color-canvas)] transition-colors focus-ring min-h-[40px]"
          >
            <Edit2 className="w-4 h-4" aria-hidden="true" />
            Edit
          </button>
          <button 
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            aria-label="Delete entry"
            className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full border border-red-200 text-body hover:bg-red-100 transition-colors focus-ring min-h-[40px]"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-section-title break-words">{entry.title}</h2>
        <div className="flex gap-2 flex-wrap">
          <span className="text-label text-[var(--color-text-muted)] uppercase bg-[var(--color-paper)] px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--color-border)]">
            {entry.type}
          </span>
          {entry.tags?.map((tag) => (
            <span key={tag} className="text-label bg-[var(--color-paper)] border border-[var(--color-border)] px-2 py-1 rounded-[var(--radius-sm)]">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 mt-4">
        {/* Metadata Section */}
        <div className="flex flex-col gap-4">
          <h3 className="text-interface-heading">Metadata</h3>
          {entry.type === 'login' && entry.domain && (
            <div>
              <span className="text-label text-[var(--color-text-muted)]">Domain</span>
              <div className="text-body break-words">{entry.domain}</div>
            </div>
          )}
          {entry.type === 'login' && entry.url && (
            <div>
              <span className="text-label text-[var(--color-text-muted)]">URL</span>
              <div className="text-body text-[var(--color-brand-periwinkle)] break-all">{entry.url}</div>
            </div>
          )}
          {entry.type === 'api_key' && entry.service && (
            <div>
              <span className="text-label text-[var(--color-text-muted)]">Service</span>
              <div className="text-body break-words">{entry.service}</div>
            </div>
          )}
          {entry.type === 'api_key' && entry.keyId && (
            <div>
              <span className="text-label text-[var(--color-text-muted)]">Key ID</span>
              <div className="text-body font-mono break-all">{entry.keyId}</div>
            </div>
          )}
          {entry.type === 'note' && entry.category && (
            <div>
              <span className="text-label text-[var(--color-text-muted)]">Category</span>
              <div className="text-body break-words">{entry.category}</div>
            </div>
          )}
        </div>

        {/* Secrets Section */}
        <div className="flex flex-col gap-4 mt-4 pt-6 border-t border-[var(--color-border)] relative">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-interface-heading flex items-center gap-2">
              <Lock className="w-5 h-5 text-[var(--color-text-muted)]" aria-hidden="true" />
              Secrets
            </h3>
            <button
              type="button"
              onClick={() => setIsRevealed(!isRevealed)}
              aria-label={isRevealed ? 'Hide secret values' : 'Unlock to reveal secret values'}
              aria-expanded={isRevealed}
              className="flex items-center gap-2 text-body text-[var(--color-brand-orange)] hover:opacity-80 transition-opacity focus-ring rounded-md px-2 py-1 min-h-[40px]"
            >
              {isRevealed ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
              {isRevealed ? 'Hide' : 'Unlock to reveal'}
            </button>
          </div>

          {!isRevealed && (
            <div className="absolute inset-0 top-14 bg-gradient-to-b from-transparent to-[var(--color-canvas)] pointer-events-none z-10 opacity-60"></div>
          )}

          {entry.type === 'login' && (
            <>
              <SecretField label="Username" value={entry.username} isRevealed={isRevealed} copyToClipboard={copyToClipboard} />
              <SecretField label="Password" value={entry.password} isRevealed={isRevealed} copyToClipboard={copyToClipboard} />
              <SecretField label="TOTP Secret" value={entry.totpSecret} isRevealed={isRevealed} copyToClipboard={copyToClipboard} />
            </>
          )}

          {entry.type === 'api_key' && (
            <>
              <SecretField label="API Key" value={entry.apiKey} isRevealed={isRevealed} copyToClipboard={copyToClipboard} />
              <SecretField label="API Secret" value={entry.apiSecret} isRevealed={isRevealed} copyToClipboard={copyToClipboard} />
            </>
          )}

          {entry.type === 'note' && (
            <div className="flex flex-col gap-1 mb-4 p-4 border border-[var(--color-border)] rounded-[var(--radius-lg)] bg-[var(--color-surface)]">
              <span className="text-label text-[var(--color-text-muted)]">Note Content</span>
              <div
                className="text-body whitespace-pre-wrap font-mono break-words"
                aria-label={isRevealed ? undefined : 'Secret hidden'}
              >
                {isRevealed ? entry.content : '••••••••••••••••••••••••••••••••••••••'}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Entry"
        description={`Are you sure you want to permanently delete "${entry.title}"?`}
        consequence="This action removes the entry from your encrypted vault and cannot be undone."
        confirmText="Delete permanently"
        cancelText="Keep entry"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
};
