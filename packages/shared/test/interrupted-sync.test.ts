import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDeviceIdentity,
  PairingManager,
  DesktopSyncEngine,
  DirectPeerTransport,
  SyncInterruptedError,
  createSyncEnvelope,
  type SyncDelta,
} from '../src/sync/index.js';

describe('AC-D-M2-01-05: Interrupted-Sync Fault Tolerance & Integrity Test', () => {
  it('should report SyncInterruptedError when network disconnects mid-sync and preserve local data', async () => {
    const deviceAIdentity = generateDeviceIdentity('Device A');
    const deviceBIdentity = generateDeviceIdentity('Device B');

    const pairingA = new PairingManager(deviceAIdentity);
    const pairingB = new PairingManager(deviceBIdentity);

    const { invitation, pairingCode } = pairingA.createInvitation();
    const { exchangeMessage } = pairingB.acceptInvitation(invitation, pairingCode);
    const { confirmation } = pairingA.confirmPairing(pairingCode, exchangeMessage);
    pairingB.finalizePairing(invitation, confirmation);

    const localVaultB = new Map<string, { title: string; tags: string[] }>();
    localVaultB.set('entry-101', { title: 'Bank Account', tags: ['finance'] });

    const engineA = new DesktopSyncEngine(deviceAIdentity, pairingA);
    const engineB = new DesktopSyncEngine(deviceBIdentity, pairingB, async (deltas) => {
      for (const d of deltas) {
        if (d.tags) {
          localVaultB.get(d.entryId)!.tags = d.tags;
        }
      }
    });

    const transport = new DirectPeerTransport();
    transport.bindPeer(
      (env) => engineB.handleInboundEnvelope(env),
      (msg) => engineB.handleInboundHandshake(msg)
    );

    // Simulate network drop
    transport.simulateNetworkFault = true;

    await assert.rejects(
      async () =>
        engineA.syncToPeer(deviceBIdentity.deviceId, transport, [
          { entryId: 'entry-101', op: 'UPDATE', tags: ['corrupted'], updatedAt: Date.now(), version: 2 },
        ]),
      (err: Error) => {
        assert.ok(err instanceof SyncInterruptedError);
        assert.match(err.message, /transmission failed|interrupted/i);
        return true;
      }
    );

    // Assert Device B vault was NOT modified or corrupted
    const item = localVaultB.get('entry-101')!;
    assert.deepEqual(item.tags, ['finance']);
  });

  it('should reject tampered or corrupted ciphertext payloads without corrupting state', async () => {
    const deviceAIdentity = generateDeviceIdentity('Device A');
    const deviceBIdentity = generateDeviceIdentity('Device B');

    const pairingA = new PairingManager(deviceAIdentity);
    const pairingB = new PairingManager(deviceBIdentity);

    const { invitation, pairingCode } = pairingA.createInvitation();
    const { exchangeMessage } = pairingB.acceptInvitation(invitation, pairingCode);
    const { confirmation, pairedDevice } = pairingA.confirmPairing(pairingCode, exchangeMessage);
    pairingB.finalizePairing(invitation, confirmation);

    let applyCalled = false;
    const engineB = new DesktopSyncEngine(deviceBIdentity, pairingB, async () => {
      applyCalled = true;
    });

    // Create a valid envelope then corrupt ciphertext
    const delta: SyncDelta = { entryId: 'e1', op: 'CREATE', updatedAt: Date.now(), version: 1 };
    const envelope = createSyncEnvelope(
      [delta],
      deviceAIdentity.privateKeyPem,
      deviceAIdentity.deviceId,
      deviceBIdentity.deviceId,
      pairedDevice.syncSecret
    );

    // Tamper with payload auth tag
    envelope.payload.authTag = '00000000000000000000000000000000';
    // Re-sign to make signature pass but decryption fail on auth tag
    const signableData = `${envelope.senderDeviceId}:${envelope.recipientDeviceId}:${envelope.timestamp}:${envelope.nonce}:${envelope.payload.ciphertext}:${envelope.payload.authTag}`;
    const { signData } = await import('../src/sync/identity.js');
    envelope.signature = signData(signableData, deviceAIdentity.privateKeyPem);

    await assert.rejects(
      async () => engineB.handleInboundEnvelope(envelope),
      (err: Error) => {
        assert.ok(err instanceof SyncInterruptedError);
        assert.match(err.message, /failed to decrypt/i);
        return true;
      }
    );

    // Verify apply handler was never called with corrupt data
    assert.equal(applyCalled, false);
  });
});
