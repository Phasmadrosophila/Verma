import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, X, Plus } from 'lucide-react';
import type { EntryType, CreateEntryInput, UpdateEntryInput, VaultEntry } from '@app/shared';

export const EntryForm: React.FC = () => {
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

  if (loading) return <div role="status" aria-live="polite" className="text-body text-[var(--color-text-muted)] p-4">Loading entry form...</div>;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto gap-6 pb-12">
      <div className="flex items-center gap-4">
        <button 
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-2 -ml-2 rounded-md focus-ring min-w-[40px] min-h-[40px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h2 className="text-section-title">{isEditing ? 'Edit Entry' : 'New Entry'}</h2>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-body border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {!isEditing && (
          <fieldset className="flex flex-col gap-2 border-0 p-0 m-0">
            <legend className="text-label text-[var(--color-text-muted)] mb-1">Entry Type</legend>
            <div className="flex flex-wrap gap-4">
              {(['login', 'note', 'api_key'] as EntryType[]).map(t => (
                <label key={t} className="flex items-center gap-2 text-body cursor-pointer min-h-[40px]">
                  <input 
                    type="radio" 
                    name="type" 
                    value={t} 
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="w-4 h-4 text-[var(--color-brand-orange)] focus-ring"
                  />
                  <span className="capitalize">{t.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex flex-col gap-4 p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)]">
          <h3 className="text-interface-heading mb-2">Metadata</h3>
          
          <div className="flex flex-col gap-1">
            <label htmlFor="entry-title" className="text-label text-[var(--color-text)]">Title</label>
            <input
              id="entry-title"
              required
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus-ring"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="entry-new-tag" className="text-label text-[var(--color-text)]">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-label bg-[var(--color-paper)] border border-[var(--color-border)] px-2 py-1 rounded-[var(--radius-sm)]">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-ring rounded-sm p-0.5"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                id="entry-new-tag"
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Add tag..."
                aria-label="New tag name"
                className="flex-1 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus-ring"
              />
              <button 
                type="button" 
                onClick={handleAddTag}
                aria-label="Add tag"
                className="px-3 py-2 bg-[var(--color-paper)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-canvas)] transition-colors focus-ring min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <Plus className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {type === 'login' && (
            <>
              <div className="flex flex-col gap-1">
                <label htmlFor="login-url" className="text-label text-[var(--color-text)]">URL (Optional)</label>
                <input
                  id="login-url"
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus-ring"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="login-domain" className="text-label text-[var(--color-text)]">Domain (Optional)</label>
                <input
                  id="login-domain"
                  type="text"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus-ring"
                />
              </div>
            </>
          )}

          {type === 'api_key' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="api-service" className="text-label text-[var(--color-text)]">Service Name</label>
              <input
                id="api-service"
                required
                type="text"
                value={service}
                onChange={e => setService(e.target.value)}
                className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus-ring"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)]">
          <h3 className="text-interface-heading mb-2">Secrets</h3>
          
          {type === 'login' && (
            <>
              <div className="flex flex-col gap-1">
                <label htmlFor="login-username" className="text-label text-[var(--color-text)]">Username</label>
                <input
                  id="login-username"
                  required
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus-ring"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="login-password" className="text-label text-[var(--color-text)]">Password</label>
                <input
                  id="login-password"
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus-ring"
                />
              </div>
            </>
          )}

          {type === 'note' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="note-content" className="text-label text-[var(--color-text)]">Note Content</label>
              <textarea
                id="note-content"
                required
                rows={6}
                value={content}
                onChange={e => setContent(e.target.value)}
                className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body font-mono resize-y focus-ring"
              />
            </div>
          )}

          {type === 'api_key' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="api-key" className="text-label text-[var(--color-text)]">API Key</label>
              <input
                id="api-key"
                required
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus-ring"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 mt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 rounded-full bg-[var(--color-paper)] text-[var(--color-text)] font-semibold text-body hover:bg-[var(--color-canvas)] transition-colors border border-[var(--color-border)] focus-ring min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-full bg-[var(--color-brand-orange)] text-[var(--color-text)] font-semibold text-body hover:opacity-90 disabled:opacity-50 transition-opacity focus-ring min-h-[44px]"
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </form>
    </div>
  );
};
