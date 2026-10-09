import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDeviceIdentity,
  deriveDeviceIdFromPublicKey,
  signData,
  verifySignature,
  toPublicProfile,
} from '../src/sync/index.js';

describe('AC-D-M2-01-03: Device Identity & Ed25519 Public-Key Hash Verification Test', () => {
  it('should generate valid Ed25519 keypair and derive deterministic deviceId from public key hash', () => {
    const identity = generateDeviceIdentity('MacBook Pro M3');

    assert.ok(identity.deviceId);
    assert.equal(typeof identity.deviceId, 'string');
    assert.equal(identity.deviceId.length, 64, 'SHA-256 hex digest must be 64 characters');
    assert.match(identity.deviceId, /^[a-f0-9]{64}$/, 'Device ID must be lowercase hex');

    assert.equal(identity.deviceName, 'MacBook Pro M3');
    assert.ok(identity.publicKeyPem.includes('BEGIN PUBLIC KEY'));
    assert.ok(identity.privateKeyPem.includes('BEGIN PRIVATE KEY'));

    // Verify determinism: hashing the public key repeatedly produces the exact same device ID
    const derivedId1 = deriveDeviceIdFromPublicKey(identity.publicKeyPem);
    const derivedId2 = deriveDeviceIdFromPublicKey(identity.publicKeyPem);

    assert.equal(derivedId1, identity.deviceId);
    assert.equal(derivedId2, identity.deviceId);
  });

  it('should generate distinct device identities for different devices', () => {
    const deviceA = generateDeviceIdentity('Device A');
    const deviceB = generateDeviceIdentity('Device B');

    assert.notEqual(deviceA.deviceId, deviceB.deviceId);
    assert.notEqual(deviceA.publicKeyPem, deviceB.publicKeyPem);
  });

  it('should correctly sign data and verify with public key', () => {
    const identity = generateDeviceIdentity('Signer Node');
    const payload = JSON.stringify({ action: 'sync_vault', timestamp: 1710000000 });

    const signature = signData(payload, identity.privateKeyPem);
    assert.ok(signature);
    assert.equal(typeof signature, 'string');

    // Valid verification
    const isValid = verifySignature(payload, signature, identity.publicKeyPem);
    assert.equal(isValid, true);

    // Tampered payload verification fails
    const tamperedPayload = JSON.stringify({ action: 'sync_vault', timestamp: 1710000001 });
    const isTamperedValid = verifySignature(tamperedPayload, signature, identity.publicKeyPem);
    assert.equal(isTamperedValid, false);

    // Wrong public key verification fails
    const otherIdentity = generateDeviceIdentity('Other Node');
    const isWrongKeyValid = verifySignature(payload, signature, otherIdentity.publicKeyPem);
    assert.equal(isWrongKeyValid, false);
  });

  it('should extract public profile without private keys', () => {
    const identity = generateDeviceIdentity('Desktop Alpha');
    const profile = toPublicProfile(identity);

    assert.equal(profile.deviceId, identity.deviceId);
    assert.equal(profile.deviceName, 'Desktop Alpha');
    assert.equal(profile.publicKeyPem, identity.publicKeyPem);
    assert.equal((profile as any).privateKeyPem, undefined);
  });
});
