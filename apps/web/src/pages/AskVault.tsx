import { useState, type FormEvent } from 'react';
import { Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export const AskVault = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [relevantEntryIds, setRelevantEntryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.askVault(query.trim());
      setAnswer(result.answer);
      setRelevantEntryIds(result.relevantEntryIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ask Your Vault is unavailable');
      setAnswer('');
      setRelevantEntryIds([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full max-w-3xl flex-col gap-6">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[var(--color-brand-orange)]">
          <Sparkles className="h-5 w-5" />
          <span className="text-interface-label">LOCAL ASSISTANT</span>
        </div>
        <h2 className="text-interface-heading">Ask Your Vault</h2>
        <p className="mt-2 max-w-2xl text-body text-[var(--color-text-muted)]">
          Search your redacted vault metadata in plain language. Secret values and note bodies are never sent to the assistant.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-paper)] p-3 text-small text-[var(--color-text-muted)]">
        <ShieldCheck className="h-5 w-5 text-emerald-600" />
        <span>Local metadata only. AI can be unavailable without blocking normal vault use.</span>
      </div>

      <form onSubmit={submit} className="flex gap-3">
        <label className="relative flex-1">
          <span className="sr-only">Ask your vault</span>
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Which work account uses Company X?"
            maxLength={500}
            className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-paper)] py-3 pl-10 pr-4 text-body outline-none focus:border-[var(--color-brand-orange)]"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-full bg-[var(--color-brand-orange)] px-5 py-3 text-body font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Ask'}
        </button>
      </form>

      {error && <p role="alert" className="text-body text-red-700">{error}</p>}
      {answer && (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-paper)] p-5">
          <h3 className="text-interface-label text-[var(--color-text-muted)]">ASSISTANT RESPONSE</h3>
          <p className="mt-3 text-body">{answer}</p>
          {relevantEntryIds.length > 0 && (
            <button onClick={() => navigate('/')} className="mt-4 text-small font-medium text-[var(--color-brand-orange)] hover:underline">
              View {relevantEntryIds.length} matching metadata item{relevantEntryIds.length === 1 ? '' : 's'}
            </button>
          )}
        </section>
      )}
    </div>
  );
};
