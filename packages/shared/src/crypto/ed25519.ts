import {
  generateKeyPairSync,
  sign,
  verify,
  createPublicKey,
  createPrivateKey,
  KeyObject,
} from 'node:crypto';
import { computeDeviceId } from './device-id.js';

export interface DeviceKeypair {
  publicKeyRaw: Uint8Array;
  privateKeyRaw: Uint8Array;
  publicKeyPem: string;
  privateKeyPem: string;
  deviceId: string;
}

/**
 * Generate a new Ed25519 keypair for a Verma device identity.
 */
export function generateDeviceKeypair(): DeviceKeypair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const pubKeyObj = createPublicKey(publicKey);
  const rawPubKeyBuf = pubKeyObj.export({ type: 'spki', format: 'der' });
  // In SPKI DER format for Ed25519, the last 32 bytes are the raw public key bytes.
  const publicKeyRaw = new Uint8Array(rawPubKeyBuf.subarray(rawPubKeyBuf.length - 32));

  const privKeyObj = createPrivateKey(privateKey);
  const rawPrivKeyBuf = privKeyObj.export({ type: 'pkcs8', format: 'der' });
  const privateKeyRaw = new Uint8Array(rawPrivKeyBuf.subarray(rawPrivKeyBuf.length - 32));

  const deviceId = computeDeviceId(publicKeyRaw);

  return {
    publicKeyRaw,
    privateKeyRaw,
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    deviceId,
  };
}

/**
 * Reconstitute an Ed25519 public key KeyObject from raw 32-byte public key.
 */
export function rawToPublicKeyObject(rawPublicKey: Uint8Array | Buffer): KeyObject {
  // Ed25519 SPKI DER prefix is: 302a300506032b6570032100 (12 bytes) + 32 bytes public key
  const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');
  const der = Buffer.concat([spkiPrefix, Buffer.from(rawPublicKey)]);
  return createPublicKey({
    key: der,
    format: 'der',
    type: 'spki',
  });
}

/**
 * Sign data with an Ed25519 private key.
 */
export function signData(data: Uint8Array | Buffer, privateKeyPemOrKeyObject: string | KeyObject): Uint8Array {
  const key = typeof privateKeyPemOrKeyObject === 'string'
    ? createPrivateKey(privateKeyPemOrKeyObject)
    : privateKeyPemOrKeyObject;
  const signature = sign(null, Buffer.from(data), key);
  return new Uint8Array(signature);
}

/**
 * Verify an Ed25519 signature using the raw 32-byte public key or KeyObject.
 */
export function verifySignature(
  data: Uint8Array | Buffer,
  signature: Uint8Array | Buffer,
  publicKey: Uint8Array | Buffer | KeyObject
): boolean {
  try {
    const keyObj = publicKey instanceof KeyObject ? publicKey : rawToPublicKeyObject(publicKey);
    return verify(null, Buffer.from(data), keyObj, Buffer.from(signature));
  } catch {
    return false;
  }
}
