/**
 * Vault Entry Domain Types
 * Represents raw / decrypted vault entries in memory.
 */

export type EntryType =
  | 'login'
  | 'note'
  | 'api_key'
  | 'crypto_wallet'
  | 'card'
  | 'identity'
  | (string & {});

export interface CustomField {
  label: string;
  value?: string;
  isSecret?: boolean;
}

export interface Attachment {
  id?: string;
  name: string;
  size?: number;
  mimeType?: string;
  content?: string | Uint8Array;
}

export interface ConflictMetadata {
  hasConflict: boolean;
  conflictingVersion?: number;
  remoteDeviceId?: string;
  conflictFieldNames?: string[];
  baseUpdatedAt?: number;
  remoteUpdatedAt?: number;
  // Raw conflicting payload (must be stripped during redaction)
  conflictingPayload?: Record<string, unknown>;
}

export interface CryptoWalletMetadata {
  walletAddress?: string;
  network?: string;
  derivationPath?: string;
  accountIndex?: number;
  seedPhrase?: string;
  privateKey?: string;
}

export interface VaultEntry {
  id: string;
  title: string;
  entryType: EntryType;
  domain?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;

  // Deterministic analysis flags (computed deterministically, non-secret)
  isWeak?: boolean;
  isReused?: boolean;
  strengthScore?: number;

  // Non-secret metadata
  importSource?: string;
  fieldLabels?: string[];
  conflictMetadata?: ConflictMetadata;

  // === STRICTLY DENIED SECRET FIELDS ===
  // These fields must NEVER reach the AI model or any untrusted process.
  password?: string;
  totpSeed?: string;
  totpToken?: string;
  recoveryCodes?: string[];
  recoveryPhrase?: string | string[];
  seedPhrase?: string;
  privateKey?: string;
  secretValue?: string;
  noteBody?: string;
  fileContents?: string | Uint8Array;
  attachments?: Attachment[];
  vaultMasterKey?: string;
  customFields?: CustomField[];
  cryptoWallet?: CryptoWalletMetadata;

  // Direct crypto wallet properties if flat
  walletAddress?: string;
  network?: string;
  derivationPath?: string;
  accountIndex?: number;

  // Catch-all for arbitrary unredacted properties
  [key: string]: unknown;
}
