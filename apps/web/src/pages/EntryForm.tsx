import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, X, Plus } from 'lucide-react';
import type { EntryType, CreateEntryInput, UpdateEntryInput, VaultEntry } from '@app/shared';

export const EntryForm = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Form State
  const [type, setType] = useState<EntryType>('login');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [domain, setDomain] = useState('');
  
  // Note fields
  const [content, setContent] = useState('');
  
  // API Key fields
  const [service, setService] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isEditing) {
      const fetchEntry = async () => {
        try {
          const data = await api.getEntry(id!);
          const entry = data.entry as VaultEntry;
          setType(entry.type);
          setTitle(entry.title);
          setTags(entry.tags || []);
          
          if (entry.type === 'login') {
            setUsername(entry.username);
            setPassword(entry.password);
            setUrl(entry.url || '');
            setDomain(entry.domain || '');
          } else if (entry.type === 'note') {
            setContent(entry.content);
          } else if (entry.type === 'api_key') {
            setService(entry.service);
            setApiKey(entry.apiKey);
          }
        } catch (err: any) {
          setError(err.message || 'Failed to fetch entry');
        } finally {
          setLoading(false);
        }
      };
      fetchEntry();
    }
  }, [id, isEditing]);

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ((e.type === 'keydown' && (e as React.KeyboardEvent).key === 'Enter') || e.type === 'click') {
      e.preventDefault();
      const tag = newTag.trim();
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag]);
        setNewTag('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    
    try {
      if (type === 'login') {
        const payload = { type, title, tags, username, password, url, domain };
        if (isEditing) await api.updateEntry(id!, payload as UpdateEntryInput);
        else await api.createEntry(payload as CreateEntryInput);
      } else if (type === 'note') {
        const payload = { type, title, tags, content };
        if (isEditing) await api.updateEntry(id!, payload as UpdateEntryInput);
        else await api.createEntry(payload as CreateEntryInput);
      } else if (type === 'api_key') {
        const payload = { type, title, tags, service, apiKey };
        if (isEditing) await api.updateEntry(id!, payload as UpdateEntryInput);
        else await api.createEntry(payload as CreateEntryInput);
      }
      navigate(isEditing ? `/entry/${id}` : '/');
    } catch (err: any) {
      setError(err.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-body text-[var(--color-text-muted)]">Loading...</div>;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto gap-6 pb-12">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-2 -ml-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-section-title">{isEditing ? 'Edit Entry' : 'New Entry'}</h2>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-body">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {!isEditing && (
          <div className="flex flex-col gap-2">
            <span className="text-label text-[var(--color-text-muted)]">Entry Type</span>
            <div className="flex gap-4">
              {(['login', 'note', 'api_key'] as EntryType[]).map(t => (
                <label key={t} className="flex items-center gap-2 text-body cursor-pointer">
                  <input 
                    type="radio" 
                    name="type" 
                    value={t} 
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="w-4 h-4 text-[var(--color-brand-orange)]"
                  />
                  <span className="capitalize">{t.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)]">
          <h3 className="text-interface-heading mb-2">Metadata</h3>
          
          <div className="flex flex-col gap-1">
            <label className="text-label text-[var(--color-text)]">Title</label>
            <input
              required
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label text-[var(--color-text)]">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-label bg-[var(--color-paper)] border border-[var(--color-border)] px-2 py-1 rounded-[var(--radius-sm)]">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Add tag..."
                className="flex-1 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]"
              />
              <button 
                type="button" 
                onClick={handleAddTag}
                className="px-3 py-2 bg-[var(--color-paper)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-canvas)] transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {type === 'login' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-label text-[var(--color-text)]">URL (Optional)</label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label text-[var(--color-text)]">Domain (Optional)</label>
                <input
                  type="text"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]"
                />
              </div>
            </>
          )}

          {type === 'api_key' && (
            <div className="flex flex-col gap-1">
              <label className="text-label text-[var(--color-text)]">Service Name</label>
              <input
                required
                type="text"
                value={service}
                onChange={e => setService(e.target.value)}
                className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)]">
          <h3 className="text-interface-heading mb-2">Secrets</h3>
          
          {type === 'login' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-label text-[var(--color-text)]">Username</label>
                <input
                  required
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label text-[var(--color-text)]">Password</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]"
                />
              </div>
            </>
          )}

          {type === 'note' && (
            <div className="flex flex-col gap-1">
              <label className="text-label text-[var(--color-text)]">Note Content</label>
              <textarea
                required
                rows={6}
                value={content}
                onChange={e => setContent(e.target.value)}
                className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] font-mono resize-y"
              />
            </div>
          )}

          {type === 'api_key' && (
            <div className="flex flex-col gap-1">
              <label className="text-label text-[var(--color-text)]">API Key</label>
              <input
                required
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 mt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 rounded-full bg-[var(--color-paper)] text-[var(--color-text)] font-semibold text-body hover:bg-[var(--color-canvas)] transition-colors border border-[var(--color-border)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-full bg-[var(--color-brand-orange)] text-[var(--color-text)] font-semibold text-body hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </form>
    </div>
  );
};
