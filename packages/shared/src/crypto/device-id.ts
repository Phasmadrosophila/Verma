import { createHash } from 'node:crypto';

/**
 * Computes the canonical Device ID from an Ed25519 public key.
 * Per Verma spec (PRD §10, AGENTS.md §3.4):
 * Device ID is the SHA-256 hash of the device's Ed25519 public key (hex formatted).
 */
export function computeDeviceId(publicKey: Uint8Array | Buffer): string {
  const hash = createHash('sha256');
  hash.update(publicKey);
  return hash.digest('hex');
}

/**
 * Formats a 64-char hex device ID into readable chunks (e.g., "ABCD-EF01-...").
 */
export function formatDeviceId(deviceId: string): string {
  const cleaned = deviceId.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  const chunks: string[] = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    chunks.push(cleaned.slice(i, i + 4));
  }
  return chunks.slice(0, 8).join('-');
}

/**
 * Validates whether a device ID matches the SHA-256 hash of the given public key.
 */
export function verifyDeviceId(deviceId: string, publicKey: Uint8Array | Buffer): boolean {
  const expected = computeDeviceId(publicKey);
  return deviceId.toLowerCase() === expected.toLowerCase();
}
