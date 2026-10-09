import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Search, Plus, Lock } from 'lucide-react';
import type { RedactedEntryMetadata } from '@app/shared';

export const EntryList = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<RedactedEntryMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const data = query 
        ? await api.searchMetadata(query) 
        : await api.searchMetadata('');
      setEntries(data.metadata || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEntries();
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-interface-heading">All Items</h2>
        <button 
          onClick={() => navigate('/entry/new')}
          className="flex items-center gap-2 bg-[var(--color-brand-orange)] text-[var(--color-text)] px-4 py-2 rounded-full text-body font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          New Entry
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search metadata..."
          className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] text-body focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-body">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-body text-[var(--color-text-muted)]">Loading entries...</div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-[var(--color-paper)] rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-interface-heading mb-2">No entries found</h3>
          <p className="text-body text-[var(--color-text-muted)] max-w-md">
            {query ? 'Try a different search term.' : 'Your vault is empty. Add a new entry to get started.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <div 
              key={entry.id} 
              onClick={() => navigate(`/entry/${entry.id}`)}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 flex justify-between items-center hover:border-[var(--color-brand-orange)] cursor-pointer transition-colors"
            >
              <div className="flex flex-col gap-1">
                <div className="text-body font-medium">{entry.title}</div>
                <div className="flex gap-2 items-center">
                  <span className="text-label text-[var(--color-text-muted)] uppercase bg-[var(--color-paper)] px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--color-border)]">
                    {entry.type}
                  </span>
                  {entry.domain && (
                    <span className="text-label text-[var(--color-text-muted)]">{entry.domain}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  {entry.tags?.map((tag) => (
                    <span key={tag} className="text-label bg-[var(--color-paper)] border border-[var(--color-border)] px-2 py-1 rounded-[var(--radius-sm)]">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-label text-[var(--color-text-muted)]">
                  <Lock className="w-4 h-4" />
                  Hidden
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
