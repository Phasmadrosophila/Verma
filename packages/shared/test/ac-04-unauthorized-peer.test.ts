import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DeviceIdentity,
  DirectSyncTransport,
  UnauthorizedPeerError,
  DesktopPairingCoordinator,
} from '../src/index.js';

describe('AC-D-M2-01-04: Unauthorized Peer Rejection & Transport Authentication', () => {
  const transportsToClean: DirectSyncTransport[] = [];

  afterEach(async () => {
    while (transportsToClean.length > 0) {
      const t = transportsToClean.pop();
      await t?.stop();
    }
  });

  test('transport rejects connection attempt from unpaired rogue device', async () => {
    const deviceA = new DeviceIdentity('Device-A');
    const deviceC = new DeviceIdentity('Rogue-Device-C'); // Unpaired

    const transportA = new DirectSyncTransport(deviceA);
    const transportC = new DirectSyncTransport(deviceC);
    transportsToClean.push(transportA, transportC);

    const portA = await transportA.start();
    await transportC.start();

    // Device C is not paired in Device A's identity store
    assert.equal(deviceA.isPeerPaired(deviceC.getDeviceId()), false);

    // Device C attempts to connect to Device A
    // Must fail with UnauthorizedPeerError
    await assert.rejects(
      async () => {
        // Register A in C just so C initiates, but A will reject
        deviceC.pairPeer({
          deviceId: deviceA.getDeviceId(),
          name: deviceA.getDeviceName(),
          publicKeyHex: deviceA.getPublicKeyHex(),
        });

        await transportC.initiateHandshake('127.0.0.1', portA, deviceA.getDeviceId());
      },
      (err: any) => {
        return err instanceof UnauthorizedPeerError || (err instanceof Error && err.message.includes('UNAUTHORIZED_PEER'));
      },
      'Device A must reject unauthorized handshake from unpaired Device C'
    );
  });

  test('client refuses to initiate handshake with unpaired target device', async () => {
    const deviceA = new DeviceIdentity('Device-A');
    const deviceB = new DeviceIdentity('Device-B');

    const transportA = new DirectSyncTransport(deviceA);
    transportsToClean.push(transportA);
    await transportA.start();

    // Device A attempts to initiate handshake with Device B without pairing
    await assert.rejects(
      async () => {
        await transportA.initiateHandshake('127.0.0.1', 54321, deviceB.getDeviceId());
      },
      (err: any) => {
        return err instanceof UnauthorizedPeerError && err.message.includes('paired trust store');
      }
    );
  });

  test('handshake succeeds between mutually paired devices', async () => {
    const deviceA = new DeviceIdentity('Device-A');
    const deviceB = new DeviceIdentity('Device-B');

    // Mutually pair
    DesktopPairingCoordinator.pairDevices(deviceA, deviceB);

    const transportA = new DirectSyncTransport(deviceA);
    const transportB = new DirectSyncTransport(deviceB);
    transportsToClean.push(transportA, transportB);

    const portA = await transportA.start();
    await transportB.start();

    // Device B connects to Device A
    const session = await transportB.initiateHandshake('127.0.0.1', portA, deviceA.getDeviceId());

    assert.ok(session.sessionToken);
    assert.ok(session.sessionKey);
    assert.equal(session.sessionKey.length, 32);
  });

  test('transport rejects connection when device is unpaired/revoked', async () => {
    const deviceA = new DeviceIdentity('Device-A');
    const deviceB = new DeviceIdentity('Device-B');

    // Pair first
    DesktopPairingCoordinator.pairDevices(deviceA, deviceB);

    const transportA = new DirectSyncTransport(deviceA);
    const transportB = new DirectSyncTransport(deviceB);
    transportsToClean.push(transportA, transportB);

    const portA = await transportA.start();
    await transportB.start();

    // Device A unpairs Device B
    deviceA.unpairPeer(deviceB.getDeviceId());
    assert.equal(deviceA.isPeerPaired(deviceB.getDeviceId()), false);

    // Device B attempts handshake -> rejected by A
    await assert.rejects(
      async () => {
        await transportB.initiateHandshake('127.0.0.1', portA, deviceA.getDeviceId());
      },
      (err: any) => {
        return err instanceof UnauthorizedPeerError || (err instanceof Error && err.message.includes('UNAUTHORIZED_PEER'));
      }
    );
  });
});
