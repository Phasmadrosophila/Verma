import type {
  CreateEntryInput,
  LockStateInfo,
  LockStatus,
  RedactedEntryMetadata,
  UpdateEntryInput,
  VaultEntry,
  LoginEntry,
  NoteEntry,
  ApiKeyEntry,
} from '@app/shared';
import type { EntryType, MobileVaultEntry } from './vaultStore';

/**
 * Default API host:
 * - Uses EXPO_PUBLIC_API_URL environment variable if provided
 * - In browser / web preview: uses origin or localhost:3000
 * - In mobile native: defaults to localhost:3000 (can be updated dynamically via setApiBaseUrl)
 */
let customApiBaseUrl: string | null = null;

export function getApiBaseUrl(): string {
  if (customApiBaseUrl) return customApiBaseUrl;
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location?.origin?.startsWith('http')) {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

export function setApiBaseUrl(url: string): void {
  customApiBaseUrl = url.replace(/\/+$/, '');
}

export interface ApiClientResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  isOffline?: boolean;
}

/**
 * Format timestamp into human-readable label
 */
function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return 'Recently';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Derives a clean lowercase brand identifier from entry title
 */
export function deriveBrand(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'key';
}

/**
 * Converts a backend VaultEntry or RedactedEntryMetadata to MobileVaultEntry
 */
export function toMobileEntry(item: VaultEntry | RedactedEntryMetadata): MobileVaultEntry {
  const isWireKey = item.type === 'api_key';
  const mobileType: EntryType = isWireKey ? 'api' : (item.type as EntryType);
  const brand = deriveBrand(item.title);
  const updated = formatRelativeTime(item.updatedAt);

  // If item is full VaultEntry (has secret fields)
  if ('password' in item) {
    const login = item as LoginEntry;
    return {
      id: login.id,
      type: 'login',
      title: login.title,
      subtitle: login.username ? `${login.username}` : (login.domain || 'Login'),
      user: login.username,
      domain: login.domain || login.url,
      tags: login.tags || [],
      favorite: false,
      brand,
      secret: login.password || '',
      updated,
    };
  }

  if ('content' in item) {
    const note = item as NoteEntry;
    return {
      id: note.id,
      type: 'note',
      title: note.title,
      subtitle: note.category || 'Secure note',
      user: undefined,
      domain: undefined,
      tags: note.tags || [],
      favorite: false,
      brand,
      secret: note.content || '',
      updated,
    };
  }

  if ('apiKey' in item) {
    const key = item as ApiKeyEntry;
    return {
      id: key.id,
      type: 'api',
      title: key.title,
      subtitle: key.service || 'API Token',
      user: key.service,
      domain: undefined,
      tags: key.tags || [],
      favorite: false,
      brand,
      secret: key.apiKey || '',
      updated,
    };
  }

  // Otherwise, it is RedactedEntryMetadata from GET /api/entries
  const meta = item as RedactedEntryMetadata;
  return {
    id: meta.id,
    type: mobileType,
    title: meta.title,
    subtitle: meta.domain || `${mobileType.toUpperCase()} entry`,
    user: undefined,
    domain: meta.domain,
    tags: meta.tags || [],
    favorite: false,
    brand,
    secret: '', // zero-secret boundary: secret loaded only on explicit reveal
    updated,
  };
}

/**
 * Converts a MobileVaultEntry back to CreateEntryInput for the API wire
 */
export function toWireEntryInput(
  entry: Omit<MobileVaultEntry, 'id' | 'updated'>
): CreateEntryInput {
  if (entry.type === 'note') {
    return {
      type: 'note',
      title: entry.title,
      content: entry.secret,
      category: entry.subtitle || undefined,
      tags: entry.tags,
    };
  }

  if (entry.type === 'api') {
    return {
      type: 'api_key',
      title: entry.title,
      service: entry.user || entry.subtitle || entry.title,
      apiKey: entry.secret,
      tags: entry.tags,
    };
  }

  return {
    type: 'login',
    title: entry.title,
    username: entry.user || '',
    password: entry.secret,
    domain: entry.domain,
    tags: entry.tags,
  };
}

/**
 * Typed Mobile API Client for Verma Backend API
 */
