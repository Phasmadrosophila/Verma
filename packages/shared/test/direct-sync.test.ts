import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDeviceIdentity,
  PairingManager,
  DesktopSyncEngine,
  DirectPeerTransport,
  type SyncDelta,
} from '../src/sync/index.js';
import type { LoginEntry } from '../src/types/entry.js';

describe('AC-D-M2-01-02: Two-Device Tag-Change Direct Sync E2E Test (Serverless)', () => {
  it('should synchronize a non-secret tag change from Device A to Device B directly without a central server', async () => {
    // 1. Setup Device A & Device B identities
    const deviceAIdentity = generateDeviceIdentity('Device A - Work Laptop');
    const deviceBIdentity = generateDeviceIdentity('Device B - Home Desktop');

    const pairingA = new PairingManager(deviceAIdentity);
    const pairingB = new PairingManager(deviceBIdentity);

    // 2. Perform mutual pairing
    const { invitation, pairingCode } = pairingA.createInvitation();
    const { exchangeMessage } = pairingB.acceptInvitation(invitation, pairingCode);
    const { confirmation } = pairingA.confirmPairing(pairingCode, exchangeMessage);
    pairingB.finalizePairing(invitation, confirmation);

    // 3. Local storage simulation on Device B
    const deviceBVault = new Map<string, LoginEntry>();
    const initialEntry: LoginEntry = {
      id: 'entry-sync-demo-01',
      type: 'login',
      title: 'GitHub Enterprise',
      username: 'dev@company.corp',
      password: 'OriginalPassword123!',
      domain: 'github.company.corp',
      tags: ['work'],
      createdAt: 1710000000000,
      updatedAt: 1710000000000,
    };
    deviceBVault.set(initialEntry.id, { ...initialEntry });

    // 4. Setup Sync Engines on both devices
    const engineA = new DesktopSyncEngine(deviceAIdentity, pairingA);
    const engineB = new DesktopSyncEngine(deviceBIdentity, pairingB, async (deltas: SyncDelta[]) => {
      for (const delta of deltas) {
        if (delta.op === 'UPDATE' && delta.tags) {
          const existing = deviceBVault.get(delta.entryId);
          if (existing) {
            existing.tags = [...delta.tags];
            existing.updatedAt = delta.updatedAt;
            deviceBVault.set(delta.entryId, existing);
          }
        }
      }
    });

    // 5. Setup Direct Peer Transport between A and B (No Server)
    const transportAtoB = new DirectPeerTransport();
    transportAtoB.bindPeer(
      (env) => engineB.handleInboundEnvelope(env),
      (msg) => engineB.handleInboundHandshake(msg)
    );

    // 6. Device A modifies entry tags (e.g. adds 'production' and 'priority-1')
    const updatedTags = ['work', 'production', 'priority-1'];
    const tagChangeDelta: SyncDelta = {
      entryId: initialEntry.id,
      op: 'UPDATE',
      tags: updatedTags,
      updatedAt: 1710000500000,
      version: 2,
    };

    // 7. Device A initiates direct sync to Device B
    const result = await engineA.syncToPeer(
      deviceBIdentity.deviceId,
      transportAtoB,
      [tagChangeDelta]
    );

    assert.equal(result.success, true);
    assert.equal(result.appliedCount, 1);

    // 8. Verify Device B local vault reflects the updated tags
    const syncedEntryOnB = deviceBVault.get(initialEntry.id)!;
    assert.ok(syncedEntryOnB);
    assert.deepEqual(syncedEntryOnB.tags, ['work', 'production', 'priority-1']);
    assert.equal(syncedEntryOnB.updatedAt, 1710000500000);
    // Verify secret fields on Device B remain intact and untouched
    assert.equal(syncedEntryOnB.password, 'OriginalPassword123!');
  });
});
