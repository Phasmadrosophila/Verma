import { VaultEntry, RedactedMetadata, VaultChangeset } from './types.js';

export interface VaultTransaction {
  id: string;
  stagedEntries: Map<string, VaultEntry>;
  stagedDeletions: Set<string>;
  previousSnapshots: Map<string, VaultEntry | undefined>;
}

export class VaultStore {
  private entries = new Map<string, VaultEntry>();
  private activeTransaction: VaultTransaction | null = null;
  private changeListeners: Array<(changeset: VaultChangeset) => void> = [];
  private sequence = 0;
  private deviceId: string;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  getEntry(id: string): VaultEntry | undefined {
    const entry = this.entries.get(id);
    if (!entry || entry.deleted) return undefined;
    return JSON.parse(JSON.stringify(entry));
  }

  listEntries(): VaultEntry[] {
    return Array.from(this.entries.values())
      .filter((e) => !e.deleted)
      .map((e) => JSON.parse(JSON.stringify(e)));
  }

  /**
   * Save or update an entry. Emits a changeset.
   */
  saveEntry(entry: Omit<VaultEntry, 'version' | 'createdAt' | 'updatedAt'> & { createdAt?: number; updatedAt?: number; version?: number }): VaultEntry {
    const existing = this.entries.get(entry.id);
    const now = Date.now();
    const version = existing ? existing.version + 1 : (entry.version ?? 1);
    const createdAt = existing ? existing.createdAt : (entry.createdAt ?? now);
    const updatedAt = entry.updatedAt ?? now;

    const saved: VaultEntry = {
      ...entry,
      version,
      createdAt,
      updatedAt,
      tags: [...entry.tags],
    };

    if (this.activeTransaction) {
      if (!this.activeTransaction.previousSnapshots.has(entry.id)) {
        this.activeTransaction.previousSnapshots.set(entry.id, existing ? JSON.parse(JSON.stringify(existing)) : undefined);
      }
      this.activeTransaction.stagedEntries.set(entry.id, saved);
      this.activeTransaction.stagedDeletions.delete(entry.id);
    } else {
      this.entries.set(entry.id, saved);
      this.notifyChange([saved], []);
    }

    return JSON.parse(JSON.stringify(saved));
  }

  /**
   * Update non-secret tags on an entry.
   */
  updateTags(id: string, newTags: string[]): VaultEntry {
    const existing = this.entries.get(id);
    if (!existing || existing.deleted) {
      throw new Error(`Entry ${id} not found`);
    }

    return this.saveEntry({
      ...existing,
      tags: newTags,
    });
  }

  /**
   * Soft delete an entry.
   */
  deleteEntry(id: string): boolean {
    const existing = this.entries.get(id);
    if (!existing || existing.deleted) return false;

    const deleted: VaultEntry = {
      ...existing,
      deleted: true,
      version: existing.version + 1,
      updatedAt: Date.now(),
    };

    if (this.activeTransaction) {
      if (!this.activeTransaction.previousSnapshots.has(id)) {
        this.activeTransaction.previousSnapshots.set(id, JSON.parse(JSON.stringify(existing)));
      }
      this.activeTransaction.stagedDeletions.add(id);
      this.activeTransaction.stagedEntries.set(id, deleted);
    } else {
      this.entries.set(id, deleted);
      this.notifyChange([], [id]);
    }

    return true;
  }

  /**
   * Begin an atomic transaction for syncing or multi-entry operations.
   */
  beginTransaction(): string {
    if (this.activeTransaction) {
      throw new Error('A transaction is already active.');
    }
    const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.activeTransaction = {
      id: txId,
      stagedEntries: new Map(),
      stagedDeletions: new Set(),
      previousSnapshots: new Map(),
    };
    return txId;
  }

  /**
   * Commit the active transaction atomically.
   */
  commitTransaction(): void {
    if (!this.activeTransaction) {
      throw new Error('No active transaction to commit.');
    }

    const appliedEntries: VaultEntry[] = [];
    const deletedIds: string[] = [];

    for (const [id, entry] of this.activeTransaction.stagedEntries.entries()) {
      this.entries.set(id, entry);
      if (entry.deleted) {
        deletedIds.push(id);
      } else {
        appliedEntries.push(entry);
      }
    }

    this.activeTransaction = null;
    this.notifyChange(appliedEntries, deletedIds);
  }

  /**
   * Rollback the active transaction, reverting any staged changes.
   */
  rollbackTransaction(): void {
    if (!this.activeTransaction) {
      return; // No-op if no transaction
    }
    this.activeTransaction = null;
  }

  /**
   * Apply a changeset received from a remote paired device atomically.
   * If any error occurs or payload is malformed, entire changeset is rejected and rolled back.
   */
  applyChangeset(changeset: VaultChangeset): { applied: number; skipped: number } {
    this.beginTransaction();
    try {
      let applied = 0;
      let skipped = 0;

      for (const incoming of changeset.entries) {
        if (!incoming.id || !incoming.title || typeof incoming.version !== 'number') {
          throw new Error(`Malformed entry in changeset: ${JSON.stringify(incoming)}`);
        }

        const local = this.entries.get(incoming.id);
        if (!local || incoming.version > local.version) {
          this.activeTransaction!.stagedEntries.set(incoming.id, JSON.parse(JSON.stringify(incoming)));
          applied++;
        } else {
          skipped++;
        }
      }

      for (const deletedId of changeset.deletedIds) {
        const local = this.entries.get(deletedId);
        if (local && !local.deleted) {
          const deletedEntry: VaultEntry = {
            ...local,
            deleted: true,
            version: local.version + 1,
            updatedAt: changeset.timestamp,
          };
          this.activeTransaction!.stagedEntries.set(deletedId, deletedEntry);
          applied++;
        }
      }

      this.commitTransaction();
      return { applied, skipped };
    } catch (err) {
      this.rollbackTransaction();
      throw err;
    }
  }

  /**
   * Redaction layer: Projects a VaultEntry into RedactedMetadata.
   * Strips all secret fields, passwords, values, note bodies.
   */
  toRedactedMetadata(entry: VaultEntry): RedactedMetadata {
    return {
      id: entry.id,
      title: entry.title,
      domain: entry.domain,
      tags: [...entry.tags],
      fieldLabels: ['username', 'password'],
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      isWeak: false,
      isReused: false,
    };
  }

  subscribeChanges(listener: (changeset: VaultChangeset) => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange(entries: VaultEntry[], deletedIds: string[]) {
    this.sequence++;
    const changeset: VaultChangeset = {
      deviceId: this.deviceId,
      sequence: this.sequence,
      timestamp: Date.now(),
      entries,
      deletedIds,
    };
    for (const listener of this.changeListeners) {
      try {
        listener(changeset);
      } catch (e) {
        console.error('Error in change listener:', e);
      }
    }
  }
}
