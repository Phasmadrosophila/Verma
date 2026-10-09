import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { VaultRepository } from '../src/repository/vault-repository.js';
import { EntryNotFoundError, ValidationError } from '../src/repository/errors.js';
import type { LoginEntry, NoteEntry, ApiKeyEntry } from '@app/shared';

describe('AC-A-M0-01-02: Entry Lifecycle Repository Test for All P0 Entry Types', () => {
  let repo: VaultRepository;
  const masterPassword = 'TestVaultPassword2026!';

  beforeEach(async () => {
    repo = new VaultRepository();
    await repo.initialize(masterPassword);
  });

  describe('Login Entry Lifecycle', () => {
    it('should create, read, update, list, and delete a login entry', async () => {
      // 1. Create
      const created = await repo.createEntry<LoginEntry>({
        type: 'login',
        title: 'Google Personal',
        username: 'alice@gmail.com',
        password: 'GoogleSecretPassword!1',
        url: 'https://mail.google.com',
        domain: 'google.com',
        totpSecret: 'JBSWY3DPEHPK3PXP',
        recoveryCodes: ['REC-G-001', 'REC-G-002'],
        tags: ['personal', 'email'],
        customFields: [{ label: 'security_question', value: 'First pet', isSecret: false }],
      });

      assert.ok(created.id);
      assert.equal(created.type, 'login');
      assert.equal(created.title, 'Google Personal');
      assert.equal(created.username, 'alice@gmail.com');
      assert.equal(created.password, 'GoogleSecretPassword!1');
      assert.equal(created.domain, 'google.com');
      assert.equal(created.totpSecret, 'JBSWY3DPEHPK3PXP');
      assert.deepEqual(created.recoveryCodes, ['REC-G-001', 'REC-G-002']);
      assert.deepEqual(created.tags, ['personal', 'email']);
      assert.ok(created.createdAt > 0);
      assert.ok(created.updatedAt > 0);

      // 2. Read (Get by ID)
      const fetched = (await repo.getEntry(created.id)) as LoginEntry;
      assert.deepEqual(fetched, created);

      // 3. Update
      const updated = await repo.updateEntry<LoginEntry>(created.id, {
        title: 'Google Workspace (Updated)',
        password: 'NewGooglePassword2026!#',
        tags: ['work', 'email', 'google'],
      });

      assert.equal(updated.id, created.id);
      assert.equal(updated.title, 'Google Workspace (Updated)');
      assert.equal(updated.password, 'NewGooglePassword2026!#');
      assert.deepEqual(updated.tags, ['work', 'email', 'google']);
      assert.ok(updated.updatedAt >= created.updatedAt);

      // 4. List
      const list = await repo.listEntries();
      assert.equal(list.length, 1);
      assert.equal(list[0].id, created.id);

      // 5. Delete
      const deleted = await repo.deleteEntry(created.id);
      assert.equal(deleted, true);

      // 6. Verify Deletion
      await assert.rejects(() => repo.getEntry(created.id), EntryNotFoundError);
      const emptyList = await repo.listEntries();
      assert.equal(emptyList.length, 0);
    });
  });

  describe('Note Entry Lifecycle', () => {
    it('should create, read, update, list, and delete a note entry', async () => {
      // 1. Create
      const created = await repo.createEntry<NoteEntry>({
        type: 'note',
        title: 'Server Runbook',
        content: 'Steps to restart Kubernetes pods and verify ingress.',
        category: 'devops',
        tags: ['k8s', 'runbook', 'ops'],
      });

      assert.ok(created.id);
      assert.equal(created.type, 'note');
      assert.equal(created.title, 'Server Runbook');
      assert.equal(created.content, 'Steps to restart Kubernetes pods and verify ingress.');
      assert.equal(created.category, 'devops');
      assert.deepEqual(created.tags, ['k8s', 'runbook', 'ops']);

      // 2. Read
      const fetched = (await repo.getEntry(created.id)) as NoteEntry;
      assert.deepEqual(fetched, created);

      // 3. Update
      const updated = await repo.updateEntry<NoteEntry>(created.id, {
        title: 'Server Runbook v2',
        content: 'Updated pod restart instructions.',
        category: 'infrastructure',
      });

      assert.equal(updated.title, 'Server Runbook v2');
      assert.equal(updated.content, 'Updated pod restart instructions.');
      assert.equal(updated.category, 'infrastructure');

      // 4. List
      const list = await repo.listEntries();
      assert.equal(list.length, 1);
      assert.equal(list[0].id, created.id);

      // 5. Delete
      await repo.deleteEntry(created.id);
      await assert.rejects(() => repo.getEntry(created.id), EntryNotFoundError);
    });
  });

  describe('API Key Entry Lifecycle', () => {
    it('should create, read, update, list, and delete an api_key entry', async () => {
      // 1. Create
      const created = await repo.createEntry<ApiKeyEntry>({
        type: 'api_key',
        title: 'Anthropic Claude API Key',
        service: 'anthropic',
        apiKey: 'sk-ant-api03-synth-test-key-12345',
        apiSecret: 'secret_hash_value_999',
        keyId: 'key_claude_01',
        tags: ['ai', 'anthropic', 'prod'],
        expiresAt: 1750000000000,
      });

      assert.ok(created.id);
      assert.equal(created.type, 'api_key');
      assert.equal(created.title, 'Anthropic Claude API Key');
      assert.equal(created.service, 'anthropic');
      assert.equal(created.apiKey, 'sk-ant-api03-synth-test-key-12345');
      assert.equal(created.apiSecret, 'secret_hash_value_999');
      assert.equal(created.keyId, 'key_claude_01');
      assert.equal(created.expiresAt, 1750000000000);
      assert.deepEqual(created.tags, ['ai', 'anthropic', 'prod']);

      // 2. Read
      const fetched = (await repo.getEntry(created.id)) as ApiKeyEntry;
      assert.deepEqual(fetched, created);

      // 3. Update
      const updated = await repo.updateEntry<ApiKeyEntry>(created.id, {
        title: 'Anthropic Claude API Key (Rotated)',
        apiKey: 'sk-ant-api03-synth-rotated-key-67890',
      });

      assert.equal(updated.title, 'Anthropic Claude API Key (Rotated)');
      assert.equal(updated.apiKey, 'sk-ant-api03-synth-rotated-key-67890');
      assert.equal(updated.service, 'anthropic');

      // 4. List
      const list = await repo.listEntries();
      assert.equal(list.length, 1);
      assert.equal(list[0].id, created.id);

      // 5. Delete
      await repo.deleteEntry(created.id);
      await assert.rejects(() => repo.getEntry(created.id), EntryNotFoundError);
    });
  });

  describe('Validation & Edge Cases', () => {
    it('should reject entry creation with empty title', async () => {
      await assert.rejects(
        () => repo.createEntry({ type: 'note', title: '', content: 'some note', tags: [] } as any),
        ValidationError
      );
    });

    it('should reject invalid entry types', async () => {
      await assert.rejects(
        () => repo.createEntry({ type: 'invalid_type', title: 'Test', tags: [] } as any),
        ValidationError
      );
    });

    it('should reject updating non-existent entry with EntryNotFoundError', async () => {
      await assert.rejects(
        () => repo.updateEntry('non-existent-id', { title: 'New' } as any),
        EntryNotFoundError
      );
    });

    it('should reject deleting non-existent entry with EntryNotFoundError', async () => {
      await assert.rejects(
        () => repo.deleteEntry('non-existent-id'),
        EntryNotFoundError
      );
    });
  });
});
