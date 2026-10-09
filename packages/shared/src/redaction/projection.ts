/**
 * Trusted Allowlist-Based Metadata Projection
 *
 * Implements the core redaction boundary between raw vault data and the Local AI Assistant.
 * Invariants:
 * 1. Redaction is trusted code running before model inference (AC-B-M1-01-01).
 * 2. Denied secret fields and crypto wallet metadata NEVER reach projected output (AC-B-M1-01-02).
 * 3. Only approved metadata fields are present while the vault is unlocked (AC-B-M1-01-03).
 * 4. Locked vault immediately throws VaultLockedError and denies access (AC-B-M1-01-04).
 */

import {
  VaultEntry,
  RedactedEntryMetadata,
  RedactedConflictMetadata,
  RedactedVaultProjection,
  VaultLockedError,
  RedactionSecurityError,
} from '../types/index.js';
import {
  EXCLUDED_ENTRY_TYPES,
  DENIED_SECRET_FIELD_NAMES,
  ALLOWED_METADATA_KEYS,
  ALLOWED_CONFLICT_METADATA_KEYS,
} from './constants.js';

type Writable<T> = { -readonly [P in keyof T]: T[P] };

/**
 * Checks whether an entry is a crypto wallet or contains crypto wallet metadata.
 * Crypto wallets are completely excluded from AI view (PRD §8 & §9).
 */
export function isCryptoWalletEntry(entry: VaultEntry): boolean {
  if (!entry) return false;

  const normalizedType = String(entry.entryType || '').toLowerCase().trim();
  if (EXCLUDED_ENTRY_TYPES.has(normalizedType)) {
    return true;
  }

  // Check for any crypto wallet type prefixes or indicators
  if (
    normalizedType.includes('crypto') ||
    normalizedType.includes('wallet') ||
    normalizedType.includes('seed_phrase')
  ) {
    return true;
  }

  // Check for presence of crypto-specific metadata objects
  if (entry.cryptoWallet && typeof entry.cryptoWallet === 'object') {
    return true;
  }

  if (
    entry.walletAddress ||
    entry.seedPhrase ||
    entry.derivationPath ||
    entry.ethAddress ||
    entry.btcAddress ||
    entry.solAddress
  ) {
    return true;
  }

  return false;
}

/**
 * Sanitizes and extracts non-secret field labels from a vault entry.
 * STRICT: Only field names / labels are extracted; secret values are NEVER read.
 */
function extractFieldLabels(entry: VaultEntry): string[] {
  const labelSet = new Set<string>();

  // Extract from explicit fieldLabels array if present
  if (Array.isArray(entry.fieldLabels)) {
    for (const label of entry.fieldLabels) {
      if (typeof label === 'string') {
        const trimmed = label.trim();
        if (trimmed && !DENIED_SECRET_FIELD_NAMES.has(trimmed.toLowerCase())) {
          labelSet.add(trimmed);
        }
      }
    }
  }

  // Extract labels from custom fields (labels only, values are discarded)
  if (Array.isArray(entry.customFields)) {
    for (const field of entry.customFields) {
      if (field && typeof field.label === 'string') {
        const trimmed = field.label.trim();
        if (trimmed && !DENIED_SECRET_FIELD_NAMES.has(trimmed.toLowerCase())) {
          labelSet.add(trimmed);
        }
      }
    }
  }

  return Array.from(labelSet);
}

/**
 * Projects conflict metadata into a sanitized, non-secret structure.
 */
function projectConflictMetadata(
  conflict?: VaultEntry['conflictMetadata'],
): RedactedConflictMetadata | undefined {
  if (!conflict || typeof conflict !== 'object') {
    return undefined;
  }

  const redacted: Writable<RedactedConflictMetadata> = {
    hasConflict: Boolean(conflict.hasConflict),
  };

  if (typeof conflict.conflictingVersion === 'number') {
    redacted.conflictingVersion = conflict.conflictingVersion;
  }

  if (typeof conflict.remoteDeviceId === 'string' && conflict.remoteDeviceId.trim()) {
    redacted.remoteDeviceId = conflict.remoteDeviceId.trim();
  }

  if (Array.isArray(conflict.conflictFieldNames)) {
    redacted.conflictFieldNames = Object.freeze(
      conflict.conflictFieldNames
        .filter((name): name is string => typeof name === 'string')
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
    );
  }

  if (typeof conflict.baseUpdatedAt === 'number') {
    redacted.baseUpdatedAt = conflict.baseUpdatedAt;
  }

  if (typeof conflict.remoteUpdatedAt === 'number') {
    redacted.remoteUpdatedAt = conflict.remoteUpdatedAt;
  }

  // Enforce allowlist on conflict metadata keys
  for (const key of Object.keys(redacted)) {
    if (!ALLOWED_CONFLICT_METADATA_KEYS.has(key)) {
      throw new RedactionSecurityError(
        `Unexpected key '${key}' in projected conflict metadata`
      );
    }
  }

  return Object.freeze(redacted);
}

