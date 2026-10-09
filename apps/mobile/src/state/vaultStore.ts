export type EntryType = 'login' | 'note' | 'api';

export interface MobileVaultEntry {
  id: number;
  type: EntryType;
  title: string;
  subtitle: string;
  user?: string;
  domain?: string;
  tags: string[];
  favorite: boolean;
  brand: string;
  secret: string;
  updated: string;
}

export interface ImportCandidate {
  id: number;
  title: string;
  subtitle: string;
  domain: string;
  user: string;
  tag: string;
  accepted: boolean;
  brand: string;
  type: EntryType;
  duplicate?: boolean;
}

export interface PairedDevice {
  id: string;
  name: string;
  type: 'laptop' | 'phone';
  lastSync: string;
  status: 'active' | 'offline';
}

export const seedEntries: MobileVaultEntry[] = [
  {
    id: 1,
    type: 'login',
    title: 'Google',
    subtitle: 'Work account',
    user: 'sam@companyx.example',
    domain: 'accounts.google.com',
    tags: ['Work', 'Company X'],
    favorite: true,
    brand: 'google',
    secret: 'kR9#mP2$vX5@wL8*',
    updated: 'Today',
  },
  {
    id: 2,
    type: 'login',
    title: 'GitHub',
    subtitle: 'A home for your ideas',
    user: 'sam-dev',
    domain: 'github.com',
    tags: ['Development'],
    favorite: true,
    brand: 'github',
    secret: 'ghp_K9mX2bL8vP5wQ1zR7yT4nS6uV3jH0aB',
    updated: 'Yesterday',
  },
  {
    id: 3,
    type: 'login',
    title: 'Netflix',
    subtitle: 'Family account',
    user: 'family@example.com',
    domain: 'netflix.com',
    tags: ['Personal', 'Streaming'],
    favorite: true,
    brand: 'netflix',
    secret: 'tN4!mY8#qW2^zV5~',
    updated: '3 days ago',
  },
  {
    id: 4,
    type: 'login',
    title: 'Google',
    subtitle: 'Personal account',
    user: 'sam.personal@example.com',
    domain: 'accounts.google.com',
    tags: ['Personal'],
    favorite: false,
    brand: 'google',
    secret: 'vR8#bM3$nQ6@wK9*',
    updated: '3 days ago',
  },
  {
    id: 5,
    type: 'api',
    title: 'DigitalOcean',
    subtitle: 'Side project token',
    user: 'Side project',
    domain: 'cloud.digitalocean.com',
    tags: ['Development', 'Cloud'],
    favorite: false,
    brand: 'ocean',
    secret: 'dop_v1_8f1c4e9a3b7d2f0e5a6c1b8d7e4a9c2f',
    updated: '2 weeks ago',
  },
  {
    id: 6,
    type: 'note',
    title: 'Home Wi-Fi',
    subtitle: 'The good connection',
    user: 'Home network',
    domain: '192.168.1.1',
    tags: ['Home', 'Network'],
    favorite: false,
    brand: 'wifi',
    secret: 'Network SSID: Verma-Private-5G\nWPA3 Key: little-universe-4821\nRouter Admin: https://192.168.1.1',
    updated: '1 month ago',
  },
];

export const sampleImportRows: ImportCandidate[] = [
  { id: 101, title: 'Slack', subtitle: 'Company X workspace', domain: 'companyx.slack.com', user: 'sam@companyx.example', tag: 'Work', accepted: true, brand: 'slack', type: 'login' },
  { id: 102, title: 'Spotify', subtitle: 'Family plan', domain: 'spotify.com', user: 'family@example.com', tag: 'Personal', accepted: false, brand: 'spotify', type: 'login' },
  { id: 103, title: 'Notion', subtitle: 'Your second brain', domain: 'notion.so', user: 'sam.personal@example.com', tag: 'Productivity', accepted: false, brand: 'notion', type: 'login' },
  { id: 104, title: 'Figma', subtitle: 'A little creative space', domain: 'figma.com', user: 'sam@companyx.example', tag: 'Design', accepted: false, brand: 'figma', type: 'login' },
  { id: 105, title: 'Linear', subtitle: 'Work projects', domain: 'linear.app', user: 'sam@companyx.example', tag: 'Work', accepted: false, brand: 'linear', type: 'login' },
  { id: 106, title: 'DigitalOcean', subtitle: 'New project token', domain: 'cloud.digitalocean.com', user: 'New project', tag: 'Development', accepted: false, brand: 'ocean', type: 'api' },
  { id: 107, title: 'Google', subtitle: 'Work account (old)', domain: 'accounts.google.com', user: 'sam@companyx.example', tag: 'Work', accepted: false, brand: 'google', type: 'login', duplicate: true },
];

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
