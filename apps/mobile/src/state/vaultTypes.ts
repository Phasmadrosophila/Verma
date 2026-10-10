/**
 * Shared vault types + the trusted redaction projection.
 *
 * This is a LEAF module (imports nothing from apiClient/localVault), so both the
 * HTTP client and the offline localVault can import these primitives without a
 * require cycle. `ApiError` and `toMetadataEntry` live here because both backends
 * need them; keeping them here is what lets apiClient import localVault one-way.
 */

export type MobileEntryType = 'login' | 'note' | 'api';

/** The backend entry type. Mobile uses 'api'; the wire uses 'api_key'. */
export type WireEntryType = 'login' | 'note' | 'api_key';

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

/**
 * Discriminated error taxonomy. Maps a raw `ApiError` (or any thrown value) to
 * one actionable kind so callers route by meaning instead of by `.message`:
 *   - Offline       transport failed / status 0 — show "you're offline", retry
 *   - Locked         423 — the vault is locked; route to the lock screen
 *   - Unauthorized   401 — wrong passphrase
 *   - NotFound       404 — entry missing
 *   - Server         >=500 — backend error
 *   - Unknown        anything else
 */
export type ErrorKind =
  | 'Offline'
  | 'Locked'
  | 'Unauthorized'
  | 'NotFound'
  | 'Server'
  | 'Unknown';

/** Classify a thrown value into an `ErrorKind`. Never throws. */
export function classifyError(err: unknown): ErrorKind {
  if (err instanceof ApiError) {
    if (err.isNetworkError || err.status === 0) return 'Offline';
    if (err.status === 423) return 'Locked';
    if (err.status === 401) return 'Unauthorized';
    if (err.status === 404) return 'NotFound';
    if (err.status >= 500) return 'Server';
  }
  return 'Unknown';
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
