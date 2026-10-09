/**
 * Denied secret field property names that MUST NEVER be exposed to the Local AI model or metadata projections.
 */
export const DENIED_SECRET_FIELD_KEYS = [
  'password',
  'totpSecret',
  'recoveryCodes',
  'seedPhrase',
  'privateKey',
  'secret',
  'apiKey',
  'apiSecret',
  'content',
  'fileContent',
  'masterKey',
  'recoveryPhrase',
  'mnemonic',
  'walletAddress',
  'privateData',
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
