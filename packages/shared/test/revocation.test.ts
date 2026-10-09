import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TrustedRedactionBoundary,
  FakeLocalAiAdapter,
  VaultLockedError,
  type LockStateProvider,
} from '../src/redaction/index.js';
import type { LoginEntry, VaultEntry } from '../src/types/entry.js';

class MockVaultController implements LockStateProvider {
  private locked = true;

  unlock(): void {
    this.locked = false;
  }

  lock(): void {
    this.locked = true;
  }

  isLocked(): boolean {
    return this.locked;
  }
}

describe('AC-B-M1-01-04: Immediate Lock Revocation Integration Test', () => {
  const sampleEntry: LoginEntry = {
    id: 'login-revocation-01',
    type: 'login',
    title: 'Production AWS Console',
    username: 'devops@cloud.internal',
    password: 'SuperSecretAwsPassword123!',
    domain: 'aws.amazon.com',
    tags: ['aws', 'cloud', 'prod'],
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  };

  it('should immediately revoke AI metadata access the instant the vault is locked', async () => {
    const vaultController = new MockVaultController();
    const fakeAdapter = new FakeLocalAiAdapter();
    const boundary = new TrustedRedactionBoundary({
      adapter: fakeAdapter,
      lockProvider: vaultController,
    });

    const entries: VaultEntry[] = [sampleEntry];

    // 1. Initially locked: preparation and inference must fail immediately
    assert.throws(
      () => boundary.prepareContext(entries),
      (err: Error) => err instanceof VaultLockedError
    );

    await assert.rejects(
      async () => boundary.invokeModel('Show AWS entry', entries),
      (err: Error) => err instanceof VaultLockedError
    );

    assert.equal(fakeAdapter.getCallCount(), 0);

    // 2. Unlock vault: inference succeeds
    vaultController.unlock();
    const context = boundary.prepareContext(entries);
    assert.equal(context.length, 1);
    assert.equal(context[0].title, 'Production AWS Console');

    const res = await boundary.invokeModel('Show AWS entry', entries);
    assert.ok(res);
    assert.equal(fakeAdapter.getCallCount(), 1);

    // 3. Lock vault: access is immediately revoked
    vaultController.lock();

    assert.throws(
      () => boundary.prepareContext(entries),
      (err: Error) => {
        assert.ok(err instanceof VaultLockedError);
        assert.match(err.message, /locked/i);
        return true;
      }
    );

    await assert.rejects(
      async () => boundary.invokeModel('Show AWS entry', entries),
      (err: Error) => {
        assert.ok(err instanceof VaultLockedError);
        assert.match(err.message, /locked/i);
        return true;
      }
    );

    // Call count remains 1 from the unlocked call; no new calls were made while locked
    assert.equal(fakeAdapter.getCallCount(), 1);
  });
});
