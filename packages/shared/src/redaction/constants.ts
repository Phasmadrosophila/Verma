/**
 * Security & Redaction Constants
 * Defines strict allowlists, denied field patterns, and excluded entry types.
 */

/**
 * Entry types that are completely excluded from AI view.
 * Per PRD §8 & §9: "Crypto wallet entries, including their titles and metadata,
 * are excluded from the AI view entirely."
 */
export const EXCLUDED_ENTRY_TYPES = new Set<string>([
  'crypto_wallet',
  'crypto',
  'cryptocurrency',
  'wallet',
  'seed_phrase',
  'private_key',
  'web3_wallet',
  'hardware_wallet',
]);

/**
 * Explicit Denylist of secret and private field names.
 * These keys must NEVER appear in any projected object or serialized AI prompt.
 */
export const DENIED_SECRET_FIELD_NAMES = new Set<string>([
  'password',
  'passphrase',
  'pin',
  'totpSeed',
  'totpToken',
  'totpSecret',
  'twoFactorSecret',
  'otp',
  'recoveryCodes',
  'recoveryCode',
  'recoveryPhrase',
  'recoveryPhrases',
  'seedPhrase',
  'mnemonic',
  'mnemonicPhrase',
  'privateKey',
  'privateKeyPem',
  'secretKey',
  'secretValue',
  'secret',
  'secrets',
  'noteBody',
  'noteText',
  'notes',
  'note',
  'body',
  'content',
  'text',
  'fileContents',
  'fileData',
  'binaryContent',
  'attachmentData',
  'attachments',
  'vaultMasterKey',
  'masterKey',
  'derivedKey',
  'encryptionKey',
  'cryptoWallet',
  'walletAddress',
  'network',
  'derivationPath',
  'accountIndex',
  'ethAddress',
  'btcAddress',
  'solAddress',
  'cvv',
  'cardNumber',
  'creditCardNumber',
]);

/**
 * Strict allowlist of top-level keys permitted on RedactedEntryMetadata.
 */
export const ALLOWED_METADATA_KEYS = new Set<string>([
  'id',
  'title',
  'entryType',
  'domain',
  'tags',
  'createdAt',
  'updatedAt',
  'lastUsedAt',
  'isWeak',
  'isReused',
  'strengthScore',
  'fieldLabels',
  'importSource',
  'conflictMetadata',
]);

/**
 * Strict allowlist of keys permitted on RedactedConflictMetadata.
 */
export const ALLOWED_CONFLICT_METADATA_KEYS = new Set<string>([
  'hasConflict',
  'conflictingVersion',
  'remoteDeviceId',
  'conflictFieldNames',
  'baseUpdatedAt',
  'remoteUpdatedAt',
]);
