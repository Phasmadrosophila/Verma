import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { EncryptedPayload } from '../types/crypto.js';

export const CURRENT_PAYLOAD_VERSION = 1;
export const KEY_CHECK_PLAINTEXT = 'VERMA_VAULT_KEY_VALID_CHECK_TOKEN_V1';

export function encryptPayload(plaintext: Buffer | string, key: Buffer): EncryptedPayload {
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const inputBuf = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
  const encrypted = Buffer.concat([cipher.update(inputBuf), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
    version: CURRENT_PAYLOAD_VERSION,
  };
}

export function decryptPayload(payload: EncryptedPayload, key: Buffer): Buffer {
  const iv = Buffer.from(payload.iv, 'hex');
  const authTag = Buffer.from(payload.authTag, 'hex');
  const ciphertext = Buffer.from(payload.ciphertext, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function encryptJson<T>(data: T, key: Buffer): EncryptedPayload {
  const jsonStr = JSON.stringify(data);
  return encryptPayload(jsonStr, key);
}

export function decryptJson<T>(payload: EncryptedPayload, key: Buffer): T {
  const decryptedBuf = decryptPayload(payload, key);
  const jsonStr = decryptedBuf.toString('utf8');
  return JSON.parse(jsonStr) as T;
}

export function zeroizeBuffer(buf: Buffer): void {
  buf.fill(0);
}
