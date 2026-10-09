/**
 * Redacted Metadata Types (AI View)
 * This is the ONLY shape permitted to reach local AI models or prompt builders.
 */

export interface RedactedConflictMetadata {
  readonly hasConflict: boolean;
  readonly conflictingVersion?: number;
  readonly remoteDeviceId?: string;
  readonly conflictFieldNames?: readonly string[];
  readonly baseUpdatedAt?: number;
  readonly remoteUpdatedAt?: number;
}

export interface RedactedEntryMetadata {
  readonly id: string;
  readonly title: string;
  readonly entryType: string;
  readonly domain?: string;
  readonly tags: readonly string[];
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastUsedAt?: number;
  readonly isWeak: boolean;
  readonly isReused: boolean;
  readonly strengthScore?: number;
  readonly fieldLabels: readonly string[];
  readonly importSource?: string;
  readonly conflictMetadata?: RedactedConflictMetadata;
}

export interface RedactedVaultProjection {
  readonly entries: readonly RedactedEntryMetadata[];
  readonly totalEntries: number;
  readonly projectedAt: number;
}

export interface RedactedSearchContext {
  readonly query: string;
  readonly entries: readonly RedactedEntryMetadata[];
  readonly vaultUnlocked: boolean;
}

export interface RedactedTaggingContext {
  readonly entries: readonly RedactedEntryMetadata[];
  readonly existingTags: readonly string[];
}

export interface RedactedConflictItem {
  readonly id: string;
  readonly title: string;
  readonly domain?: string;
  readonly tags: readonly string[];
  readonly conflict: RedactedConflictMetadata;
}

export interface RedactedConflictContext {
  readonly conflicts: readonly RedactedConflictItem[];
}

export interface RedactedImportRecord {
  readonly tempId: string;
  readonly suggestedTitle?: string;
  readonly domain?: string;
  readonly detectedHeaders: readonly string[]; // Column names / field labels only, NO cell values
  readonly suggestedTags?: readonly string[];
  readonly isLikelyDuplicate?: boolean;
}

export interface RedactedImportContext {
  readonly importSource: string;
  readonly records: readonly RedactedImportRecord[];
  readonly existingEntries: readonly RedactedEntryMetadata[];
}
