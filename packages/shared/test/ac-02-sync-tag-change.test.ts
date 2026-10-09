import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DeviceIdentity,
  VaultStore,
  DirectSyncEngine,
  DesktopPairingCoordinator,
  encryptSymmetric,
  deriveKey,
} from '../src/index.js';

describe('AC-D-M2-01-02: Non-Secret Tag Change Direct Sync (No Central Server)', () => {
  const enginesToClean: DirectSyncEngine[] = [];

  afterEach(async () => {
    while (enginesToClean.length > 0) {
      const e = enginesToClean.pop();
      await e?.stop();
    }
  });

  test('a non-secret tag change on Device A reaches Device B without a central server', async () => {
    // 1. Initialize Device A and Device B
    const identityA = new DeviceIdentity('Desktop-MacBook-Pro');
    const identityB = new DeviceIdentity('Desktop-Fedora-Workstation');

    const storeA = new VaultStore(identityA.getDeviceId());
    const storeB = new VaultStore(identityB.getDeviceId());

    const engineA = new DirectSyncEngine(identityA, storeA);
    const engineB = new DirectSyncEngine(identityB, storeB);
    enginesToClean.push(engineA, engineB);

    // Start local direct transport nodes
    await engineA.start();
    const portB = await engineB.start();

    // 2. Authenticated Pairing (AC-D-M2-01-01)
    DesktopPairingCoordinator.pairDevices(identityA, identityB);

    // 3. Create initial entry on Device A with tags: ["work"]
    const vaultMasterKey = deriveKey('user-master-password', 'verma-salt', 'vault-key');
    const initialEncryptedSecret = encryptSymmetric(
      JSON.stringify({ username: 'user@company.com', password: 'SuperSecretPassword123!' }),
      vaultMasterKey
    );

    const entryId = 'entry-google-001';
    storeA.saveEntry({
      id: entryId,
      type: 'login',
      title: 'Google Workspace - Company X',
      domain: 'google.com',
      tags: ['work'],
      encryptedSecret: initialEncryptedSecret,
    });

    // 4. Initial sync from Device A to Device B
    const initialSyncResult = await engineA.syncWithPeer(
      identityB.getDeviceId(),
      '127.0.0.1',
      portB
    );
    assert.equal(initialSyncResult.success, true);
    assert.equal(initialSyncResult.appliedCount, 1);

    // Verify Device B received initial entry
    const entryOnBBefore = storeB.getEntry(entryId);
    assert.ok(entryOnBBefore);
    assert.deepEqual(entryOnBBefore?.tags, ['work']);

    // 5. Update non-secret tags on Device A (PRD §7 demo loop step 8-9)
    const updatedTags = ['work', 'company-x', 'email', 'critical'];
    const updateResult = await engineA.updateTagAndSync(
      entryId,
      updatedTags,
      '127.0.0.1',
      portB,
      identityB.getDeviceId()
    );

    assert.deepEqual(updateResult.localEntry.tags, updatedTags);
    assert.equal(updateResult.syncResult.success, true);

    // 6. Verify Device B received the tag change directly without a central server
    const entryOnBAfter = storeB.getEntry(entryId);
    assert.ok(entryOnBAfter);
    assert.deepEqual(entryOnBAfter?.tags, updatedTags, 'Tags on Device B must match updated tags from Device A');
    assert.equal(entryOnBAfter?.version, updateResult.localEntry.version);

    // Verify secret ciphertext is intact
    assert.deepEqual(entryOnBAfter?.encryptedSecret, initialEncryptedSecret);

    // 7. Verify redacted AI metadata boundary (PRD §3.1, §9)
    const redactedA = storeA.toRedactedMetadata(storeA.getEntry(entryId)!);
    const redactedB = storeB.toRedactedMetadata(entryOnBAfter!);

    assert.deepEqual(redactedB.tags, updatedTags);
    assert.equal(redactedB.title, 'Google Workspace - Company X');
    assert.equal(redactedB.domain, 'google.com');

    // Confirm denied fields are not present in redacted metadata
    assert.equal((redactedB as any).password, undefined);
    assert.equal((redactedB as any).encryptedSecret, undefined);
    assert.equal((redactedB as any).username, undefined);
    assert.deepEqual(redactedA.tags, redactedB.tags);
  });
});
