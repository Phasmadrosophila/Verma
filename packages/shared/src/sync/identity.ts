import { generateKeyPairSync, createHash, sign, verify, type KeyObject } from 'node:crypto';

export interface DeviceIdentity {
  deviceId: string;
  deviceName: string;
  publicKeyPem: string;
  privateKeyPem: string;
  createdAt: number;
}

export interface PublicDeviceProfile {
  deviceId: string;
  deviceName: string;
  publicKeyPem: string;
}

/**
 * Derives the canonical Device ID from an Ed25519 public key.
 * Device ID is the lowercase SHA-256 hash of the public key DER encoding (PRD §10 / AGENTS.md §3.4).
 */
export function deriveDeviceIdFromPublicKey(publicKeyPem: string): string {
  const hash = createHash('sha256');
  hash.update(publicKeyPem.trim());
  return hash.digest('hex');
}

/**
 * Generates a new cryptographically secure Ed25519 device identity.
 */
export function generateDeviceIdentity(deviceName: string): DeviceIdentity {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');

  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const deviceId = deriveDeviceIdFromPublicKey(publicKeyPem);

  return {
    deviceId,
    deviceName,
    publicKeyPem,
    privateKeyPem,
    createdAt: Date.now(),
  };
}

/**
 * Cryptographically signs arbitrary data using the device's Ed25519 private key.
 */
export function signData(data: Buffer | string, privateKeyPem: string): string {
  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  const signature = sign(null, buffer, privateKeyPem);
  return signature.toString('hex');
}

/**
 * Verifies an Ed25519 cryptographic signature against the peer's public key.
 */
export function verifySignature(
  data: Buffer | string,
  signatureHex: string,
  publicKeyPem: string
): boolean {
  try {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    const signature = Buffer.from(signatureHex, 'hex');
    return verify(null, buffer, publicKeyPem, signature);
  } catch {
    return false;
  }
}

/**
 * Extracts public device profile (safe to share over network during pairing).
 */
export function toPublicProfile(identity: DeviceIdentity): PublicDeviceProfile {
  return {
    deviceId: identity.deviceId,
    deviceName: identity.deviceName,
    publicKeyPem: identity.publicKeyPem,
  };
}
