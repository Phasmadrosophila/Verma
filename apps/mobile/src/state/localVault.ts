/**
 * In-process offline vault — the no-backend, no-network data spine.
 *
 * Exposes EXACTLY the same method signatures as `apiClient` (same return types)
 * so `apiClient` can delegate to it when EXPO_PUBLIC_API_URL is unset. Backed by
 * an in-memory array seeded (structuredClone) from `vaultStore.seedEntries`.
 *
 * Zero-secret boundary (AGENTS.md §3.1): `listEntries` returns ONLY redacted
 * metadata (via `toMetadataEntry`) — no secret field ever leaves it. The display
 * secret is returned ONLY by `getEntrySecret`, for a single explicit reveal, and
 * `askVault` searches ONLY non-secret metadata (via `findMetadata`). No logging
 * of entry content or secrets anywhere in this module.
 */

import {
  ApiError,
  toMetadataEntry,
  type MobileEntryMetadata,
  type VaultStatus,
  type AskResult,
  type EntryDraft,
} from './apiClient.js';
import {
  seedEntries,
  findMetadata,
  type MobileVaultEntry,
} from './vaultStore.js';

/** Demo unlock passphrase — mirrors apps/mobile-preview (lock passphrase). */
const DEMO_PASSPHRASE = 'verma-demo';

let entries: MobileVaultEntry[] = structuredClone(seedEntries);
let locked = true;

function nextId(): string {
  // String UUID-ish id; avoids colliding with numeric seed ids.
  return `local-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** Build a full in-memory entry from a draft (carries the display secret). */
function entryFromDraft(id: string | number, draft: EntryDraft): MobileVaultEntry {
  return {
    id,
    type: draft.type,
    title: draft.title,
    subtitle: draft.subtitle ?? draft.domain ?? '',
    user: draft.user,
    domain: draft.domain,
    tags: draft.tags,
    favorite: false,
    brand: draft.title.toLowerCase().replace(/[^a-z0-9]/g, ''),
    secret: draft.secret,
    updated: 'Just now',
  };
}

/** Redact an in-memory entry to list metadata (reuses the trusted projection). */
function toMetadata(entry: MobileVaultEntry): MobileEntryMetadata {
  // toMetadataEntry expects a wire-ish row: map mobile 'api' -> 'api_key' so the
  // projection resolves the api display domain correctly; secrets are dropped.
  return toMetadataEntry({
    id: entry.id,
    type: entry.type === 'api' ? 'api_key' : entry.type,
    title: entry.title,
    domain: entry.domain,
    tags: entry.tags,
    updatedAt: 0,
  });
}

function requireUnlocked(): void {
  if (locked) throw new ApiError('Vault is locked', 423);
}

function findById(id: string): MobileVaultEntry | undefined {
  return entries.find((e) => String(e.id) === id);
}

export const localVault = {
  baseUrl: 'local://offline',

  async getVaultStatus(): Promise<VaultStatus> {
    return {
      status: locked ? 'locked' : 'unlocked',
      isLocked: locked,
      isInitialized: true,
    };
  },

  async unlockVault(password: string): Promise<void> {
    if (password !== DEMO_PASSPHRASE) {
      throw new ApiError('Incorrect passphrase', 401);
    }
    locked = false;
  },

  async lockVault(): Promise<void> {
    locked = true;
  },

  /** List view: redacted metadata only — never carries secret fields. */
  async listEntries(): Promise<MobileEntryMetadata[]> {
    requireUnlocked();
    return entries.map(toMetadata);
  },

  /** Plaintext secret for ONE entry — explicit reveal only. */
  async getEntrySecret(id: string): Promise<string> {
    requireUnlocked();
    const entry = findById(id);
    if (!entry) throw new ApiError('Entry not found', 404);
    return entry.secret;
  },

  async createEntry(draft: EntryDraft): Promise<MobileEntryMetadata> {
    requireUnlocked();
    const entry = entryFromDraft(nextId(), draft);
    entries.push(entry);
    return toMetadata(entry);
  },

  async updateEntry(id: string, draft: EntryDraft): Promise<MobileEntryMetadata> {
    requireUnlocked();
    const existing = findById(id);
    if (!existing) throw new ApiError('Entry not found', 404);
    const updated = entryFromDraft(existing.id, draft);
    updated.favorite = existing.favorite;
    const idx = entries.indexOf(existing);
    entries[idx] = updated;
    return toMetadata(updated);
  },

  async deleteEntry(id: string): Promise<void> {
    requireUnlocked();
    const existing = findById(id);
    if (!existing) throw new ApiError('Entry not found', 404);
    entries = entries.filter((e) => e !== existing);
  },

  /** Ask Your Vault over redacted metadata only — no secrets in the answer. */
  async askVault(query: string): Promise<AskResult> {
    requireUnlocked();
    const matches = findMetadata(entries, query);
    const relevantEntryIds = matches.map((m) => String(m.entry.id));
    const answer = matches.length
      ? `Found ${matches.length} ${matches.length === 1 ? 'entry' : 'entries'} matching "${query}": ${matches
          .map((m) => m.entry.title)
          .join(', ')}.`
      : `No entries matched "${query}".`;
    return { answer, relevantEntryIds };
  },

  /** Test-only: reset in-memory state back to the seed (locked). */
  __reset(): void {
    entries = structuredClone(seedEntries);
    locked = true;
  },
};
