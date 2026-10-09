/**
 * Core domain types and verification interfaces for Verma release harness (E-MR-01).
 */

export type EntryType = 'login' | 'note' | 'api_key' | 'crypto_wallet';

export interface VaultSecretPayload {
  password?: string;
  totpSeed?: string;
  recoveryCodes?: string[];
  seedPhrase?: string;
  privateKey?: string;
  secretValue?: string;
  noteBody?: string;
  fileContent?: string;
}

export interface VaultEntry {
  id: string;
  type: EntryType;
  title: string;
  domain?: string;
  username?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isReused?: boolean;
  isWeak?: boolean;
  fieldLabels: string[];
  secrets: VaultSecretPayload;
}

export interface RedactedEntryMetadata {
  id: string;
  title: string;
  domain?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isReused: boolean;
  isWeak: boolean;
  fieldLabels: string[];
}

export interface SmartImportColumnMapping {
  csvHeader: string;
  targetField: 'title' | 'domain' | 'username' | 'password' | 'note' | 'tags' | 'ignore';
  confidence: number;
}

export interface SmartImportTagSuggestion {
  entryId: string;
  suggestedTags: string[];
  rationale: string;
}

export interface SmartImportDuplicateGroup {
  groupId: string;
  primaryEntryId: string;
  duplicateEntryIds: string[];
  matchReason: string;
}

export interface SmartImportProposal {
  columnMappings: SmartImportColumnMapping[];
  tagSuggestions: SmartImportTagSuggestion[];
  duplicateGroups: SmartImportDuplicateGroup[];
  totalRecords: number;
}

export interface AskQueryResult {
  query: string;
  matchedEntries: Array<{
    id: string;
    title: string;
    domain?: string;
    tags: string[];
    relevanceScore: number;
    matchSnippet: string;
    isSecretLocked: boolean;
  }>;
  explanation: string;
}

export interface DeviceIdentity {
  deviceId: string;
  publicKeyDerHex: string;
  keyPair: {
    publicKey: import('node:crypto').KeyObject;
    privateKey: import('node:crypto').KeyObject;
  };
}

export interface EncryptedSyncDelta {
  deltaId: string;
  senderDeviceId: string;
  ivHex: string;
  authTagHex: string;
  ciphertextHex: string;
  signatureHex: string;
  timestamp: number;
  version: number;
}

export interface LogEvent {
  eventId: string;
  category: 'AUTH' | 'VAULT' | 'AI' | 'SYNC' | 'SYSTEM';
  action: string;
  timestamp: number;
  status: 'SUCCESS' | 'FAILURE' | 'INFO' | 'WARN';
  details?: Record<string, string | number | boolean>;
}

export interface ACVerificationResult {
  acId: string;
  name: string;
  passed: boolean;
  durationMs: number;
  details: string;
  subchecks: Array<{
    name: string;
    passed: boolean;
    evidence?: string;
  }>;
}

export interface RehearsalRunResult {
  runNumber: number;
  passed: boolean;
  durationMs: number;
  steps: Array<{
    step: number;
    name: string;
    passed: boolean;
    durationMs: number;
  }>;
}

export interface FullVerificationReport {
  timestamp: string;
  allPassed: boolean;
  acResults: ACVerificationResult[];
  rehearsalRuns: RehearsalRunResult[];
  totalDurationMs: number;
}
