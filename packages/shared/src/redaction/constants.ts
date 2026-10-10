/**
 * Denied secret field property names that MUST NEVER be exposed to the Local AI model or metadata projections.
 */
export const DENIED_SECRET_FIELD_KEYS = [
  'password',
  'totpSecret',
  'totp_secret',
  'totpSeed',
  'totp_seed',
  'recoveryCodes',
  'recovery_codes',
  'seedPhrase',
  'seed_phrase',
  'privateKey',
  'private_key',
  'secret',
  'secretValue',
  'secret_value',
  'apiKey',
  'api_key',
  'apiSecret',
  'api_secret',
  'content',
  'noteBody',
  'note_body',
  'fileContent',
  'file_content',
  'masterKey',
  'master_key',
  'vaultKey',
  'vault_key',
  'recoveryPhrase',
  'recovery_phrase',
  'mnemonic',
  'walletAddress',
  'wallet_address',
  'privateData',
  'private_data',
  'secrets',
] as const;

/**
 * Entry types that are completely excluded from Local AI metadata projection.
 * Crypto wallets are explicitly denied per PRD Section 9 / AGENTS.md Section 3.1.
 */
export const EXCLUDED_AI_ENTRY_TYPES = [
  'crypto_wallet',
  'crypto',
  'wallet',
  'seed_phrase',
] as const;
