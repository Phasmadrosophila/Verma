/**
 * Trusted AI Redaction Boundary
 *
 * Provides the secure boundary gate between the core vault store and Local AI pipelines.
 * Enforces:
 * 1. Layer boundary: Model adapters ONLY receive redacted projections (AC-B-M1-01-01).
 * 2. Zero secret field exposure & crypto exclusion (AC-B-M1-01-02).
 * 3. Approved metadata allowlist (AC-B-M1-01-03).
 * 4. Lock state revocation (AC-B-M1-01-04).
 */

import {
  VaultEntry,
  RedactedEntryMetadata,
  RedactedVaultProjection,
  RedactedSearchContext,
  RedactedImportContext,
  RedactedTaggingContext,
  RedactedConflictContext,
  RedactedImportRecord,
  IVaultLockProvider,
  VaultLockedError,
} from '../types/index.js';
import { LocalAIAdapter } from '../ai/adapter.js';
import { projectEntryMetadata, projectVaultEntries } from './projection.js';
import { DENIED_SECRET_FIELD_NAMES } from './constants.js';

export interface RedactedHealthEntry {
  readonly id: string;
  readonly title: string;
  readonly domain?: string;
  readonly isWeak: boolean;
  readonly isReused: boolean;
  readonly strengthScore?: number;
  readonly tags: readonly string[];
  readonly updatedAt: number;
}

export interface RedactedHealthContext {
  readonly entries: readonly RedactedHealthEntry[];
}

export class SimpleVaultLockProvider implements IVaultLockProvider {
  private unlocked = false;

  constructor(initialState = false) {
    this.unlocked = initialState;
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  unlock(): void {
    this.unlocked = true;
  }

  lock(): void {
    this.unlocked = false;
  }
}

export class TrustedRedactionBoundary {
  private readonly lockProvider: IVaultLockProvider;

  constructor(lockProvider: IVaultLockProvider = new SimpleVaultLockProvider(false)) {
    this.lockProvider = lockProvider;
  }

  /**
   * Checks whether the underlying vault is unlocked.
   */
  isUnlocked(): boolean {
    return this.lockProvider.isUnlocked();
  }

  /**
   * Asserts that the vault is unlocked, throwing VaultLockedError if locked.
   */
  private assertUnlocked(): void {
    if (!this.lockProvider.isUnlocked()) {
      throw new VaultLockedError(
        'Vault is locked: Local AI metadata access is strictly revoked'
      );
    }
  }

  /**
   * Projects a single entry through the trusted redaction boundary.
   * Returns null for excluded entries (e.g. crypto wallets).
   */
  projectEntry(entry: VaultEntry): RedactedEntryMetadata | null {
    this.assertUnlocked();
    return projectEntryMetadata(entry, true);
  }

  /**
   * Projects a collection of vault entries into a sanitized RedactedVaultProjection.
   */
  projectVault(entries: VaultEntry[]): RedactedVaultProjection {
    this.assertUnlocked();
    return projectVaultEntries(entries, true);
  }

  /**
   * Prepares search context for Ask Your Vault queries over redacted metadata.
   */
  prepareSearchContext(query: string, entries: VaultEntry[]): RedactedSearchContext {
    this.assertUnlocked();
    const projection = this.projectVault(entries);

    return Object.freeze({
      query: String(query ?? ''),
      entries: projection.entries,
      vaultUnlocked: true,
    });
  }

