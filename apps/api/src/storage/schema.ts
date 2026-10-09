import type Database from 'better-sqlite3';

export const SQL_INIT_SCHEMA = `
CREATE TABLE IF NOT EXISTS vault_meta (
  id TEXT PRIMARY KEY,
  salt TEXT NOT NULL,
  kdf_algorithm TEXT NOT NULL,
  kdf_params TEXT NOT NULL,
  key_check_iv TEXT NOT NULL,
  key_check_tag TEXT NOT NULL,
  key_check_ciphertext TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS vault_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_entries_type ON vault_entries(type);
CREATE INDEX IF NOT EXISTS idx_entries_updated_at ON vault_entries(updated_at);
`;

export function initializeDatabaseSchema(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SQL_INIT_SCHEMA);
}
