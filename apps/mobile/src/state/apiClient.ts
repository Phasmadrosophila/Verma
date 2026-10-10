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

export type MobileEntryType = 'login' | 'note' | 'api';

/** The backend entry type. Mobile uses 'api'; the wire uses 'api_key'. */
type WireEntryType = 'login' | 'note' | 'api_key';

const BASE_URL = (
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  'http://localhost:3000'
).replace(/\/$/, '');

/** Typed error so callers can render an error state instead of crashing. */
export class ApiError extends Error {
  readonly status: number;
  /** True when the request never reached the server (offline / DNS / refused). */
  readonly isNetworkError: boolean;

  constructor(message: string, status: number, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

/** Metadata-only entry for the list view. Contains NO secret fields. */
export interface MobileEntryMetadata {
  id: string;
  type: MobileEntryType;
  title: string;
  subtitle: string;
  domain?: string;
  tags: string[];
  updated: string;
  brand: string;
}

export interface VaultStatus {
  status: string;
  isLocked: boolean;
  isInitialized: boolean;
}

export interface AskResult {
  answer: string;
  relevantEntryIds: string[];
}

/** Fields the Add/Edit form collects for a new or updated entry. */
export interface EntryDraft {
  type: MobileEntryType;
  title: string;
  subtitle?: string;
  user?: string;
  domain?: string;
  tags: string[];
  secret: string;
}

// ---------------------------------------------------------------------------
// type mapping: mobile 'api' <-> wire 'api_key'
// ---------------------------------------------------------------------------

export function toWireType(type: MobileEntryType): WireEntryType {
  return type === 'api' ? 'api_key' : type;
}

export function fromWireType(type: string): MobileEntryType {
  return type === 'api_key' ? 'api' : type === 'note' ? 'note' : 'login';
}

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
// metadata (list) <-> MobileEntryMetadata
// ---------------------------------------------------------------------------

function brandFromTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function formatUpdated(updatedAt: number): string {
  if (!updatedAt) return '';
  try {
    return new Date(updatedAt).toLocaleDateString();
  } catch {
    return '';
  }
}

/**
 * Secret field names that MUST NEVER enter list/App state (AGENTS.md §3.1).
 * Kept in sync with the backend entry types (login / note / api_key).
 */
const SECRET_FIELDS = [
  'password',
  'content',
  'apiKey',
  'apiSecret',
  'totpSecret',
  'recoveryCodes',
  'secret',
] as const;

/**
 * Trusted redaction projection. Takes ANY backend entry or metadata object and
 * returns a secret-free list item. This is the single code-level enforcement of
 * the zero-secret boundary: even if a caller hands it a `/api/entries` row
 * (which the backend leaks secrets through), every secret field is dropped
 * here before the value can reach App state or the UI.
 */
export function toMetadataEntry(raw: any): MobileEntryMetadata {
  // `service` is the api_key display domain; `domain` is the login domain.
  const domain =
    raw?.type === 'api_key'
      ? (raw.domain ?? String(raw.service ?? '').toLowerCase().replace(/\s+/g, '-')) || undefined
      : raw?.domain;

  const projected: MobileEntryMetadata = {
    id: String(raw?.id ?? ''),
    type: fromWireType(raw?.type),
    title: raw?.title ?? '',
    subtitle: domain ?? '',
    domain: domain || undefined,
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    updated: formatUpdated(raw?.updatedAt),
    brand: brandFromTitle(raw?.title ?? ''),
  };

  // Defense-in-depth: assert no secret field survived onto the projection.
  for (const f of SECRET_FIELDS) {
    if (f in projected) {
      delete (projected as any)[f];
    }
  }

  return projected;
}

/** @deprecated kept as the metadata-endpoint alias; use toMetadataEntry. */
const metadataToMobile = toMetadataEntry;

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

export const apiClient = {
  baseUrl: BASE_URL,

  async checkHealth(): Promise<boolean> {
    try {
      await request('/health');
      return true;
    } catch {
      return false;
    }
  },

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
    return (data.metadata ?? []).map(metadataToMobile);
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