  /**
   * Prepares Smart Import review context.
   * Sanitizes headers and proposed metadata; strips any cell values.
   */
  prepareImportContext(
    importSource: string,
    rawRecords: Array<{
      tempId: string;
      suggestedTitle?: string;
      domain?: string;
      headers?: string[];
      suggestedTags?: string[];
      isLikelyDuplicate?: boolean;
    }>,
    existingEntries: VaultEntry[]
  ): RedactedImportContext {
    this.assertUnlocked();
    const existingProjection = this.projectVault(existingEntries);

    const sanitizedRecords: RedactedImportRecord[] = (rawRecords || []).map((record) => {
      // Keep non-empty header strings, but verify they are not secretly values
      const sanitizedHeaders = Array.isArray(record.headers)
        ? record.headers
            .filter((h): h is string => typeof h === 'string')
            .map((h) => h.trim())
            .filter((h) => h.length > 0 && !DENIED_SECRET_FIELD_NAMES.has(h.toLowerCase()))
        : [];

      const sanitizedTags = Array.isArray(record.suggestedTags)
        ? record.suggestedTags
            .filter((t): t is string => typeof t === 'string')
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : [];

      return Object.freeze({
        tempId: String(record.tempId ?? ''),
        suggestedTitle: record.suggestedTitle ? String(record.suggestedTitle).trim() : undefined,
        domain: record.domain ? String(record.domain).trim() : undefined,
        detectedHeaders: sanitizedHeaders,
        suggestedTags: sanitizedTags,
        isLikelyDuplicate: Boolean(record.isLikelyDuplicate),
      });
    });

    return Object.freeze({
      importSource: String(importSource ?? 'generic_csv'),
      records: Object.freeze(sanitizedRecords),
      existingEntries: existingProjection.entries,
    });
  }

  /**
   * Prepares Auto-Tagging context over existing redacted entries.
   */
  prepareTaggingContext(entries: VaultEntry[]): RedactedTaggingContext {
    this.assertUnlocked();
    const projection = this.projectVault(entries);

    const existingTagSet = new Set<string>();
    for (const entry of projection.entries) {
      for (const tag of entry.tags) {
        existingTagSet.add(tag);
      }
    }

    return Object.freeze({
      entries: projection.entries,
      existingTags: Array.from(existingTagSet).sort(),
    });
  }

  /**
   * Prepares Conflict Assistant context over competing entries.
   */
  prepareConflictContext(entries: VaultEntry[]): RedactedConflictContext {
    this.assertUnlocked();
    const projection = this.projectVault(entries);

    const conflicts = projection.entries
      .filter((e) => e.conflictMetadata && e.conflictMetadata.hasConflict)
      .map((e) => ({
        id: e.id,
        title: e.title,
        domain: e.domain,
        tags: e.tags,
        conflict: e.conflictMetadata!,
      }));

    return Object.freeze({
      conflicts: Object.freeze(conflicts),
    });
  }

  /**
   * Prepares Vault Health Coach context (deterministic flags only).
   */
  prepareHealthContext(entries: VaultEntry[]): RedactedHealthContext {
    this.assertUnlocked();
    const projection = this.projectVault(entries);

    const healthEntries = projection.entries.map((e) => ({
      id: e.id,
      title: e.title,
      domain: e.domain,
      isWeak: e.isWeak,
      isReused: e.isReused,
      strengthScore: e.strengthScore,
      tags: e.tags,
      updatedAt: e.updatedAt,
    }));

    return Object.freeze({
      entries: Object.freeze(healthEntries),
    });
  }

  /**
   * Safely executes an AI callback within the trusted redaction boundary.
   * Enforces lock check and passes ONLY RedactedVaultProjection.
   */
  async executeWithRedaction<TResult>(
    entries: VaultEntry[],
    runner: (projection: RedactedVaultProjection) => Promise<TResult>
  ): Promise<TResult> {
    this.assertUnlocked();
    const projection = this.projectVault(entries);
    return runner(projection);
  }

  /**
   * Invokes a local AI adapter through the trusted redaction boundary.
   *
   * Flow:
   * 1. Validates vault unlock state.
   * 2. Projects raw entries to allowlisted metadata.
   * 3. Calls promptBuilder with the redacted projection.
   * 4. Dispatches the resulting input to the model adapter.
   */
  async invokeModel<TInput, TOutput>(
    adapter: LocalAIAdapter<TInput, TOutput>,
    promptBuilder: (projection: RedactedVaultProjection) => TInput,
    entries: VaultEntry[]
  ): Promise<TOutput> {
    this.assertUnlocked();
    const projection = this.projectVault(entries);
    const modelInput = promptBuilder(projection);
    return adapter.execute(modelInput);
  }
}
