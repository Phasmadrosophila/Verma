import type { VaultEntry, RedactedEntryMetadata } from './types.ts';

/**
 * Denied field keys that must NEVER appear in model input.
 */
export const DENIED_SECRET_FIELD_KEYS = [
  'password',
  'totpSeed',
  'totp_seed',
  'recoveryCodes',
  'recovery_codes',
  'seedPhrase',
  'seed_phrase',
  'privateKey',
  'private_key',
  'secretValue',
  'secret_value',
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
  'secrets'
];

export class VaultLockedError extends Error {
  constructor(message = 'Vault is locked. Redaction boundary prohibits AI metadata access.') {
    super(message);
    this.name = 'VaultLockedError';
  }
}

/**
 * Redaction boundary function executed in the trusted application layer.
 * Strictly projects raw vault entries into safe, non-secret metadata.
 */
export function redactVaultEntries(
  entries: VaultEntry[],
  isVaultUnlocked: boolean
): RedactedEntryMetadata[] {
  // Invariant 3.5 & AI-004: AI is completely blind while vault is locked
  if (!isVaultUnlocked) {
    return [];
  }

  const redacted: RedactedEntryMetadata[] = [];

  for (const entry of entries) {
    // Invariant 3.1 & 9: Crypto wallet entries (including title and metadata) are 100% excluded
    if (entry.type === 'crypto_wallet') {
      continue;
    }

    // Additional defense: exclude crypto-tagged items if explicitly marked
    const isCrypto = entry.tags.some((t) =>
      ['crypto_wallet', 'seed_phrase', 'cold_storage', 'crypto'].includes(t.toLowerCase())
    );
    if (isCrypto && entry.type !== 'login' && entry.type !== 'note' && entry.type !== 'api_key') {
      continue;
    }

    // Sanitize field labels (only allow non-secret descriptor names)
    const sanitizedFieldLabels = Array.isArray(entry.fieldLabels)
      ? entry.fieldLabels.map((l) => String(l).trim()).filter((l) => l.length > 0 && l.length < 64)
      : [];

    // Projection with strictly allowed metadata only
    const projection: RedactedEntryMetadata = {
      id: String(entry.id),
      title: String(entry.title),
      domain: entry.domain ? String(entry.domain) : undefined,
      tags: Array.isArray(entry.tags) ? entry.tags.map((t) => String(t)) : [],
      createdAt: Number(entry.createdAt) || Date.now(),
      updatedAt: Number(entry.updatedAt) || Date.now(),
      isReused: Boolean(entry.isReused),
      isWeak: Boolean(entry.isWeak),
      fieldLabels: sanitizedFieldLabels
    };

    redacted.push(projection);
  }

  return redacted;
}

/**
 * Validates that an arbitrary payload destined for the AI runtime contains ZERO secret values,
 * zero denied property names, and zero crypto wallet entries.
 */
export function assertZeroSecretExposure(
  modelInput: unknown,
  rawEntries: VaultEntry[],
  recoveryPhrase?: string
): { clean: boolean; leaks: string[] } {
  const leaks: string[] = [];
  const serialized = JSON.stringify(modelInput);
  const serializedLower = serialized.toLowerCase();

  // 1. Check for denied property keys in serialized JSON
  for (const deniedKey of DENIED_SECRET_FIELD_KEYS) {
    const keyPattern = new RegExp(`"${deniedKey}"\\s*:`, 'i');
    if (keyPattern.test(serialized)) {
      leaks.push(`Forbidden property key exposed in model input: "${deniedKey}"`);
    }
  }

  // 2. Check for secret values from raw entries
  for (const entry of rawEntries) {
    const { secrets } = entry;
    if (!secrets) continue;

    if (secrets.password && secrets.password.length > 3 && serialized.includes(secrets.password)) {
      leaks.push(`Password for entry "${entry.id}" found in model input`);
    }
    if (secrets.totpSeed && secrets.totpSeed.length > 4 && serialized.includes(secrets.totpSeed)) {
      leaks.push(`TOTP seed for entry "${entry.id}" found in model input`);
    }
    if (secrets.noteBody && secrets.noteBody.length > 5 && serialized.includes(secrets.noteBody)) {
      leaks.push(`Note body for entry "${entry.id}" found in model input`);
    }
    if (secrets.secretValue && secrets.secretValue.length > 4 && serialized.includes(secrets.secretValue)) {
      leaks.push(`Secret value for entry "${entry.id}" found in model input`);
    }
    if (secrets.seedPhrase && secrets.seedPhrase.length > 8 && serialized.includes(secrets.seedPhrase)) {
      leaks.push(`Seed phrase for entry "${entry.id}" found in model input`);
    }
    if (secrets.privateKey && secrets.privateKey.length > 8 && serialized.includes(secrets.privateKey)) {
      leaks.push(`Private key for entry "${entry.id}" found in model input`);
    }
    if (Array.isArray(secrets.recoveryCodes)) {
      for (const code of secrets.recoveryCodes) {
        if (code && code.length > 4 && serialized.includes(code)) {
          leaks.push(`Recovery code "${code}" found in model input`);
        }
      }
    }

    // 3. Crypto wallet exclusion check: titles and IDs of crypto wallets must NEVER be in AI view
    if (entry.type === 'crypto_wallet') {
      if (serialized.includes(entry.id)) {
        leaks.push(`Crypto wallet entry ID "${entry.id}" leaked into model input`);
      }
      if (entry.title && serialized.includes(entry.title)) {
        leaks.push(`Crypto wallet entry title "${entry.title}" leaked into model input`);
      }
    }
  }

  // 4. Recovery phrase check
  if (recoveryPhrase && serialized.includes(recoveryPhrase)) {
    leaks.push(`Master 24-word recovery phrase leaked into model input`);
  }

  return {
    clean: leaks.length === 0,
    leaks
  };
}