export const mobileApi = {
  /**
   * Health check to detect if local backend is reachable
   */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Get current vault lock status
   */
  async getVaultStatus(): Promise<ApiClientResult<LockStateInfo>> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/vault/status`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        return { success: false, error: `Status error: ${res.status}` };
      }
      const data: LockStateInfo = await res.json();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message, isOffline: true };
    }
  },

  /**
   * Initialize a new vault with master password
   */
  async initVault(password: string): Promise<ApiClientResult<{ vaultId: string }>> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/vault/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to initialize vault' };
      }
      return { success: true, data: { vaultId: data.vaultId } };
    } catch (err: any) {
      return { success: false, error: err.message, isOffline: true };
    }
  },

  /**
   * Unlock the vault with master password
   */
  async unlockVault(password: string): Promise<ApiClientResult<{ status: LockStateInfo }>> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/vault/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid credentials' };
      }
      return { success: true, data: { status: data.status } };
    } catch (err: any) {
      return { success: false, error: err.message, isOffline: true };
    }
  },

  /**
   * Lock the vault
   */
  async lockVault(): Promise<ApiClientResult<{ status: LockStateInfo }>> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/vault/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to lock vault' };
      }
      return { success: true, data: { status: data.status } };
    } catch (err: any) {
      return { success: false, error: err.message, isOffline: true };
    }
  },

  /**
   * List entries from GET /api/entries (metadata only, zero secrets)
   */
  async listEntries(): Promise<ApiClientResult<MobileVaultEntry[]>> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/entries`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to list entries' };
      }
      const rawList: RedactedEntryMetadata[] = Array.isArray(data.entries) ? data.entries : [];
      const entries = rawList.map(toMobileEntry);
      return { success: true, data: entries };
    } catch (err: any) {
      return { success: false, error: err.message, isOffline: true };
    }
  },

  /**
   * Reveal full entry secret on explicit user tap via GET /api/entries/:id
   */
  async getEntry(id: string | number): Promise<ApiClientResult<MobileVaultEntry>> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/entries/${encodeURIComponent(String(id))}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to fetch entry' };
      }
      if (!data.entry) {
        return { success: false, error: 'Entry not found' };
      }
      return { success: true, data: toMobileEntry(data.entry as VaultEntry) };
    } catch (err: any) {
      return { success: false, error: err.message, isOffline: true };
    }
  },

  /**
   * Create an entry via POST /api/entries
   */
  async createEntry(
    entry: Omit<MobileVaultEntry, 'id' | 'updated'>
  ): Promise<ApiClientResult<MobileVaultEntry>> {
    try {
      const wirePayload = toWireEntryInput(entry);
      const res = await fetch(`${getApiBaseUrl()}/api/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wirePayload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to create entry' };
      }
      return { success: true, data: toMobileEntry(data.entry as VaultEntry) };
    } catch (err: any) {
      return { success: false, error: err.message, isOffline: true };
    }
  },

  /**
   * Update an entry via PUT /api/entries/:id
   */
  async updateEntry(
    id: string | number,
    entry: Partial<MobileVaultEntry>
  ): Promise<ApiClientResult<MobileVaultEntry>> {
    try {
      const updatePayload: UpdateEntryInput = {};
      if (entry.title !== undefined) updatePayload.title = entry.title;
      if (entry.tags !== undefined) updatePayload.tags = entry.tags;
      if (entry.secret !== undefined) {
        if (entry.type === 'note') (updatePayload as any).content = entry.secret;
        else if (entry.type === 'api') (updatePayload as any).apiKey = entry.secret;
        else (updatePayload as any).password = entry.secret;
      }
      if (entry.user !== undefined) {
        if (entry.type === 'api') (updatePayload as any).service = entry.user;
        else (updatePayload as any).username = entry.user;
      }
      if (entry.domain !== undefined) {
        (updatePayload as any).domain = entry.domain;
      }

      const res = await fetch(`${getApiBaseUrl()}/api/entries/${encodeURIComponent(String(id))}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update entry' };
      }
      return { success: true, data: toMobileEntry(data.entry as VaultEntry) };
    } catch (err: any) {
      return { success: false, error: err.message, isOffline: true };
    }
  },

  /**
   * Delete an entry via DELETE /api/entries/:id
   */
  async deleteEntry(id: string | number): Promise<ApiClientResult<boolean>> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/entries/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to delete entry' };
      }
      return { success: true, data: true };
    } catch (err: any) {
      return { success: false, error: err.message, isOffline: true };
    }
  },

  /**
   * Ask Your Vault natural language query via POST /api/ask
   */
  async askVault(
    query: string
  ): Promise<ApiClientResult<{ answer: string; relevantEntryIds: string[] }>> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Ask Your Vault unavailable' };
      }
      return {
        success: true,
        data: {
          answer: data.answer || '',
          relevantEntryIds: data.relevantEntryIds || [],
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message, isOffline: true };
    }
  },
};
