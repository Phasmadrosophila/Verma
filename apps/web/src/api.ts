import type {
  CreateEntryInput,
  UpdateEntryInput,
  LockStatus,
  ImportProposal,
  ImportResult,
  TargetField,
} from '@app/shared';

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

  askVault: async (query: string): Promise<{ answer: string; relevantEntryIds: string[] }> => {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ask Your Vault is unavailable');
    return data;
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
  },

  analyzeImport: async (
    csvContent: string,
    customMappings?: Record<string, TargetField>
  ): Promise<{ stagingId: string; proposal: ImportProposal }> => {
    const res = await fetch('/api/import/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent, customMappings }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to analyze import');
    return res.json();
  },

  cancelImport: async (stagingId: string): Promise<{ cancelled: boolean }> => {
    const res = await fetch('/api/import/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stagingId }),
    });
    if (!res.ok) throw new Error('Failed to cancel import');
    return res.json();
  },

  confirmImport: async (
    stagingId: string,
    options?: {
      confirmedRowIndices?: number[];
      customMappings?: Record<string, TargetField>;
      additionalTags?: string[];
    }
  ): Promise<ImportResult> => {
    const res = await fetch('/api/import/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stagingId, ...options }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to confirm import');
    return res.json();
  },
};
