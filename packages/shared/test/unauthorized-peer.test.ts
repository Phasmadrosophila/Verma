import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDeviceIdentity,
  PairingManager,
  DesktopSyncEngine,
  DirectPeerTransport,
  UnauthorizedPeerError,
  createSyncEnvelope,
  type HandshakeMessage,
} from '../src/sync/index.js';

describe('AC-D-M2-01-04: Unauthorized-Peer Rejection & Mutual Authentication Test', () => {
  it('should reject inbound handshake from an unpaired rogue device', async () => {
    const legitimateIdentity = generateDeviceIdentity('Legitimate Node');
    const rogueIdentity = generateDeviceIdentity('Rogue Hacker Node');

    const pairingManager = new PairingManager(legitimateIdentity);
    const engine = new DesktopSyncEngine(legitimateIdentity, pairingManager);

    const rogueHandshake: HandshakeMessage = {
      type: 'HANDSHAKE_INIT',
      senderDeviceId: rogueIdentity.deviceId,
      recipientDeviceId: legitimateIdentity.deviceId,
      timestamp: Date.now(),
      nonce: 'rogue-nonce-123',
      signature: 'bad-or-unregistered-signature',
    };

    await assert.rejects(
      async () => engine.handleInboundHandshake(rogueHandshake),
      (err: Error) => {
        assert.ok(err instanceof UnauthorizedPeerError);
        assert.match(err.message, /not paired/i);
        return true;
      }
    );
  });

  it('should reject inbound sync envelope from an unpaired device', async () => {
    const legitimateIdentity = generateDeviceIdentity('Legitimate Node');
    const rogueIdentity = generateDeviceIdentity('Rogue Hacker Node');

    const pairingManager = new PairingManager(legitimateIdentity);
    const engine = new DesktopSyncEngine(legitimateIdentity, pairingManager);

    const fakeEnvelope = createSyncEnvelope(
      [{ entryId: 'e1', op: 'CREATE', updatedAt: Date.now(), version: 1 }],
      rogueIdentity.privateKeyPem,
      rogueIdentity.deviceId,
      legitimateIdentity.deviceId,
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    );

    await assert.rejects(
      async () => engine.handleInboundEnvelope(fakeEnvelope),
      (err: Error) => {
        assert.ok(err instanceof UnauthorizedPeerError);
        assert.match(err.message, /not paired/i);
        return true;
      }
    );
  });

  it('should reject outbound sync to an unpaired device', async () => {
    const deviceAIdentity = generateDeviceIdentity('Device A');
    const unpairedDeviceBIdentity = generateDeviceIdentity('Device B Unpaired');

    const pairingA = new PairingManager(deviceAIdentity);
    const engineA = new DesktopSyncEngine(deviceAIdentity, pairingA);
    const dummyTransport = new DirectPeerTransport();

    await assert.rejects(
      async () =>
        engineA.syncToPeer(unpairedDeviceBIdentity.deviceId, dummyTransport, [
          { entryId: 'e1', op: 'UPDATE', updatedAt: Date.now(), version: 1 },
        ]),
      (err: Error) => {
        assert.ok(err instanceof UnauthorizedPeerError);
        assert.match(err.message, /cannot sync to unpaired device/i);
        return true;
      }
    );
  });

  it('should reject envelope with forged signature even if device ID is in paired list', async () => {
    const deviceAIdentity = generateDeviceIdentity('Device A');
    const deviceBIdentity = generateDeviceIdentity('Device B');
    const rogueIdentity = generateDeviceIdentity('Rogue Man-in-the-Middle');

    const pairingA = new PairingManager(deviceAIdentity);
    const pairingB = new PairingManager(deviceBIdentity);

    // Pair A and B
    const { invitation, pairingCode } = pairingA.createInvitation();
    const { exchangeMessage } = pairingB.acceptInvitation(invitation, pairingCode);
    const { confirmation, pairedDevice } = pairingA.confirmPairing(pairingCode, exchangeMessage);
    pairingB.finalizePairing(invitation, confirmation);

    const engineA = new DesktopSyncEngine(deviceAIdentity, pairingA);

    // Rogue creates envelope spoofing senderDeviceId as Device B but signing with Rogue's private key
    const spoofedEnvelope = createSyncEnvelope(
      [{ entryId: 'e1', op: 'CREATE', updatedAt: Date.now(), version: 1 }],
      rogueIdentity.privateKeyPem, // Signed by rogue key
      deviceBIdentity.deviceId,   // Spoofed sender ID
      deviceAIdentity.deviceId,
      pairedDevice.syncSecret
    );

    await assert.rejects(
      async () => engineA.handleInboundEnvelope(spoofedEnvelope),
      (err: Error) => {
        assert.ok(err instanceof UnauthorizedPeerError);
        assert.match(err.message, /signature verification failed/i);
        return true;
      }
    );
  });
});
