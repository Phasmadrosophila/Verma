import { randomUUID } from 'node:crypto';
import type {
  VaultEntry,
  LoginEntry,
  NoteEntry,
  ApiKeyEntry,
  CreateEntryInput,
  UpdateEntryInput,
  RedactedEntryMetadata,
  LockStateInfo,
  VaultMetaRecord,
} from '@app/shared';
import {
  deriveMasterKey,
  generateSalt,
  encryptJson,
  decryptJson,
  encryptPayload,
  decryptPayload,
  zeroizeBuffer,
  KEY_CHECK_PLAINTEXT,
  toRedactedMetadata,
  projectEntriesMetadata,
  assertSafeMetadata,
  ALL_SYNTHETIC_ENTRIES,
  SafeLogger,
  defaultLogger,
} from '@app/shared';
import { SqliteVaultStorage } from '../storage/sqlite-vault-storage.js';
import {
  VaultLockedError,
  VaultNotInitializedError,
  VaultAlreadyInitializedError,
  InvalidCredentialsError,
  EntryNotFoundError,
  ValidationError,
} from './errors.js';

export class VaultRepository {
  private storage: SqliteVaultStorage;
  private logger: SafeLogger;
  private masterKey: Buffer | null = null;
  private lastUnlockedAt?: number;

  constructor(storage?: SqliteVaultStorage, logger?: SafeLogger) {
    this.storage = storage ?? new SqliteVaultStorage(':memory:');
    this.logger = logger ?? defaultLogger;
  }

  public getStorage(): SqliteVaultStorage {
    return this.storage;
  }

  public getStatus(): LockStateInfo {
    const meta = this.storage.getMeta();
    if (!meta) {
      return {
        status: 'uninitialized',
        isLocked: true,
        isInitialized: false,
      };
    }

    if (this.masterKey !== null) {
      return {
        status: 'unlocked',
        isLocked: false,
        isInitialized: true,
        lastUnlockedAt: this.lastUnlockedAt,
      };
    }

    return {
      status: 'locked',
      isLocked: true,
      isInitialized: true,
    };
  }

