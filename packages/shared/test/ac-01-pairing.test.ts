import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DeviceIdentity,
  DesktopPairingCoordinator,
  PairingFailedError,
} from '../src/index.js';

describe('AC-D-M2-01-01: Authenticated Desktop Device Pairing', () => {
  test('two desktop devices pair using SPAKE2 authenticated protocol', () => {
    const deviceA = new DeviceIdentity('Desktop-MacBook');
    const deviceB = new DeviceIdentity('Desktop-LinuxWorkstation');

    assert.equal(deviceA.isPeerPaired(deviceB.getDeviceId()), false);
    assert.equal(deviceB.isPeerPaired(deviceA.getDeviceId()), false);

    // Run high-level pairing
    const result = DesktopPairingCoordinator.pairDevices(deviceA, deviceB);

    assert.equal(result.success, true);
    assert.equal(result.codeA, result.codeB, 'Both devices must derive identical 6-digit confirmation codes (SAS)');
    assert.match(result.codeA, /^\d{6}$/, 'Confirmation code must be 6 digits');

    // Verify both devices registered each other in their trust store
    assert.equal(deviceA.isPeerPaired(deviceB.getDeviceId()), true);
    assert.equal(deviceB.isPeerPaired(deviceA.getDeviceId()), true);

    const peerOnA = deviceA.getPairedPeer(deviceB.getDeviceId());
    assert.ok(peerOnA);
    assert.equal(peerOnA?.name, 'Desktop-LinuxWorkstation');
    assert.equal(peerOnA?.status, 'paired');

    const peerOnB = deviceB.getPairedPeer(deviceA.getDeviceId());
    assert.ok(peerOnB);
    assert.equal(peerOnB?.name, 'Desktop-MacBook');
    assert.equal(peerOnB?.status, 'paired');
  });

  test('pairing fails when incorrect passphrase is provided by responder', () => {
    const deviceA = new DeviceIdentity('Desktop-A');
    const deviceB = new DeviceIdentity('Desktop-B');

    const coordA = new DesktopPairingCoordinator(deviceA);
    const coordB = new DesktopPairingCoordinator(deviceB);

    const { passphrase, initMessage } = coordA.createPairingInvitation();
    const wrongPassphrase = passphrase + '-wrong';

    // Responder rejects invitation if passphrase does not match commitment
    assert.throws(
      () => {
        coordB.acceptPairingInvitation(initMessage, wrongPassphrase);
      },
      (err: any) => {
        return err instanceof PairingFailedError || (err instanceof Error && err.message.includes('Pairing verification failed'));
      },
      'Should throw PairingFailedError on mismatched passphrase'
    );
  });

  test('pairing fails when initiator receives tampered responder payload', () => {
    const deviceA = new DeviceIdentity('Desktop-A');
    const deviceB = new DeviceIdentity('Desktop-B');

    const coordA = new DesktopPairingCoordinator(deviceA);
    const coordB = new DesktopPairingCoordinator(deviceB);

    const { passphrase, initMessage } = coordA.createPairingInvitation();
    const { responseMessage } = coordB.acceptPairingInvitation(initMessage, passphrase);

    // Tamper with response MAC
    responseMessage.responderAuthMacHex = 'deadbeef' + responseMessage.responderAuthMacHex.slice(8);

    assert.throws(
      () => {
        coordA.completeInitiatorPairing(responseMessage);
      },
      (err: any) => {
        return err instanceof PairingFailedError || (err instanceof Error && err.message.includes('Pairing verification failed'));
      }
    );
  });
});
