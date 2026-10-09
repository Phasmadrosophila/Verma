import Database from 'better-sqlite3';
import type { VaultMetaRecord, EncryptedPayload } from '@app/shared';
import { initializeDatabaseSchema } from './schema.js';

export interface EncryptedEntryRow {
  id: string;
  type: string;
  iv: string;
  auth_tag: string;
  ciphertext: string;
  created_at: number;
  updated_at: number;
  version: number;
}

export class SqliteVaultStorage {
  private db: Database.Database;

  constructor(dbPath: string | ':memory:' = ':memory:') {
    this.db = new Database(dbPath);
    initializeDatabaseSchema(this.db);
  }

  public getRawDatabase(): Database.Database {
    return this.db;
  }

  public insertMeta(record: VaultMetaRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO vault_meta (
        id, salt, kdf_algorithm, kdf_params,
        key_check_iv, key_check_tag, key_check_ciphertext,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.salt,
      record.kdfAlgorithm,
      record.kdfParams,
      record.keyCheck.iv,
      record.keyCheck.authTag,
      record.keyCheck.ciphertext,
      record.createdAt,
      record.updatedAt
    );
  }

  public getMeta(): VaultMetaRecord | null {
    const stmt = this.db.prepare(`
      SELECT id, salt, kdf_algorithm, kdf_params,
             key_check_iv, key_check_tag, key_check_ciphertext,
             created_at, updated_at
      FROM vault_meta
      LIMIT 1
    `);

    const row = stmt.get() as any;
    if (!row) return null;

    return {
      id: row.id,
      salt: row.salt,
      kdfAlgorithm: row.kdf_algorithm,
      kdfParams: row.kdf_params,
      keyCheck: {
        iv: row.key_check_iv,
        authTag: row.key_check_tag,
        ciphertext: row.key_check_ciphertext,
        version: 1,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public insertEntryRow(row: EncryptedEntryRow): void {
    const stmt = this.db.prepare(`
      INSERT INTO vault_entries (
        id, type, iv, auth_tag, ciphertext, created_at, updated_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      row.id,
      row.type,
      row.iv,
      row.auth_tag,
      row.ciphertext,
      row.created_at,
      row.updated_at,
      row.version
    );
  }

  public getEntryRow(id: string): EncryptedEntryRow | null {
    const stmt = this.db.prepare(`
      SELECT id, type, iv, auth_tag, ciphertext, created_at, updated_at, version
      FROM vault_entries
      WHERE id = ?
    `);

    const row = stmt.get(id) as EncryptedEntryRow | undefined;
    return row ?? null;
  }

  public updateEntryRow(row: EncryptedEntryRow): boolean {
    const stmt = this.db.prepare(`
      UPDATE vault_entries
      SET type = ?, iv = ?, auth_tag = ?, ciphertext = ?, updated_at = ?, version = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      row.type,
      row.iv,
      row.auth_tag,
      row.ciphertext,
      row.updated_at,
      row.version,
      row.id
    );

    return result.changes > 0;
  }

  public deleteEntryRow(id: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM vault_entries
      WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  public listEntryRows(): EncryptedEntryRow[] {
    const stmt = this.db.prepare(`
      SELECT id, type, iv, auth_tag, ciphertext, created_at, updated_at, version
      FROM vault_entries
      ORDER BY updated_at DESC
    `);

    return stmt.all() as EncryptedEntryRow[];
  }

  public countEntries(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM vault_entries`);
    const row = stmt.get() as { count: number };
    return row?.count ?? 0;
  }

  public close(): void {
    this.db.close();
  }
}
