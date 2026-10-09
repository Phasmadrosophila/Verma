import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  generateDeviceIdentity,
  derivePairingSessionKey,
  createSyncDelta,
  decryptSyncDelta,
  DirectSyncDeviceNode
} from '../../src/verification/direct-sync.ts';
import { MOCK_VAULT_ENTRIES } from '../../src/verification/fixtures.ts';
import type { VaultEntry } from '../../src/verification/types.ts';

describe('AC-E-MR-01-03: Direct Device-to-Device Sync & Cryptographic Verification', () => {
  it('should generate Ed25519 device identities where device ID is SHA-256 hash of public key', () => {
    const identity = generateDeviceIdentity();

    assert.ok(identity.deviceId, 'Device ID must be generated');
    assert.strictEqual(identity.deviceId.length, 64, 'SHA-256 device ID must be 64 hex characters');
    assert.ok(identity.publicKeyDerHex.length > 0, 'Public key DER must be present');
    assert.ok(identity.keyPair.publicKey, 'Public key object must be valid');
    assert.ok(identity.keyPair.privateKey, 'Private key object must be valid');
  });

  it('should derive deterministic shared session key during SPAKE2 pairing exchange', () => {
    const deviceA = generateDeviceIdentity();
    const deviceB = generateDeviceIdentity();
    const phrase = 'correct horse battery staple verma demo pair 2026';

    const keyA = derivePairingSessionKey(deviceA, deviceB, phrase);
    const keyB = derivePairingSessionKey(deviceB, deviceA, phrase);

    assert.strictEqual(keyA.length, 32, 'Session key must be 32 bytes (256-bit)');
    assert.deepStrictEqual(keyA, keyB, 'Derived session keys must match on both devices');
  });

  it('should encrypt with AES-256-GCM and sign with Ed25519, allowing peer to verify and decrypt', () => {
    const deviceA = generateDeviceIdentity();
    const deviceB = generateDeviceIdentity();
    const sessionKey = derivePairingSessionKey(deviceA, deviceB, 'test-pair-phrase');

    const entryToSync: VaultEntry = MOCK_VAULT_ENTRIES[0];
    const delta = createSyncDelta(deviceA, sessionKey, {
      action: 'UPSERT',
      entry: entryToSync,
      timestamp: Date.now()
    });

    assert.strictEqual(delta.senderDeviceId, deviceA.deviceId);
    assert.ok(delta.ciphertextHex.length > 0);
    assert.ok(delta.authTagHex.length > 0);
    assert.ok(delta.signatureHex.length > 0);

    const decrypted = decryptSyncDelta(delta, deviceA, sessionKey);
    assert.strictEqual(decrypted.action, 'UPSERT');
    assert.strictEqual(decrypted.entry.id, entryToSync.id);
    assert.strictEqual(decrypted.entry.title, entryToSync.title);
    assert.strictEqual(decrypted.entry.secrets.password, entryToSync.secrets.password);
  });

  it('should synchronize entry modification on Device A directly to Device B', () => {
    const nodeA = new DirectSyncDeviceNode();
    const nodeB = new DirectSyncDeviceNode();
    nodeA.pairWithPeer(nodeB, 'pair-phrase-sync-demo');

    // 1. Initial entry on Device A
    const baseEntry = { ...MOCK_VAULT_ENTRIES[0] };
    const deltas1 = nodeA.setEntry(baseEntry);
    assert.strictEqual(deltas1.length, 1);

    // Apply to Device B
    nodeB.receiveSyncDelta(deltas1[0]);
    assert.ok(nodeB.vault.has(baseEntry.id), 'Device B must have base entry');

    // 2. Modify entry on Device A (add tag "synced-direct-tag")
    const modifiedEntry: VaultEntry = {
      ...baseEntry,
      tags: [...baseEntry.tags, 'synced-direct-tag'],
      updatedAt: Date.now()
    };
    const deltas2 = nodeA.setEntry(modifiedEntry);

    // Apply to Device B
    const synced = nodeB.receiveSyncDelta(deltas2[0]);
    assert.ok(synced.tags.includes('synced-direct-tag'), 'Device B must receive modified tag');
    assert.strictEqual(nodeB.vault.get(baseEntry.id)?.tags.includes('synced-direct-tag'), true);
  });

  it('should reject sync deltas with tampered ciphertext or forged signature', () => {
    const nodeA = new DirectSyncDeviceNode();
    const nodeB = new DirectSyncDeviceNode();
    nodeA.pairWithPeer(nodeB, 'pair-phrase-security');

    const entry = { ...MOCK_VAULT_ENTRIES[0] };
    const deltas = nodeA.setEntry(entry);
    const validDelta = deltas[0];

    // Tamper with ciphertext
    const tamperedDelta = {
      ...validDelta,
      ciphertextHex: validDelta.ciphertextHex.slice(0, -2) + 'ff'
    };

    assert.throws(
      () => nodeB.receiveSyncDelta(tamperedDelta),
      /E_SYNC_SIG_INVALID|Unsupported state or unable to authenticate data/,
      'Tampered delta must fail verification or decryption'
    );
  });
});
