import type { VaultEntry, LoginEntry, NoteEntry, ApiKeyEntry } from '../types/entry.js';
import type { RedactedEntryMetadata } from '../types/metadata.js';
import { checkPasswordStrength, checkPasswordReuse } from '../crypto/deterministic-checks.js';

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
] as const;

export function extractFieldLabels(entry: VaultEntry): string[] {
  switch (entry.type) {
    case 'login': {
      const login = entry as LoginEntry;
      const labels = ['username', 'password'];
      if (login.url) labels.push('url');
      if (login.totpSecret) labels.push('totpSecret');
      if (login.recoveryCodes && login.recoveryCodes.length > 0) labels.push('recoveryCodes');
      if (login.customFields) {
        for (const cf of login.customFields) {
          if (cf.label) labels.push(cf.label);
        }
      }
      return labels;
    }
    case 'note': {
      const note = entry as NoteEntry;
      const labels = ['content'];
      if (note.category) labels.push('category');
      return labels;
    }
    case 'api_key': {
      const apiKey = entry as ApiKeyEntry;
      const labels = ['service', 'apiKey'];
      if (apiKey.apiSecret) labels.push('apiSecret');
      if (apiKey.keyId) labels.push('keyId');
      if (apiKey.expiresAt !== undefined) labels.push('expiresAt');
      return labels;
    }
    default:
      return [];
  }
}

export function extractDomain(entry: VaultEntry): string | undefined {
  if (entry.type === 'login') {
    const login = entry as LoginEntry;
    if (login.domain) return login.domain;
    if (login.url) {
      try {
        const parsed = new URL(login.url.startsWith('http') ? login.url : `https://${login.url}`);
        return parsed.hostname.replace(/^www\./, '');
      } catch {
        return login.url;
      }
    }
  } else if (entry.type === 'api_key') {
    const apiKey = entry as ApiKeyEntry;
    return apiKey.service.toLowerCase().replace(/\s+/g, '-');
  }
  return undefined;
}

export function toRedactedMetadata(
  entry: VaultEntry,
  options: { isWeak?: boolean; isReused?: boolean } = {}
): RedactedEntryMetadata {
  let isWeak = options.isWeak;
  if (isWeak === undefined && entry.type === 'login') {
    const login = entry as LoginEntry;
    if (login.password) {
      isWeak = checkPasswordStrength(login.password).isWeak;
    }
  }

  const metadata: RedactedEntryMetadata = {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    tags: [...entry.tags],
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    fieldLabels: extractFieldLabels(entry),
  };

  const domain = extractDomain(entry);
  if (domain) {
    metadata.domain = domain;
  }

  if (isWeak !== undefined) {
    metadata.isWeak = isWeak;
  }

  if (options.isReused !== undefined) {
    metadata.isReused = options.isReused;
  }

  return metadata;
}

export function projectEntriesMetadata(entries: VaultEntry[]): RedactedEntryMetadata[] {
  const reuseMap = checkPasswordReuse(entries);

  return entries.map((entry) =>
    toRedactedMetadata(entry, {
      isReused: reuseMap.get(entry.id) ?? false,
    })
  );
}

export function assertSafeMetadata(
  metadata: RedactedEntryMetadata,
  originalEntry: VaultEntry
): { isSafe: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check that no secret properties exist on metadata
  for (const denied of DENIED_SECRET_FIELD_KEYS) {
    if (denied in metadata) {
      violations.push(`Metadata contains forbidden key "${denied}"`);
    }
  }

  // Check that secret values do not appear in string fields of metadata
  const stringified = JSON.stringify(metadata);

  if (originalEntry.type === 'login') {
    const login = originalEntry as LoginEntry;
    if (login.password && login.password.length > 3 && stringified.includes(login.password)) {
      violations.push(`Metadata contains raw login password value`);
    }
    if (login.totpSecret && login.totpSecret.length > 3 && stringified.includes(login.totpSecret)) {
      violations.push(`Metadata contains raw TOTP secret value`);
    }
    if (login.recoveryCodes) {
      for (const code of login.recoveryCodes) {
        if (code && code.length > 3 && stringified.includes(code)) {
          violations.push(`Metadata contains raw recovery code value`);
        }
      }
    }
  } else if (originalEntry.type === 'note') {
    const note = originalEntry as NoteEntry;
    if (note.content && note.content.length > 4 && stringified.includes(note.content)) {
      violations.push(`Metadata contains raw note content value`);
    }
  } else if (originalEntry.type === 'api_key') {
    const apiKey = originalEntry as ApiKeyEntry;
    if (apiKey.apiKey && apiKey.apiKey.length > 4 && stringified.includes(apiKey.apiKey)) {
      violations.push(`Metadata contains raw API key value`);
    }
    if (apiKey.apiSecret && apiKey.apiSecret.length > 4 && stringified.includes(apiKey.apiSecret)) {
      violations.push(`Metadata contains raw API secret value`);
    }
  }

  return {
    isSafe: violations.length === 0,
    violations,
  };
}
