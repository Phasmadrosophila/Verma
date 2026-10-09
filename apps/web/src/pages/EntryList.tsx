import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Search, Plus, Lock } from 'lucide-react';
import type { RedactedEntryMetadata } from '@app/shared';

import { Button } from '../components/primitives/Button';
import { EmptyState } from '../components/primitives/EmptyState';
import { LoadingState } from '../components/primitives/LoadingState';

export const EntryList = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<RedactedEntryMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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

    const timer = setTimeout(() => {
      fetchEntries();
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-interface-heading">All Items</h2>
        <Button 
          onClick={() => navigate('/entry/new')}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Entry
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search metadata..."
          className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] text-body focus-ring"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-body border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState
          title="Loading entries..."
          description="Retrieving decrypted index from local memory."
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<Search className="w-7 h-7" />}
          title={query ? "No entries match your search" : "Your vault is empty"}
          description={
            query
              ? `No metadata matched "${query}". Check spelling or try a broader keyword.`
              : "Store your passwords, note bodies, and API keys securely on this device."
          }
          action={{
            label: "Create First Entry",
            icon: <Plus className="w-4 h-4" />,
            onClick: () => navigate("/entry/new"),
          }}
        />
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
