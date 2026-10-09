import * as crypto from 'node:crypto';
import type { DeviceIdentity, EncryptedSyncDelta, VaultEntry } from './types.ts';

/**
 * Creates an Ed25519 device identity where device ID is the SHA-256 hash of the public key.
 */
export function generateDeviceIdentity(): DeviceIdentity {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubDer = publicKey.export({ type: 'spki', format: 'der' });
  const deviceId = crypto.createHash('sha256').update(pubDer).digest('hex');

  return {
    deviceId,
    publicKeyDerHex: pubDer.toString('hex'),
    keyPair: { publicKey, privateKey }
  };
}

/**
 * Simulates SPAKE2 / PAKE pairing to derive a shared symmetric sync key between two paired devices.
 */
export function derivePairingSessionKey(
  deviceA: DeviceIdentity,
  deviceB: DeviceIdentity,
  sharedSecretPhrase: string
): Buffer {
  const salt = Buffer.from('verma-spake2-direct-sync-salt-2026', 'utf-8');
  const context = Buffer.from(
    [deviceA.deviceId, deviceB.deviceId].sort().join('::'),
    'utf-8'
  );

  const derived = crypto.hkdfSync(
    'sha256',
    Buffer.from(sharedSecretPhrase, 'utf-8'),
    salt,
    context,
    32
  );
  return Buffer.from(derived);
}

/**
 * Encrypts and cryptographically signs a vault synchronization delta.
 */
export function createSyncDelta(
  sender: DeviceIdentity,
  sessionKey: Buffer,
  payload: { action: 'UPSERT' | 'DELETE'; entry: VaultEntry; timestamp: number }
): EncryptedSyncDelta {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, iv);

  const plaintext = Buffer.from(JSON.stringify(payload), 'utf-8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const timestamp = Date.now();
  const deltaId = crypto.randomUUID();

  // Signature payload: deltaId + senderDeviceId + timestamp + ciphertextHex + authTagHex
  const signPayload = Buffer.from(
    `${deltaId}:${sender.deviceId}:${timestamp}:${encrypted.toString('hex')}:${authTag.toString('hex')}`,
    'utf-8'
  );

  const signature = crypto.sign(null, signPayload, sender.keyPair.privateKey);

  return {
    deltaId,
    senderDeviceId: sender.deviceId,
    ivHex: iv.toString('hex'),
    authTagHex: authTag.toString('hex'),
    ciphertextHex: encrypted.toString('hex'),
    signatureHex: signature.toString('hex'),
    timestamp,
    version: 1
  };
}

/**
 * Verifies signature and decrypts a received sync delta.
 */
export function decryptSyncDelta(
  delta: EncryptedSyncDelta,
  senderIdentity: DeviceIdentity,
  sessionKey: Buffer
): { action: 'UPSERT' | 'DELETE'; entry: VaultEntry; timestamp: number } {
  // 1. Verify Ed25519 signature
  const signPayload = Buffer.from(
    `${delta.deltaId}:${delta.senderDeviceId}:${delta.timestamp}:${delta.ciphertextHex}:${delta.authTagHex}`,
    'utf-8'
  );

  const isSigValid = crypto.verify(
    null,
    signPayload,
    senderIdentity.keyPair.publicKey,
    Buffer.from(delta.signatureHex, 'hex')
  );

  if (!isSigValid) {
    throw new Error('E_SYNC_SIG_INVALID: Ed25519 signature verification failed.');
  }

  // 2. Decrypt AES-256-GCM ciphertext
  const iv = Buffer.from(delta.ivHex, 'hex');
  const authTag = Buffer.from(delta.authTagHex, 'hex');
  const ciphertext = Buffer.from(delta.ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', sessionKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf-8'));
}

/**
 * Direct device state container representing an authenticated local node.
 */
export class DirectSyncDeviceNode {
  public identity: DeviceIdentity;
  public vault: Map<string, VaultEntry> = new Map();
  public pairedPeers: Map<string, { identity: DeviceIdentity; sessionKey: Buffer }> = new Map();

  constructor(identity?: DeviceIdentity) {
    this.identity = identity || generateDeviceIdentity();
  }

  public pairWithPeer(peer: DirectSyncDeviceNode, pairingPhrase: string): void {
    const sessionKey = derivePairingSessionKey(this.identity, peer.identity, pairingPhrase);
    this.pairedPeers.set(peer.identity.deviceId, { identity: peer.identity, sessionKey });
    peer.pairedPeers.set(this.identity.deviceId, { identity: this.identity, sessionKey });
  }

  public setEntry(entry: VaultEntry): EncryptedSyncDelta[] {
    this.vault.set(entry.id, entry);

    // Generate encrypted deltas for all paired peers
    const deltas: EncryptedSyncDelta[] = [];
    for (const [_, peer] of this.pairedPeers.entries()) {
      const delta = createSyncDelta(this.identity, peer.sessionKey, {
        action: 'UPSERT',
        entry,
        timestamp: Date.now()
      });
      deltas.push(delta);
    }
    return deltas;
  }

  public receiveSyncDelta(delta: EncryptedSyncDelta): VaultEntry {
    const peer = this.pairedPeers.get(delta.senderDeviceId);
    if (!peer) {
      throw new Error(`E_SYNC_UNPAIRED: Received delta from unknown or unpaired device ID "${delta.senderDeviceId}"`);
    }

    const payload = decryptSyncDelta(delta, peer.identity, peer.sessionKey);
    if (payload.action === 'UPSERT') {
      this.vault.set(payload.entry.id, payload.entry);
    } else if (payload.action === 'DELETE') {
      this.vault.delete(payload.entry.id);
    }
    return payload.entry;
  }
}
