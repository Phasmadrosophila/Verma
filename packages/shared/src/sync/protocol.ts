import type { EncryptedPayload } from '../types/crypto.js';
import type { VaultEntry } from '../types/entry.js';
import { encryptJson, decryptJson } from '../crypto/cipher.js';
import { signData, verifySignature } from './identity.js';

export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncDelta {
  entryId: string;
  op: SyncOperationType;
  entry?: VaultEntry;
  tags?: string[];
  updatedAt: number;
  version: number;
}

export interface EncryptedSyncEnvelope {
  senderDeviceId: string;
  recipientDeviceId: string;
  timestamp: number;
  nonce: string;
  payload: EncryptedPayload;
  signature: string; // Ed25519 signature over envelope metadata + ciphertext
}

export interface HandshakeMessage {
  type: 'HANDSHAKE_INIT' | 'HANDSHAKE_ACK';
  senderDeviceId: string;
  recipientDeviceId: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

export interface SyncSessionResult {
  success: boolean;
  appliedCount: number;
  deltasReceived: number;
  error?: string;
}

export class UnauthorizedPeerError extends Error {
  constructor(message = 'Unauthorized peer: device is not paired or signature is invalid') {
    super(message);
    this.name = 'UnauthorizedPeerError';
  }
}

export class SyncInterruptedError extends Error {
  constructor(message = 'Sync transmission interrupted or payload corrupted') {
    super(message);
    this.name = 'SyncInterruptedError';
  }
}

/**
 * Creates a signed and encrypted sync envelope containing deltas.
 */
export function createSyncEnvelope(
  deltas: SyncDelta[],
  senderPrivateKeyPem: string,
  senderDeviceId: string,
  recipientDeviceId: string,
  syncSecretHex: string
): EncryptedSyncEnvelope {
  const syncKey = Buffer.from(syncSecretHex, 'hex');
  const payload = encryptJson(deltas, syncKey);

  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 15);

  const signableData = `${senderDeviceId}:${recipientDeviceId}:${timestamp}:${nonce}:${payload.ciphertext}:${payload.authTag}`;
  const signature = signData(signableData, senderPrivateKeyPem);

  return {
    senderDeviceId,
    recipientDeviceId,
    timestamp,
    nonce,
    payload,
    signature,
  };
}

/**
 * Verifies and decrypts a sync envelope.
 */
export function unpackSyncEnvelope(
  envelope: EncryptedSyncEnvelope,
  senderPublicKeyPem: string,
  syncSecretHex: string
): SyncDelta[] {
  // 1. Verify cryptographic signature
  const signableData = `${envelope.senderDeviceId}:${envelope.recipientDeviceId}:${envelope.timestamp}:${envelope.nonce}:${envelope.payload.ciphertext}:${envelope.payload.authTag}`;
  const isValidSig = verifySignature(signableData, envelope.signature, senderPublicKeyPem);

  if (!isValidSig) {
    throw new UnauthorizedPeerError('Envelope signature verification failed');
  }

  // 2. Decrypt payload
  try {
    const syncKey = Buffer.from(syncSecretHex, 'hex');
    return decryptJson<SyncDelta[]>(envelope.payload, syncKey);
  } catch (err) {
    throw new SyncInterruptedError(`Failed to decrypt sync payload: ${(err as Error).message}`);
  }
}
