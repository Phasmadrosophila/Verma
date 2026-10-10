/**
 * On-device offline vault backed by expo-sqlite (real persistence).
 *
 * Exposes the SAME method surface as `localVault` / `httpClient` (it is
 * `typeof httpClient`), so `apiClient` can delegate to it in offline mode on a
 * device while the in-memory `localVault` continues to serve the node test
 * path. Vault rows persist across app launches in a single SQLite table; the
 * lock state stays in-memory (locking is a per-session gate, data persists).
 *
 * TODO(import-persistence): App.tsx `handleCommitImport` (App.tsx:139) is
 * UI-only — it never calls `createEntry`, so imported rows are NOT persisted.
 * To make imports durable, App.tsx must call `apiClient.createEntry(...)` for
 * each accepted imported row (App.tsx is owned by another agent; wiring is
 * deferred to that owner).
 *
 * SECURITY (AGENTS.md §3.1): zero-secret boundary is preserved. `listEntries`
 * and `askVault` return redacted metadata only (via `toMetadataEntry` /
 * `findMetadata`); `getEntrySecret` is the ONLY secret egress. No entry content
 * or secret value is ever logged.
 *
 * NOTE: at-rest ENCRYPTION (libsodium / SQLCipher) is intentionally OUT OF
 * SCOPE for this pass. Secret values are stored as PLAINTEXT in expo-sqlite.
 * This is persistence only — do NOT describe this store as encrypted.
 * TODO(at-rest-encryption): wrap payloads with a vetted primitive before the
 * hackathon security bar is claimed.
 */

import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import {
  ApiError,
  toMetadataEntry,
  type MobileEntryMetadata,
  type VaultStatus,
  type AskResult,
  type EntryDraft,
} from './vaultTypes';
import {
  seedEntries,
  findMetadata,
  type MobileVaultEntry,
} from './vaultStore';

/** Demo unlock passphrase — mirrors localVault / apps/mobile-preview. */
const DEMO_PASSPHRASE = 'verma-demo';

const DB_NAME = 'verma-offline.db';
/** Bump when the entries schema changes; drives the idempotent migration. */
const SCHEMA_VERSION = 1;

/** Row shape as persisted (tags JSON-encoded; favorite as 0/1 int). */
interface EntryRow {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  user: string | null;
  domain: string | null;
  tags: string;
  favorite: number;
  brand: string;
  secret: string;
  updated: string;
}

// Offline demo starts UNLOCKED (matches localVault.ts:36) so "Explore demo"
// lands on a populated vault. Lock state is in-memory; data persists in SQLite.
let locked = false;

let db: SQLiteDatabase | null = null;

/** Open + migrate (idempotent) + seed-once. Safe to call repeatedly. */
function getDb(): SQLiteDatabase {
  if (db) return db;
  const handle = openDatabaseSync(DB_NAME);

  // Idempotent schema init + a simple schema_version meta row.
  handle.execSync(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      user TEXT,
      domain TEXT,
      tags TEXT NOT NULL,
      favorite INTEGER NOT NULL DEFAULT 0,
      brand TEXT NOT NULL,
      secret TEXT NOT NULL,
      updated TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  const versionRow = handle.getFirstSync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    'schema_version'
  );
  if (!versionRow) {
    handle.runSync('INSERT INTO meta (key, value) VALUES (?, ?)', 'schema_version', String(SCHEMA_VERSION));
  }

  // Seed ONCE: only when the vault has never been seeded (meta flag absent).
  const seededRow = handle.getFirstSync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    'seeded'
  );
  if (!seededRow) {
    handle.withTransactionSync(() => {
      for (const entry of seedEntries) {
        insertRow(handle, toRow(entry));
      }
      handle.runSync('INSERT INTO meta (key, value) VALUES (?, ?)', 'seeded', '1');
    });
  }

  db = handle;
  return handle;
}

function toRow(entry: MobileVaultEntry): EntryRow {
  return {
    id: String(entry.id),
    type: entry.type,
    title: entry.title,
    subtitle: entry.subtitle,
    user: entry.user ?? null,
    domain: entry.domain ?? null,
    tags: JSON.stringify(entry.tags),
    favorite: entry.favorite ? 1 : 0,
    brand: entry.brand,
    secret: entry.secret,
    updated: entry.updated,
  };
}

function fromRow(row: EntryRow): MobileVaultEntry {
  return {
    id: row.id,
    type: row.type as MobileVaultEntry['type'],
    title: row.title,
    subtitle: row.subtitle,
    user: row.user ?? undefined,
    domain: row.domain ?? undefined,
    tags: JSON.parse(row.tags) as string[],
    favorite: row.favorite === 1,
    brand: row.brand,
    secret: row.secret,
    updated: row.updated,
  };
}

function insertRow(handle: SQLiteDatabase, row: EntryRow): void {
  handle.runSync(
    `INSERT OR REPLACE INTO entries
      (id, type, title, subtitle, user, domain, tags, favorite, brand, secret, updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id, row.type, row.title, row.subtitle, row.user, row.domain,
    row.tags, row.favorite, row.brand, row.secret, row.updated
  );
}

function nextId(): string {
  // String id; avoids colliding with numeric seed ids (matches localVault).
  return `local-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** Build a full entry row from a draft (carries the display secret). */
function entryFromDraft(id: string, draft: EntryDraft): MobileVaultEntry {
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

/** Redact an entry to list metadata (reuses the trusted projection). */
function toMetadata(entry: MobileVaultEntry): MobileEntryMetadata {
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

function allEntries(): MobileVaultEntry[] {
  const rows = getDb().getAllSync<EntryRow>('SELECT * FROM entries');
  return rows.map(fromRow);
}

function findById(id: string): MobileVaultEntry | undefined {
  const row = getDb().getFirstSync<EntryRow>('SELECT * FROM entries WHERE id = ?', id);
  return row ? fromRow(row) : undefined;
}

export const sqliteVault = {
  baseUrl: 'local://offline-sqlite',

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
    return allEntries().map(toMetadata);
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
    insertRow(getDb(), toRow(entry));
    return toMetadata(entry);
  },

  async updateEntry(id: string, draft: EntryDraft): Promise<MobileEntryMetadata> {
    requireUnlocked();
    const existing = findById(id);
    if (!existing) throw new ApiError('Entry not found', 404);
    const updated = entryFromDraft(String(existing.id), draft);
    updated.favorite = existing.favorite;
    insertRow(getDb(), toRow(updated));
    return toMetadata(updated);
  },

  async deleteEntry(id: string): Promise<void> {
    requireUnlocked();
    const existing = findById(id);
    if (!existing) throw new ApiError('Entry not found', 404);
    getDb().runSync('DELETE FROM entries WHERE id = ?', id);
  },

  /** Ask Your Vault over redacted metadata only — no secrets in the answer. */
  async askVault(query: string): Promise<AskResult> {
    requireUnlocked();
    const matches = findMetadata(allEntries(), query);
    const relevantEntryIds = matches.map((m) => String(m.entry.id));
    const answer = matches.length
      ? `Found ${matches.length} ${matches.length === 1 ? 'entry' : 'entries'} matching "${query}": ${matches
          .map((m) => m.entry.title)
          .join(', ')}.`
      : `No entries matched "${query}".`;
    return { answer, relevantEntryIds };
  },

  /** Test-only: wipe + re-seed + re-lock. Not used by the node test path. */
  __reset(): void {
    const handle = getDb();
    handle.withTransactionSync(() => {
      handle.runSync('DELETE FROM entries');
      for (const entry of seedEntries) {
        insertRow(handle, toRow(entry));
      }
    });
    locked = true;
  },
};