/**
 * Validates that a projected entry contains ONLY allowlisted keys and zero denied fields.
 */
function validateProjectedMetadata(metadata: RedactedEntryMetadata): void {
  const keys = Object.keys(metadata);

  for (const key of keys) {
    if (!ALLOWED_METADATA_KEYS.has(key)) {
      throw new RedactionSecurityError(
        `Security violation: Key '${key}' is not in the approved metadata allowlist`
      );
    }

    if (DENIED_SECRET_FIELD_NAMES.has(key)) {
      throw new RedactionSecurityError(
        `Security violation: Denied secret field '${key}' found in projected metadata`
      );
    }
  }
}

/**
 * Projects a single raw VaultEntry into a RedactedEntryMetadata view.
 * Returns null if the entry is excluded (e.g. crypto wallet).
 * Throws VaultLockedError if isVaultUnlocked is false.
 */
export function projectEntryMetadata(
  entry: VaultEntry,
  isVaultUnlocked: boolean
): RedactedEntryMetadata | null {
  if (!isVaultUnlocked) {
    throw new VaultLockedError('Vault is locked: AI metadata projection is revoked');
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  // AC-B-M1-01-02: Crypto wallet entries are completely excluded from AI view
  if (isCryptoWalletEntry(entry)) {
    return null;
  }

  // Construct pure allowlist projection - brand new object
  const projected: Writable<RedactedEntryMetadata> = {
    id: String(entry.id ?? ''),
    title: String(entry.title ?? ''),
    entryType: String(entry.entryType ?? 'login'),
    tags: Object.freeze(
      Array.isArray(entry.tags)
        ? entry.tags
            .filter((t): t is string => typeof t === 'string')
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : []
    ),
    createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
    updatedAt: typeof entry.updatedAt === 'number' ? entry.updatedAt : Date.now(),
    isWeak: Boolean(entry.isWeak),
    isReused: Boolean(entry.isReused),
    fieldLabels: Object.freeze(extractFieldLabels(entry)),
  };

  if (typeof entry.domain === 'string' && entry.domain.trim()) {
    projected.domain = entry.domain.trim();
  }

  if (typeof entry.lastUsedAt === 'number') {
    projected.lastUsedAt = entry.lastUsedAt;
  }

  if (typeof entry.strengthScore === 'number') {
    projected.strengthScore = entry.strengthScore;
  }

  if (typeof entry.importSource === 'string' && entry.importSource.trim()) {
    projected.importSource = entry.importSource.trim();
  }

  const conflictMetadata = projectConflictMetadata(entry.conflictMetadata);
  if (conflictMetadata) {
    projected.conflictMetadata = conflictMetadata;
  }

  // Deep validation of projection shape
  validateProjectedMetadata(projected);

  return Object.freeze(projected);
}

/**
 * Projects an array of VaultEntries into a RedactedVaultProjection.
 * Throws VaultLockedError if vault is locked.
 */
export function projectVaultEntries(
  entries: VaultEntry[],
  isVaultUnlocked: boolean
): RedactedVaultProjection {
  if (!isVaultUnlocked) {
    throw new VaultLockedError('Vault is locked: AI metadata projection is revoked');
  }

  const projectedEntries: RedactedEntryMetadata[] = [];

  for (const entry of entries) {
    const projected = projectEntryMetadata(entry, isVaultUnlocked);
    if (projected !== null) {
      projectedEntries.push(projected);
    }
  }

  return Object.freeze({
    entries: Object.freeze(projectedEntries),
    totalEntries: projectedEntries.length,
    projectedAt: Date.now(),
  });
}
