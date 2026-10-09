import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DeviceIdentity,
  VaultStore,
  DirectSyncEngine,
  DesktopPairingCoordinator,
  SyncInterruptedError,
  CorruptedPayloadError,
  encryptSymmetric,
  deriveKey,
} from '../src/index.js';

describe('AC-D-M2-01-05: Interrupted Sync & Fault Tolerance', () => {
  const enginesToClean: DirectSyncEngine[] = [];

  afterEach(async () => {
    while (enginesToClean.length > 0) {
      const e = enginesToClean.pop();
      await e?.stop();
    }
  });

  test('interrupted sync reports SyncInterruptedError and preserves local vault integrity', async () => {
    const identityA = new DeviceIdentity('Device-A');
    const identityB = new DeviceIdentity('Device-B');

    const storeA = new VaultStore(identityA.getDeviceId());
    const storeB = new VaultStore(identityB.getDeviceId());

    // Pre-populate Device B with existing local entry
    const existingKey = deriveKey('master-pass', 'salt', 'key');
    const existingEncrypted = encryptSymmetric(JSON.stringify({ note: 'Existing pristine secret' }), existingKey);

    storeB.saveEntry({
      id: 'existing-b-001',
      type: 'note',
      title: 'Device B Private Note',
      tags: ['personal'],
      encryptedSecret: existingEncrypted,
    });

    const initialEntriesOnB = storeB.listEntries();
    assert.equal(initialEntriesOnB.length, 1);
    assert.equal(initialEntriesOnB[0]?.id, 'existing-b-001');

    // Create entry on Device A to sync
    storeA.saveEntry({
      id: 'new-entry-a-002',
      type: 'login',
      title: 'GitHub API Key',
      tags: ['dev', 'infra'],
      encryptedSecret: encryptSymmetric(JSON.stringify({ apiKey: 'ghp_secret123' }), existingKey),
    });

    const engineA = new DirectSyncEngine(identityA, storeA);
    const engineB = new DirectSyncEngine(identityB, storeB);
    enginesToClean.push(engineA, engineB);

    await engineA.start();
    const portB = await engineB.start();

    // Pair devices
    DesktopPairingCoordinator.pairDevices(identityA, identityB);

    // Simulate network drop on Device A transport
    engineA.getTransport().setSimulateDrop(true);

    // Sync attempt must fail with SyncInterruptedError
    await assert.rejects(
      async () => {
        await engineA.syncWithPeer(identityB.getDeviceId(), '127.0.0.1', portB);
      },
      (err: any) => {
        return err instanceof SyncInterruptedError || (err instanceof Error && err.message.includes('interrupted'));
      },
      'Interrupted sync must throw SyncInterruptedError'
    );

    // Verify engine state on Device A reflects interrupted
    assert.equal(engineA.getState(), 'interrupted');
    assert.ok(engineA.getLastError());

    // Verify Device B local store is NOT corrupted and still has exactly the original entry
    const entriesOnBAfterInterruption = storeB.listEntries();
    assert.equal(entriesOnBAfterInterruption.length, 1);
    assert.equal(entriesOnBAfterInterruption[0]?.id, 'existing-b-001');
    assert.deepEqual(entriesOnBAfterInterruption[0]?.tags, ['personal']);

    // Now restore network connection and re-sync
    engineA.getTransport().setSimulateDrop(false);
    const retryResult = await engineA.syncWithPeer(identityB.getDeviceId(), '127.0.0.1', portB);
    assert.equal(retryResult.success, true);
    assert.equal(engineA.getState(), 'idle');

    // Device B now cleanly has both entries
    const entriesOnBFinal = storeB.listEntries();
    assert.equal(entriesOnBFinal.length, 2);
    assert.ok(storeB.getEntry('existing-b-001'));
    assert.ok(storeB.getEntry('new-entry-a-002'));
  });

  test('corrupted sync payload triggers atomic rollback and does not corrupt receiver store', async () => {
    const identityA = new DeviceIdentity('Device-A');
    const identityB = new DeviceIdentity('Device-B');

    const storeA = new VaultStore(identityA.getDeviceId());
    const storeB = new VaultStore(identityB.getDeviceId());

    const key = deriveKey('pass', 'salt', 'key');
    storeB.saveEntry({
      id: 'target-entry-001',
      type: 'login',
      title: 'Target Service',
      tags: ['original-tag'],
      encryptedSecret: encryptSymmetric('secret', key),
    });

    storeA.saveEntry({
      id: 'target-entry-001',
      type: 'login',
      title: 'Target Service Updated',
      tags: ['corrupted-attempt-tag'],
      encryptedSecret: encryptSymmetric('secret-new', key),
    });

    const engineA = new DirectSyncEngine(identityA, storeA);
    const engineB = new DirectSyncEngine(identityB, storeB);
    enginesToClean.push(engineA, engineB);

    await engineA.start();
    const portB = await engineB.start();

    DesktopPairingCoordinator.pairDevices(identityA, identityB);

    // Simulate payload corruption on Device A transport
    engineA.getTransport().setSimulateCorrupt(true);

    // Sync attempt fails due to checksum / MAC mismatch on corrupted payload
    await assert.rejects(
      async () => {
        await engineA.syncWithPeer(identityB.getDeviceId(), '127.0.0.1', portB);
      },
      (err: any) => {
        return err instanceof CorruptedPayloadError || (err instanceof Error && err.message.includes('Integrity check failed'));
      },
      'Corrupted payload must be rejected'
    );

    // Verify Device B local store retained original valid tag and was NOT modified
    const entryOnB = storeB.getEntry('target-entry-001');
    assert.ok(entryOnB);
    assert.deepEqual(entryOnB?.tags, ['original-tag'], 'Local data on Device B must not be corrupted');
    assert.equal(entryOnB?.title, 'Target Service');
  });
});
