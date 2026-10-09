import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SqliteVaultStorage } from '../src/storage/sqlite-vault-storage.js';
import { VaultRepository } from '../src/repository/vault-repository.js';
import {
  VaultLockedError,
  VaultNotInitializedError,
  InvalidCredentialsError,
} from '../src/repository/errors.js';
import type { LoginEntry } from '@app/shared';

describe('AC-A-M0-01-01: Encrypted Storage Round-Trip & Locked-Access Rejection', () => {
  let storage: SqliteVaultStorage;
  let repo: VaultRepository;
  const masterPassword = 'MySuperSecureVaultPassword2026!';

  beforeEach(() => {
    storage = new SqliteVaultStorage(':memory:');
    repo = new VaultRepository(storage);
  });

  it('should reject operations when vault is uninitialized', async () => {
    const status = repo.getStatus();
    assert.equal(status.status, 'uninitialized');
    assert.equal(status.isLocked, true);
    assert.equal(status.isInitialized, false);

    await assert.rejects(
      () => repo.listEntries(),
      VaultNotInitializedError
    );

    await assert.rejects(
      () => repo.createEntry({
        type: 'login',
        title: 'Test',
        username: 'alice',
        password: 'secret',
        tags: [],
      } as any),
      VaultNotInitializedError
    );

    await assert.rejects(
      () => repo.getMetadataList(),
      VaultNotInitializedError
    );
  });

  it('should initialize vault and allow round-trip persistence', async () => {
    const initResult = await repo.initialize(masterPassword);
    assert.ok(initResult.vaultId);
    assert.ok(initResult.salt);

    const status = repo.getStatus();
    assert.equal(status.status, 'unlocked');
    assert.equal(status.isLocked, false);
    assert.equal(status.isInitialized, true);

    const created = await repo.createEntry<LoginEntry>({
      type: 'login',
      title: 'GitHub Work',
      username: 'developer@example.test',
      password: 'LiveEncryptedPassword999!',
      url: 'https://github.com',
      domain: 'github.com',
      tags: ['work', 'git'],
    });

    assert.ok(created.id);
    assert.equal(created.title, 'GitHub Work');
    assert.equal(created.password, 'LiveEncryptedPassword999!');

    const retrieved = (await repo.getEntry(created.id)) as LoginEntry;
    assert.equal(retrieved.id, created.id);
    assert.equal(retrieved.username, 'developer@example.test');
    assert.equal(retrieved.password, 'LiveEncryptedPassword999!');
  });

  it('should store records encrypted at rest in SQLite with zero plaintext secrets', async () => {
    await repo.initialize(masterPassword);

    const secretPassword = 'HighEntropySecretPasswordXYZ123!';
    const secretUsername = 'stealth-user@classified.internal';
    const entryTitle = 'Classified Server Access';

    const created = await repo.createEntry<LoginEntry>({
      type: 'login',
      title: entryTitle,
      username: secretUsername,
      password: secretPassword,
      tags: ['sensitive'],
    });

    // Inspect raw SQLite rows directly via SQLite storage
    const rawRows = storage.listEntryRows();
    assert.equal(rawRows.length, 1);
    const row = rawRows[0];

    assert.equal(row.id, created.id);
    assert.equal(row.type, 'login');
    assert.ok(row.iv);
    assert.ok(row.auth_tag);
    assert.ok(row.ciphertext);

    // Assert that the raw database row contains ZERO plaintext secrets or titles
    const rowJson = JSON.stringify(row);
    assert.ok(!rowJson.includes(secretPassword), 'Raw SQLite row must not contain secret password');
    assert.ok(!rowJson.includes(secretUsername), 'Raw SQLite row must not contain secret username');
    assert.ok(!rowJson.includes(entryTitle), 'Raw SQLite row must not contain entry title');
  });

  it('should enforce lock state and reject all data & metadata access while locked', async () => {
    await repo.initialize(masterPassword);

    const created = await repo.createEntry<LoginEntry>({
      type: 'login',
      title: 'Test Entry',
      username: 'alice',
      password: 'password123',
      tags: ['test'],
    });

    // Explicitly lock the vault
    repo.lock();

    const lockedStatus = repo.getStatus();
    assert.equal(lockedStatus.status, 'locked');
    assert.equal(lockedStatus.isLocked, true);
    assert.equal(lockedStatus.isInitialized, true);

    // All reading and writing operations must be rejected while locked
    await assert.rejects(() => repo.getEntry(created.id), VaultLockedError);
    await assert.rejects(() => repo.listEntries(), VaultLockedError);
    await assert.rejects(() => repo.getMetadataList(), VaultLockedError);
    await assert.rejects(() => repo.getMetadataById(created.id), VaultLockedError);
    await assert.rejects(() => repo.searchMetadata('Test'), VaultLockedError);
    await assert.rejects(
      () => repo.createEntry({ type: 'note', title: 'New Note', content: 'Secret', tags: [] } as any),
      VaultLockedError
    );
    await assert.rejects(() => repo.updateEntry(created.id, { title: 'Updated' } as any), VaultLockedError);
    await assert.rejects(() => repo.deleteEntry(created.id), VaultLockedError);
    await assert.rejects(() => repo.seedSyntheticFixtures(), VaultLockedError);
  });

  it('should reject unlocking with wrong password and succeed with correct password', async () => {
    await repo.initialize(masterPassword);
    repo.lock();

    // Wrong password
    await assert.rejects(
      () => repo.unlock('WrongPassword123!'),
      InvalidCredentialsError
    );
    assert.equal(repo.getStatus().status, 'locked');

    // Correct password
    const unlocked = await repo.unlock(masterPassword);
    assert.equal(unlocked, true);
    assert.equal(repo.getStatus().status, 'unlocked');

    const entries = await repo.listEntries();
    assert.ok(Array.isArray(entries));
  });
});
