export type EntryType = 'login' | 'note' | 'api';

export interface MobileVaultEntry {
  // Backend IDs are string UUIDs (e.g. "syn-api-001"). Locally-created seed
  // rows may still use a numeric id, so accept both.
  id: string | number;
  type: EntryType;
  title: string;
  subtitle: string;
  user?: string;
  domain?: string;
  tags: string[];
  favorite: boolean;
  brand: string;
  /**
   * Display secret. Empty for list items (zero-secret boundary) and populated
   * ONLY when the user explicitly reveals one entry via the API.
   */
  secret: string;
  updated: string;
}



export interface PairedDevice {
  id: string;
  name: string;
  type: 'laptop' | 'phone';
  lastSync: string;
  status: 'active' | 'offline';
}

// Removed unused seed data

export const recoveryWordList = [
  'orchard', 'beacon', 'harbor', 'summit', 'meadow', 'crystal',
  'timber', 'canyon', 'valley', 'ember', 'glacier', 'breeze',
  'pebble', 'feather', 'lantern', 'sparrow', 'ripple', 'cobalt',
  'whisper', 'forest', 'canvas', 'horizon', 'willow', 'sunset',
];

export function filterEntries(
  entries: MobileVaultEntry[],
  query: string = '',
  filter: string = 'all'
): MobileVaultEntry[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.filter((e) => {
    const matchesFilter =
      filter === 'all' ||
      e.type === filter ||
      (filter === 'favorite' && e.favorite);

    if (!matchesFilter) return false;
    if (words.length === 0) return true;

    const searchable = [e.title, e.subtitle, e.domain ?? '', e.user ?? '', ...e.tags]
      .join(' ')
      .toLowerCase();

    return words.every((word) => searchable.includes(word));
  });
}

/**
 * Strict Zero-Secret AI boundary projection.
 * Searches ONLY non-secret metadata tokens (title, subtitle, domain, tags, type).
 * Passwords, recovery codes, and note contents NEVER enter this matcher.
 */
export function findMetadata(
  entries: MobileVaultEntry[],
  query: string
): { entry: MobileVaultEntry; matched: string[]; score: number }[] {
  const stopWords = new Set([
    'my', 'the', 'for', 'a', 'an', 'of', 'to', 'and', 'account', 'accounts',
    'i', 'me', 'that', 'is', 'where', 'what', 'find', 'please',
  ]);
  const tokens = Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 1 && !stopWords.has(t))
    )
  );

  const aliases: Record<string, string[]> = {
    streaming: ['netflix', 'streaming', 'spotify'],
    code: ['github', 'development'],
    token: ['api', 'token'],
    wifi: ['wi-fi', 'network', 'router'],
    cloud: ['cloud', 'digitalocean'],
    family: ['family'],
    work: ['work', 'company'],
  };

  return entries
    .map((e) => {
      const metadataHaystack = [
        e.title,
        e.subtitle,
        e.domain ?? '',
        ...e.tags,
        e.type,
      ]
        .join(' ')
        .toLowerCase();

      const matched = tokens.filter((t) =>
        (aliases[t] || [t]).some((word) => metadataHaystack.includes(word))
      );

      return { entry: e, matched, score: matched.length };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

/**
 * Non-AI Cryptographically Secure Password Generator with rejection sampling.
 */
export function generatePassword(length: number = 20): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#_-';
  const limit = 256 - (256 % chars.length);
  let result = '';

  const getRandomBytes = (size: number): Uint8Array => {
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
      return globalThis.crypto.getRandomValues(new Uint8Array(size));
    }
    // Fallback for environments where crypto is under require or global
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  };

  while (result.length < length) {
    for (const byte of getRandomBytes(length)) {
      if (byte < limit && result.length < length) {
        result += chars[byte % chars.length];
      }
    }
  }

  return result;
}

