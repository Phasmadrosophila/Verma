import type { CreateEntryInput, UpdateEntryInput, LockStatus } from '@app/shared';

export const api = {
  getVaultStatus: async (): Promise<{ status: LockStatus; isLocked: boolean; isInitialized: boolean }> => {
    const res = await fetch('/api/vault/status');
    if (!res.ok) throw new Error('Failed to get vault status');
    return res.json();
  },

  initVault: async (password: string) => {
    const res = await fetch('/api/vault/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to initialize vault');
    return res.json();
  },

  unlockVault: async (password: string) => {
    const res = await fetch('/api/vault/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to unlock vault');
    return res.json();
  },

  lockVault: async () => {
    const res = await fetch('/api/vault/lock', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to lock vault');
    return res.json();
  },

  searchMetadata: async (q: string = '') => {
    const res = await fetch(`/api/metadata/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error('Failed to search metadata');
    return res.json();
  },

  getEntry: async (id: string) => {
    const res = await fetch(`/api/entries/${id}`);
    if (!res.ok) throw new Error('Failed to get entry');
    return res.json();
  },

  createEntry: async (data: CreateEntryInput) => {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create entry');
    return res.json();
  },

  updateEntry: async (id: string, data: UpdateEntryInput) => {
    const res = await fetch(`/api/entries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update entry');
    return res.json();
  },

  deleteEntry: async (id: string) => {
    const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete entry');
    return res.json();
  }
};
