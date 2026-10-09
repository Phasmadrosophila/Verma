import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDeviceIdentity,
  PairingManager,
  PairingError,
} from '../src/sync/index.js';

describe('AC-D-M2-01-01: Two Desktop Devices Authenticated Pairing Integration Test', () => {
  it('should successfully complete mutual pairing handshake using confirmation code and signatures', () => {
    const deviceAIdentity = generateDeviceIdentity('Desktop A (Linux)');
    const deviceBIdentity = generateDeviceIdentity('Desktop B (macOS)');

    const managerA = new PairingManager(deviceAIdentity);
    const managerB = new PairingManager(deviceBIdentity);

    // 1. Device A initiates pairing and creates invitation with 6-digit confirmation code
    const { invitation, pairingCode } = managerA.createInvitation();
    assert.equal(typeof pairingCode, 'string');
    assert.equal(pairingCode.length, 6);
    assert.equal(invitation.initiatorProfile.deviceId, deviceAIdentity.deviceId);

    // 2. Device B accepts invitation by entering the pairing code
    const { exchangeMessage } = managerB.acceptInvitation(invitation, pairingCode);
    assert.equal(exchangeMessage.responderProfile.deviceId, deviceBIdentity.deviceId);

    // 3. Device A verifies responder exchange and confirms pairing
    const { confirmation, pairedDevice: pairedBOnA } = managerA.confirmPairing(
      pairingCode,
      exchangeMessage
    );
    assert.equal(pairedBOnA.deviceId, deviceBIdentity.deviceId);
    assert.equal(pairedBOnA.deviceName, 'Desktop B (macOS)');
    assert.ok(managerA.isDevicePaired(deviceBIdentity.deviceId));

    // 4. Device B finalizes pairing using Device A confirmation
    const pairedAOnB = managerB.finalizePairing(invitation, confirmation);
    assert.equal(pairedAOnB.deviceId, deviceAIdentity.deviceId);
    assert.equal(pairedAOnB.deviceName, 'Desktop A (Linux)');
    assert.ok(managerB.isDevicePaired(deviceAIdentity.deviceId));

    // 5. Verify both devices share the exact same sync secret
    assert.equal(pairedBOnA.syncSecret, pairedAOnB.syncSecret);
    assert.equal(typeof pairedBOnA.syncSecret, 'string');
    assert.equal(pairedBOnA.syncSecret.length, 64); // 32 bytes in hex
  });

  it('should reject pairing with incorrect confirmation code', () => {
    const deviceAIdentity = generateDeviceIdentity('Desktop A');
    const deviceBIdentity = generateDeviceIdentity('Desktop B');

    const managerA = new PairingManager(deviceAIdentity);
    const managerB = new PairingManager(deviceBIdentity);

    const { invitation } = managerA.createInvitation();

    assert.throws(
      () => managerB.acceptInvitation(invitation, '000000'),
      (err: Error) => {
        assert.ok(err instanceof PairingError);
        assert.match(err.message, /invalid pairing confirmation code/i);
        return true;
      }
    );
  });

  it('should reject expired pairing invitations', () => {
    const deviceAIdentity = generateDeviceIdentity('Desktop A');
    const deviceBIdentity = generateDeviceIdentity('Desktop B');

    const managerA = new PairingManager(deviceAIdentity);
    const managerB = new PairingManager(deviceBIdentity);

    // Create invitation with negative TTL (already expired)
    const { invitation, pairingCode } = managerA.createInvitation(-1000);

    assert.throws(
      () => managerB.acceptInvitation(invitation, pairingCode),
      (err: Error) => {
        assert.ok(err instanceof PairingError);
        assert.match(err.message, /expired/i);
        return true;
      }
    );
  });

  it('should reject forged responder device ID', () => {
    const deviceAIdentity = generateDeviceIdentity('Desktop A');
    const deviceBIdentity = generateDeviceIdentity('Desktop B');

    const managerA = new PairingManager(deviceAIdentity);
    const managerB = new PairingManager(deviceBIdentity);

    const { invitation, pairingCode } = managerA.createInvitation();
    const { exchangeMessage } = managerB.acceptInvitation(invitation, pairingCode);

    // Tamper with responder deviceId
    exchangeMessage.responderProfile.deviceId = 'forged-device-id-000000000000000000000000000000000000000000000000';

    assert.throws(
      () => managerA.confirmPairing(pairingCode, exchangeMessage),
      (err: Error) => {
        assert.ok(err instanceof PairingError);
        assert.match(err.message, /does not match public key hash/i);
        return true;
      }
    );
  });
});
