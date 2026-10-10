/**
 * Mobile → backend API client.
 *
 * Mirrors `apps/web/src/api.ts`, but targets ABSOLUTE URLs (the device cannot
 * use the web app's Vite dev proxy). The base URL defaults to localhost:3000,
 * reachable from the device via `adb reverse tcp:3000 tcp:3000`, and can be
 * overridden with EXPO_PUBLIC_API_URL for LAN / tunnel setups.
 *
 * Zero-secret boundary (AGENTS.md §3.1): the list view consumes the REDACTED
 * metadata endpoint, which never carries secret fields. The plaintext secret is
 * fetched lazily and only on explicit user reveal, via `getEntrySecret`.
 */

import { localVault } from './localVault';
import {
  ApiError,
  toMetadataEntry,
  type MobileEntryType,
  type MobileEntryMetadata,
  type VaultStatus,
  type AskResult,
  type EntryDraft,
} from './vaultTypes';

// Re-export the shared vault primitives so existing importers of apiClient
// (App.tsx, screens, tests) keep working unchanged.
export {
  ApiError,
  classifyError,
  toMetadataEntry,
  toWireType,
  fromWireType,
  type ErrorKind,
  type MobileEntryType,
  type MobileEntryMetadata,
  type VaultStatus,
  type AskResult,
  type EntryDraft,
} from './vaultTypes';

const API_URL = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL : undefined;

/**
 * Offline mode: when EXPO_PUBLIC_API_URL is UNSET, the app runs with no backend
 * and no network, backed by the in-process `localVault`. Setting the env var
 * opts into the real HTTP path below.
 */
const OFFLINE = !API_URL;

const BASE_URL = (API_URL || 'http://localhost:3000').replace(/\/$/, '');

// ---------------------------------------------------------------------------
// low-level fetch wrapper
// ---------------------------------------------------------------------------

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    // fetch rejects only on a transport failure (never on a non-2xx status).
    throw new ApiError('Could not reach the vault. Check your connection.', 0, true);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// draft -> backend create/update payload
//
// The backend splits the single mobile "secret" into type-specific fields.
// ---------------------------------------------------------------------------

function draftToCreatePayload(draft: EntryDraft): Record<string, unknown> {
  const base = {
    title: draft.title,
    tags: draft.tags,
  };

  switch (draft.type) {
    case 'login':
      return {
        ...base,
        type: 'login',
        username: draft.user ?? '',
        password: draft.secret,
        domain: draft.domain || undefined,
      };
    case 'note':
      return {
        ...base,
        type: 'note',
        content: draft.secret,
      };
    case 'api':
      return {
        ...base,
        type: 'api_key',
        service: draft.domain || draft.title,
        apiKey: draft.secret,
      };
  }
}

function draftToUpdatePayload(draft: EntryDraft): Record<string, unknown> {
  // Update rejects `type`; otherwise same field split as create.
  const { type: _ignored, ...payload } = draftToCreatePayload(draft);
  return payload;
}

/** Extract the single display secret from a full backend entry. */
function secretFromEntry(entry: any): string {
  switch (entry?.type) {
    case 'login':
      return entry.password ?? '';
    case 'note':
      return entry.content ?? '';
    case 'api_key':
      return entry.apiKey ?? '';
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// public client
// ---------------------------------------------------------------------------

/** The real HTTP client (used when EXPO_PUBLIC_API_URL is set). */
export const httpClient = {
  baseUrl: BASE_URL,

  async getVaultStatus(): Promise<VaultStatus> {
    return request<VaultStatus>('/api/vault/status');
  },

  async unlockVault(password: string): Promise<void> {
    await request('/api/vault/unlock', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  async lockVault(): Promise<void> {
    await request('/api/vault/lock', { method: 'POST' });
  },

  /** List view: redacted metadata only — never carries secret fields. */
  async listEntries(): Promise<MobileEntryMetadata[]> {
    const data = await request<{ metadata: any[] }>('/api/metadata');
    return (data.metadata ?? []).map(toMetadataEntry);
  },

  /**
   * Fetch the plaintext secret for one entry. Call ONLY on explicit user
   * reveal. The returned string is the single display secret.
   */
  async getEntrySecret(id: string): Promise<string> {
    const data = await request<{ entry: any }>(`/api/entries/${encodeURIComponent(id)}`);
    return secretFromEntry(data.entry);
  },

  async createEntry(draft: EntryDraft): Promise<MobileEntryMetadata> {
    const data = await request<{ entry: any }>('/api/entries', {
      method: 'POST',
      body: JSON.stringify(draftToCreatePayload(draft)),
    });
    // create/update return a FULL entry (with secret); toMetadataEntry strips it.
    return toMetadataEntry(data.entry);
  },

  async updateEntry(id: string, draft: EntryDraft): Promise<MobileEntryMetadata> {
    const data = await request<{ entry: any }>(`/api/entries/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(draftToUpdatePayload(draft)),
    });
    return toMetadataEntry(data.entry);
  },

  async deleteEntry(id: string): Promise<void> {
    await request(`/api/entries/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async askVault(query: string): Promise<AskResult> {
    return request<AskResult>('/api/ask', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },
};

/**
 * The data seam. In offline mode (EXPO_PUBLIC_API_URL unset) it is the
 * in-process `localVault`; otherwise it is the real HTTP client. Both expose an
 * identical method surface, so App.tsx and the screens need no changes.
 *
 * This is a plain conditional (no Proxy): the shared primitives now live in the
 * leaf `vaultTypes` module, so apiClient imports localVault one-way with no
 * require cycle, and `localVault` is fully initialized by the time this runs.
 */
export const apiClient: typeof httpClient = OFFLINE ? localVault : httpClient;
