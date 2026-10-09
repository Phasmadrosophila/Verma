import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDeviceKeypair,
  computeDeviceId,
  verifyDeviceId,
  formatDeviceId,
  signData,
  verifySignature,
  DeviceIdentity,
} from '../src/index.js';
import { createHash } from 'node:crypto';

describe('AC-D-M2-01-03: Device Identity Verification', () => {
  test('generates Ed25519 keypair where device ID is SHA-256 of public key', () => {
    const keypair = generateDeviceKeypair();

    assert.ok(keypair.publicKeyRaw);
    assert.equal(keypair.publicKeyRaw.length, 32, 'Ed25519 raw public key must be 32 bytes');

    // Canonical calculation: SHA-256 of the 32-byte public key
    const expectedHash = createHash('sha256').update(keypair.publicKeyRaw).digest('hex');
    assert.equal(keypair.deviceId, expectedHash, 'Device ID must equal sha256(publicKeyRaw)');

    assert.equal(computeDeviceId(keypair.publicKeyRaw), expectedHash);
    assert.equal(verifyDeviceId(keypair.deviceId, keypair.publicKeyRaw), true);
  });

  test('rejects mismatched or tampered device ID', () => {
    const keypair = generateDeviceKeypair();
    const fakeDeviceId = '0'.repeat(64);

    assert.equal(verifyDeviceId(fakeDeviceId, keypair.publicKeyRaw), false);
  });

  test('formats device ID into readable chunked format', () => {
    const keypair = generateDeviceKeypair();
    const formatted = formatDeviceId(keypair.deviceId);

    assert.ok(formatted.includes('-'));
    const parts = formatted.split('-');
    assert.equal(parts.length, 8);
    for (const part of parts) {
      assert.equal(part.length, 4);
    }
  });

  test('signs and verifies data with Ed25519 keypair', () => {
    const keypair = generateDeviceKeypair();
    const message = Buffer.from('verma-test-payload-authentication');

    const signature = signData(message, keypair.privateKeyPem);
    assert.ok(signature.length > 0);

    const valid = verifySignature(message, signature, keypair.publicKeyRaw);
    assert.equal(valid, true, 'Signature should be valid');

    const tamperedMessage = Buffer.from('verma-tampered-payload');
    const invalid = verifySignature(tamperedMessage, signature, keypair.publicKeyRaw);
    assert.equal(invalid, false, 'Signature should fail on tampered data');
  });

  test('DeviceIdentity class adheres to Ed25519 public key hash specification', () => {
    const identity = new DeviceIdentity('Desktop-Alpha');
    const deviceId = identity.getDeviceId();
    const pubRaw = identity.getPublicKeyRaw();

    assert.equal(computeDeviceId(pubRaw), deviceId);

    const payload = 'handshake-challenge-12345';
    const sig = identity.sign(payload);
    assert.equal(identity.verify(payload, sig, identity.getPublicKeyHex()), true);
  });
});