  public async initialize(password: string): Promise<{ vaultId: string; salt: string }> {
    if (!password || password.length === 0) {
      throw new ValidationError('Master password cannot be empty.');
    }

    const existingMeta = this.storage.getMeta();
    if (existingMeta) {
      throw new VaultAlreadyInitializedError();
    }

    const vaultId = randomUUID();
    const salt = generateSalt(32);
    const key = deriveMasterKey(password, salt);

    const keyCheckPayload = encryptPayload(KEY_CHECK_PLAINTEXT, key);

    const metaRecord: VaultMetaRecord = {
      id: vaultId,
      salt,
      kdfAlgorithm: 'scrypt',
      kdfParams: JSON.stringify({ cost: 32768, blockSize: 8, parallelization: 1, keyLength: 32 }),
      keyCheck: keyCheckPayload,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.storage.insertMeta(metaRecord);

    // Keep master key in memory so initial state is unlocked
    this.masterKey = key;
    this.lastUnlockedAt = Date.now();

    this.logger.info('VAULT_INITIALIZED', { vaultId });

    return { vaultId, salt };
  }

  public async unlock(password: string): Promise<boolean> {
    if (!password) {
      throw new ValidationError('Password is required to unlock.');
    }

    const meta = this.storage.getMeta();
    if (!meta) {
      throw new VaultNotInitializedError();
    }

    let candidateKey: Buffer | null = null;
    try {
      candidateKey = deriveMasterKey(password, meta.salt);
      const decryptedCheckBuf = decryptPayload(meta.keyCheck, candidateKey);
      const checkText = decryptedCheckBuf.toString('utf8');

      if (checkText !== KEY_CHECK_PLAINTEXT) {
        throw new InvalidCredentialsError();
      }

      // Purge any existing key before setting new
      if (this.masterKey) {
        zeroizeBuffer(this.masterKey);
      }

      this.masterKey = candidateKey;
      this.lastUnlockedAt = Date.now();

      this.logger.info('VAULT_UNLOCKED', { vaultId: meta.id });
      return true;
    } catch (err) {
      if (candidateKey) {
        zeroizeBuffer(candidateKey);
      }
      this.logger.warn('VAULT_UNLOCK_FAILED', {
        vaultId: meta.id,
        errorCategory: 'INVALID_CREDENTIALS',
      });
      throw new InvalidCredentialsError();
    }
  }

  public lock(): void {
    if (this.masterKey) {
      zeroizeBuffer(this.masterKey);
      this.masterKey = null;
    }

    const meta = this.storage.getMeta();
    this.logger.info('VAULT_LOCKED', { vaultId: meta?.id });
  }

  private ensureUnlocked(): Buffer {
    const status = this.getStatus();
    if (!status.isInitialized) {
      throw new VaultNotInitializedError();
    }
    if (status.status !== 'unlocked' || !this.masterKey) {
      throw new VaultLockedError();
    }
    return this.masterKey;
  }

  public async createEntry<T extends VaultEntry>(input: CreateEntryInput<T>): Promise<T> {
    const key = this.ensureUnlocked();

    if (!input.title || typeof input.title !== 'string' || input.title.trim().length === 0) {
      throw new ValidationError('Entry title is required.');
    }

    if (!input.type || !['login', 'note', 'api_key'].includes(input.type)) {
      throw new ValidationError(`Invalid entry type: ${input.type}`);
    }

    const id = input.id ?? randomUUID();
    const now = Date.now();

    let entry: VaultEntry;

    if (input.type === 'login') {
      const loginInput = input as unknown as Omit<LoginEntry, 'id' | 'createdAt' | 'updatedAt'>;
      if (!loginInput.username && !loginInput.password) {
        throw new ValidationError('Login entry requires either a username or password.');
      }
      entry = {
        id,
        type: 'login',
        title: input.title.trim(),
        tags: Array.isArray(input.tags) ? [...input.tags] : [],
        username: loginInput.username ?? '',
        password: loginInput.password ?? '',
        url: loginInput.url,
        domain: loginInput.domain,
        totpSecret: loginInput.totpSecret,
        recoveryCodes: loginInput.recoveryCodes ? [...loginInput.recoveryCodes] : undefined,
        customFields: loginInput.customFields ? [...loginInput.customFields] : undefined,
        createdAt: now,
        updatedAt: now,
      };
    } else if (input.type === 'note') {
      const noteInput = input as unknown as Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'>;
      entry = {
        id,
        type: 'note',
        title: input.title.trim(),
        tags: Array.isArray(input.tags) ? [...input.tags] : [],
        content: noteInput.content ?? '',
        category: noteInput.category,
        createdAt: now,
        updatedAt: now,
      };
    } else if (input.type === 'api_key') {
      const apiInput = input as unknown as Omit<ApiKeyEntry, 'id' | 'createdAt' | 'updatedAt'>;
      if (!apiInput.service) {
        throw new ValidationError('API key entry requires a service name.');
      }
      if (!apiInput.apiKey) {
        throw new ValidationError('API key entry requires an apiKey value.');
      }
      entry = {
        id,
        type: 'api_key',
        title: input.title.trim(),
        tags: Array.isArray(input.tags) ? [...input.tags] : [],
        service: apiInput.service,
        apiKey: apiInput.apiKey,
        apiSecret: apiInput.apiSecret,
        keyId: apiInput.keyId,
        expiresAt: apiInput.expiresAt,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      throw new ValidationError(`Unsupported entry type: ${(input as any).type}`);
    }

    const encryptedPayload = encryptJson(entry, key);

    this.storage.insertEntryRow({
      id: entry.id,
      type: entry.type,
      iv: encryptedPayload.iv,
      auth_tag: encryptedPayload.authTag,
      ciphertext: encryptedPayload.ciphertext,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
      version: encryptedPayload.version,
    });

    this.logger.info('ENTRY_CREATED', {
      entryId: entry.id,
      entryType: entry.type,
    });

    return entry as T;
  }

  public async getEntry(id: string): Promise<VaultEntry> {
    const key = this.ensureUnlocked();

    const row = this.storage.getEntryRow(id);
    if (!row) {
      throw new EntryNotFoundError(id);
    }

    const entry = decryptJson<VaultEntry>(
      {
        iv: row.iv,
        authTag: row.auth_tag,
        ciphertext: row.ciphertext,
        version: row.version,
      },
      key
    );

    return entry;
  }

  public async updateEntry<T extends VaultEntry>(
    id: string,
    input: UpdateEntryInput<T>
  ): Promise<T> {
    const key = this.ensureUnlocked();

    const existing = await this.getEntry(id);
    const now = Date.now();

    const updatedEntry: VaultEntry = {
      ...existing,
      ...input,
      id: existing.id,
      type: existing.type,
      createdAt: existing.createdAt,
      updatedAt: now,
    } as VaultEntry;

    const encryptedPayload = encryptJson(updatedEntry, key);

    const success = this.storage.updateEntryRow({
      id: updatedEntry.id,
      type: updatedEntry.type,
      iv: encryptedPayload.iv,
      auth_tag: encryptedPayload.authTag,
      ciphertext: encryptedPayload.ciphertext,
      created_at: updatedEntry.createdAt,
      updated_at: updatedEntry.updatedAt,
      version: encryptedPayload.version,
    });

    if (!success) {
      throw new EntryNotFoundError(id);
    }

    this.logger.info('ENTRY_UPDATED', {
      entryId: id,
      entryType: existing.type,
    });

    return updatedEntry as T;
  }

  public async deleteEntry(id: string): Promise<boolean> {
    this.ensureUnlocked();

    const existing = this.storage.getEntryRow(id);
    if (!existing) {
      throw new EntryNotFoundError(id);
    }

    const deleted = this.storage.deleteEntryRow(id);

    this.logger.info('ENTRY_DELETED', {
      entryId: id,
      entryType: existing.type,
    });

    return deleted;
  }

  public async listEntries(): Promise<VaultEntry[]> {
    const key = this.ensureUnlocked();

    const rows = this.storage.listEntryRows();
    const entries: VaultEntry[] = [];

    for (const row of rows) {
      const entry = decryptJson<VaultEntry>(
        {
          iv: row.iv,
          authTag: row.auth_tag,
          ciphertext: row.ciphertext,
          version: row.version,
        },
        key
      );
      entries.push(entry);
    }

    return entries;
  }

  public async getMetadataList(): Promise<RedactedEntryMetadata[]> {
    this.ensureUnlocked();

    const entries = await this.listEntries();
    const metadataList = projectEntriesMetadata(entries);

    // Enforce privacy invariant verification
    for (let i = 0; i < metadataList.length; i++) {
      const check = assertSafeMetadata(metadataList[i], entries[i]);
      if (!check.isSafe) {
        throw new Error(`Metadata projection invariant violation: ${check.violations.join(', ')}`);
      }
    }

    return metadataList;
  }

  public async getMetadataById(id: string): Promise<RedactedEntryMetadata> {
    this.ensureUnlocked();

    const entry = await this.getEntry(id);
    const metadata = toRedactedMetadata(entry);
    if (!metadata) {
      throw new Error(`Entry ${id} of type ${entry.type} is excluded from metadata projection`);
    }

    const check = assertSafeMetadata(metadata, entry);
    if (!check.isSafe) {
      throw new Error(`Metadata projection invariant violation: ${check.violations.join(', ')}`);
    }

    return metadata;
  }

  public async searchMetadata(query: string): Promise<RedactedEntryMetadata[]> {
    this.ensureUnlocked();

    const list = await this.getMetadataList();
    if (!query || query.trim().length === 0) {
      return list;
    }

    const q = query.toLowerCase().trim();
    return list.filter((item) => {
      const matchesTitle = item.title.toLowerCase().includes(q);
      const matchesDomain = item.domain?.toLowerCase().includes(q) ?? false;
      const matchesTag = item.tags.some((t) => t.toLowerCase().includes(q));
      return matchesTitle || matchesDomain || matchesTag;
    });
  }

  public async seedSyntheticFixtures(): Promise<number> {
    this.ensureUnlocked();

    let count = 0;
    for (const item of ALL_SYNTHETIC_ENTRIES) {
      await this.createEntry(item as any);
      count++;
    }

    this.logger.info('FIXTURES_SEEDED', { meta: { count } });
    return count;
  }

  public async importEntries(
    entries: CreateEntryInput[]
  ): Promise<{ imported: VaultEntry[]; failed: { index: number; reason: string }[] }> {
    this.ensureUnlocked();

    const imported: VaultEntry[] = [];
    const failed: { index: number; reason: string }[] = [];

    for (let i = 0; i < entries.length; i++) {
      const input = entries[i];
      try {
        const created = await this.createEntry(input);
        imported.push(created);
      } catch (err: any) {
        failed.push({
          index: i,
          reason: err?.message || 'Failed to create entry during import',
        });
      }
    }

    this.logger.info('ENTRIES_IMPORTED', {
      meta: {
        importedCount: imported.length,
        failedCount: failed.length,
      },
    });

    return { imported, failed };
  }

  public close(): void {
    this.lock();
    this.storage.close();
  }
}
