/**
 * AC-B-M1-01-04: Lock Revocation Integration Tests
 *
 * Verifies:
 * - Locking the vault revokes metadata access immediately.
 * - Calling projection functions when locked throws VaultLockedError.
 * - Calling AI pipelines, context builders, or model adapters when locked
 *   immediately rejects and never invokes downstream model runners.
 * - Dynamic state transitions (locked -> unlocked -> locked) work immediately and deterministically.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  projectEntryMetadata,
  projectVaultEntries,
} from '../projection.js';
import {
  TrustedRedactionBoundary,
  SimpleVaultLockProvider,
} from '../boundary.js';
import { FakeLocalAIAdapter } from '../../ai/fake-adapter.js';
import { VaultLockedError, VaultEntry } from '../../types/index.js';

describe('AC-B-M1-01-04: Vault Lock Revocation Integration', () => {
  const sampleEntries: VaultEntry[] = [
    {
      id: 'entry-test-1',
      title: 'GitHub Work',
      entryType: 'login',
      domain: 'github.com',
      tags: ['work'],
      createdAt: 1700000000000,
      updatedAt: 1700000100000,
      password: 'SamplePassword123!',
    },
    {
      id: 'entry-test-2',
      title: 'AWS Console',
      entryType: 'login',
      domain: 'aws.amazon.com',
      tags: ['cloud', 'infra'],
      createdAt: 1700000200000,
      updatedAt: 1700000300000,
      password: 'AWSConsolePassword987!',
    },
  ];

  it('throws VaultLockedError when projecting a single entry while locked', () => {
    assert.throws(
      () => projectEntryMetadata(sampleEntries[0], false),
      (err: unknown) => {
        assert.ok(err instanceof VaultLockedError);
        assert.equal((err as VaultLockedError).code, 'VAULT_LOCKED');
        return true;
      }
    );
  });

  it('throws VaultLockedError when projecting vault entry array while locked', () => {
    assert.throws(
      () => projectVaultEntries(sampleEntries, false),
      (err: unknown) => {
        assert.ok(err instanceof VaultLockedError);
        assert.equal((err as VaultLockedError).code, 'VAULT_LOCKED');
        return true;
      }
    );
  });

  it('boundary blocks all context preparation methods when vault is locked', () => {
    const lockProvider = new SimpleVaultLockProvider(false); // Locked
    const boundary = new TrustedRedactionBoundary(lockProvider);

    assert.equal(boundary.isUnlocked(), false);

    // projectVault
    assert.throws(
      () => boundary.projectVault(sampleEntries),
      (err) => err instanceof VaultLockedError
    );

    // projectEntry
    assert.throws(
      () => boundary.projectEntry(sampleEntries[0]),
      (err) => err instanceof VaultLockedError
    );

    // prepareSearchContext
    assert.throws(
      () => boundary.prepareSearchContext('test query', sampleEntries),
      (err) => err instanceof VaultLockedError
    );

    // prepareImportContext
    assert.throws(
      () => boundary.prepareImportContext('chrome_csv', [], sampleEntries),
      (err) => err instanceof VaultLockedError
    );

    // prepareTaggingContext
    assert.throws(
      () => boundary.prepareTaggingContext(sampleEntries),
      (err) => err instanceof VaultLockedError
    );

    // prepareConflictContext
    assert.throws(
      () => boundary.prepareConflictContext(sampleEntries),
      (err) => err instanceof VaultLockedError
    );

    // prepareHealthContext
    assert.throws(
      () => boundary.prepareHealthContext(sampleEntries),
      (err) => err instanceof VaultLockedError
    );
  });

  it('boundary blocks model execution when vault is locked and does not call adapter', async () => {
    const lockProvider = new SimpleVaultLockProvider(false); // Locked
    const boundary = new TrustedRedactionBoundary(lockProvider);
    const fakeAdapter = new FakeLocalAIAdapter();

    await assert.rejects(
      async () => {
        await boundary.invokeModel(
          fakeAdapter,
          (proj) => ({ query: 'test', entries: proj.entries }),
          sampleEntries
        );
      },
      (err) => {
        assert.ok(err instanceof VaultLockedError);
        return true;
      }
    );

    // Crucial: Model adapter was never invoked
    assert.equal(fakeAdapter.getCallCount(), 0);
  });

  it('boundary blocks executeWithRedaction when vault is locked and does not invoke callback', async () => {
    const lockProvider = new SimpleVaultLockProvider(false);
    const boundary = new TrustedRedactionBoundary(lockProvider);

    let callbackExecuted = false;

    await assert.rejects(
      async () => {
        await boundary.executeWithRedaction(sampleEntries, async (_projection) => {
          callbackExecuted = true;
          return 'done';
        });
      },
      (err) => err instanceof VaultLockedError
    );

    assert.equal(callbackExecuted, false);
  });

  it('handles dynamic lock state transitions immediately', async () => {
    const lockProvider = new SimpleVaultLockProvider(false);
    const boundary = new TrustedRedactionBoundary(lockProvider);
    const fakeAdapter = new FakeLocalAIAdapter<{ query: string }, { result: string }>({
      cannedResponse: { result: 'ok' },
    });

    // 1. Initially locked -> blocked
    await assert.rejects(
      () => boundary.invokeModel(fakeAdapter, () => ({ query: 'test' }), sampleEntries),
      (err) => err instanceof VaultLockedError
    );
    assert.equal(fakeAdapter.getCallCount(), 0);

    // 2. Unlock vault -> allowed
    lockProvider.unlock();
    assert.equal(boundary.isUnlocked(), true);

    const res1 = await boundary.invokeModel(fakeAdapter, () => ({ query: 'test' }), sampleEntries);
    assert.deepEqual(res1, { result: 'ok' });
    assert.equal(fakeAdapter.getCallCount(), 1);

    // 3. Lock vault again -> immediately revoked
    lockProvider.lock();
    assert.equal(boundary.isUnlocked(), false);

    await assert.rejects(
      () => boundary.invokeModel(fakeAdapter, () => ({ query: 'test 2' }), sampleEntries),
      (err) => err instanceof VaultLockedError
    );
    // Call count remains 1 (second call never reached adapter)
    assert.equal(fakeAdapter.getCallCount(), 1);

    // 4. Unlock vault again -> allowed
    lockProvider.unlock();
    const res2 = await boundary.invokeModel(fakeAdapter, () => ({ query: 'test 3' }), sampleEntries);
    assert.deepEqual(res2, { result: 'ok' });
    assert.equal(fakeAdapter.getCallCount(), 2);
  });
});
