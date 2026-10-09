import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, Edit2, Trash2, Eye, EyeOff, Lock, Copy } from 'lucide-react';
import type { VaultEntry } from '@app/shared';

const SecretField = ({ label, value, isRevealed, copyToClipboard }: { label: string; value?: string; isRevealed: boolean; copyToClipboard: (text: string) => void }) => {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 mb-4 p-4 border border-[var(--color-border)] rounded-[var(--radius-lg)] bg-[var(--color-surface)]">
      <span className="text-label text-[var(--color-text-muted)]">{label}</span>
      <div className="flex items-center justify-between">
        <span className="text-body font-mono">
          {isRevealed ? value : '••••••••'}
        </span>
        {isRevealed && (
          <button
            onClick={() => copyToClipboard(value)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-2"
            aria-label={`Copy ${label}`}
          >
            <Copy className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const EntryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<VaultEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);

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

  const handleDelete = async () => {
    if (!window.confirm('Delete entry? This action cannot be undone.')) return;
    try {
      await api.deleteEntry(id!);
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) return <div className="text-body text-[var(--color-text-muted)]">Loading...</div>;
  if (error || !entry) return <div className="text-body text-red-600">{error || 'Entry not found'}</div>;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto gap-6 pb-12">
      <div className="flex justify-between items-center">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-body transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate(`/entry/${id}/edit`)}
            className="flex items-center gap-2 bg-[var(--color-paper)] text-[var(--color-text)] px-4 py-2 rounded-full border border-[var(--color-border)] text-body hover:bg-[var(--color-canvas)] transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button 
            onClick={handleDelete}
            className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full border border-red-200 text-body hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-section-title">{entry.title}</h2>
        <div className="flex gap-2">
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
              <div className="text-body">{entry.domain}</div>
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
              <div className="text-body">{entry.service}</div>
            </div>
          )}
          {entry.type === 'api_key' && entry.keyId && (
            <div>
              <span className="text-label text-[var(--color-text-muted)]">Key ID</span>
              <div className="text-body font-mono">{entry.keyId}</div>
            </div>
          )}
          {entry.type === 'note' && entry.category && (
            <div>
              <span className="text-label text-[var(--color-text-muted)]">Category</span>
              <div className="text-body">{entry.category}</div>
            </div>
          )}
        </div>

        {/* Secrets Section */}
        <div className="flex flex-col gap-4 mt-4 pt-6 border-t border-[var(--color-border)] relative">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-interface-heading flex items-center gap-2">
              <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />
              Secrets
            </h3>
            <button
              onClick={() => setIsRevealed(!isRevealed)}
              className="flex items-center gap-2 text-body text-[var(--color-brand-orange)] hover:opacity-80 transition-opacity"
            >
              {isRevealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
              <div className="text-body whitespace-pre-wrap font-mono">
                {isRevealed ? entry.content : '••••••••••••••••••••••••••••••••••••••'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
