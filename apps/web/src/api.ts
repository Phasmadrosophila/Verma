import type {
  CreateEntryInput,
  UpdateEntryInput,
  LockStatus,
  ImportProposal,
  ImportResult,
  TargetField,
} from '@app/shared';

export interface VaultStatusResponse {
  status: LockStatus;
  isLocked: boolean;
  isInitialized: boolean;
}

/**
 * True only when the response declares a JSON content type.
 *
 * A static SPA fallback (or any misrouted request) can answer an API call with
 * an HTML 200. Checking the content type lets us report that explicitly
 * instead of letting `res.json()` crash on `<html>` and stall callers.
 */
export const isJsonResponse = (res: Response): boolean => {
  const contentType = res.headers.get('content-type') ?? '';
  return contentType.toLowerCase().includes('application/json');
};

const nonJsonError = (res: Response): Error =>
  new Error(
    `Vault API returned a non-JSON response (Content-Type: ${
      res.headers.get('content-type') ?? 'none'
    }). The vault backend is unavailable.`
  );

/**
 * Reads a successful JSON response, or throws an explicit, non-parse error.
 *
 * - Non-JSON body (e.g. HTML from a static fallback): throws immediately.
 * - Non-2xx JSON body: surfaces the server-supplied `error` message when present.
 * - Non-2xx non-JSON body: throws a status-based error instead of crashing.
 */
async function requireJsonResponse(res: Response): Promise<any> {
  if (!isJsonResponse(res)) {
    throw nonJsonError(res);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Vault API request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  getVaultStatus: async (): Promise<VaultStatusResponse> => {
    const res = await fetch('/api/vault/status');
    return requireJsonResponse(res);
  },

  initVault: async (password: string) => {
    const res = await fetch('/api/vault/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return requireJsonResponse(res);
  },

  unlockVault: async (password: string) => {
    const res = await fetch('/api/vault/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return requireJsonResponse(res);
  },

  lockVault: async () => {
    const res = await fetch('/api/vault/lock', { method: 'POST' });
    return requireJsonResponse(res);
  },

  searchMetadata: async (q: string = '') => {
    const res = await fetch(`/api/metadata/search?q=${encodeURIComponent(q)}`);
    return requireJsonResponse(res);
  },

  askVault: async (query: string): Promise<{ answer: string; relevantEntryIds: string[] }> => {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    return requireJsonResponse(res);
  },

  getEntry: async (id: string) => {
    const res = await fetch(`/api/entries/${id}`);
    return requireJsonResponse(res);
  },

  createEntry: async (data: CreateEntryInput) => {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return requireJsonResponse(res);
  },

  updateEntry: async (id: string, data: UpdateEntryInput) => {
    const res = await fetch(`/api/entries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return requireJsonResponse(res);
  },

  deleteEntry: async (id: string) => {
    const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
    return requireJsonResponse(res);
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
    return requireJsonResponse(res);
  },

  cancelImport: async (stagingId: string): Promise<{ cancelled: boolean }> => {
    const res = await fetch('/api/import/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stagingId }),
    });
    return requireJsonResponse(res);
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
    return requireJsonResponse(res);
  },
};
