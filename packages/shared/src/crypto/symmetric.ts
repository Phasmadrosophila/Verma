import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  hkdfSync,
  createHash,
} from 'node:crypto';

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string;         // Base64 (12 bytes for GCM)
  tag: string;        // Base64 (16 bytes auth tag)
}

/**
 * Derive a 256-bit symmetric key from a master key/secret and salt.
 */
export function deriveKey(secret: Uint8Array | Buffer | string, salt: Uint8Array | Buffer | string, info: string): Uint8Array {
  const secretBuf = Buffer.isBuffer(secret) ? secret : Buffer.from(secret);
  const saltBuf = Buffer.isBuffer(salt) ? salt : Buffer.from(salt);
  const derived = hkdfSync('sha256', secretBuf, saltBuf, Buffer.from(info), 32);
  return new Uint8Array(derived);
}

/**
 * Encrypt plaintext using AES-256-GCM.
 */
export function encryptSymmetric(plaintext: string | Uint8Array, key: Uint8Array | Buffer): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key), iv);

  const ptBuf = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : Buffer.from(plaintext);
  const encrypted = Buffer.concat([cipher.update(ptBuf), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM.
 */
export function decryptSymmetric(payload: EncryptedPayload, key: Uint8Array | Buffer): Uint8Array {
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);

  return new Uint8Array(decrypted);
}

/**
 * Decrypt ciphertext to UTF-8 string.
 */
export function decryptSymmetricUtf8(payload: EncryptedPayload, key: Uint8Array | Buffer): string {
  const dec = decryptSymmetric(payload, key);
  return Buffer.from(dec).toString('utf8');
}

/**
 * Generate cryptographically secure random bytes.
 */
export function secureRandomBytes(length: number): Uint8Array {
  return new Uint8Array(randomBytes(length));
}

/**
 * Compute SHA-256 hash.
 */
export function sha256(data: Uint8Array | Buffer | string): string {
  const h = createHash('sha256');
  h.update(typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data));
  return h.digest('hex');
}
