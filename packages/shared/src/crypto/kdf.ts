import { scryptSync, randomBytes } from 'node:crypto';
import type { KdfParams } from '../types/crypto.js';

export const DEFAULT_KDF_PARAMS: Required<KdfParams> = {
  cost: 32768,       // N = 2^15
  blockSize: 8,      // r = 8
  parallelization: 1,// p = 1
  keyLength: 32,     // 256 bits
};

export function generateSalt(length = 32): string {
  return randomBytes(length).toString('hex');
}

export function deriveMasterKey(
  password: string,
  saltHex: string,
  params: KdfParams = {}
): Buffer {
  const finalParams: Required<KdfParams> = {
    ...DEFAULT_KDF_PARAMS,
    ...params,
  };

  const saltBuf = Buffer.from(saltHex, 'hex');

  return scryptSync(password, saltBuf, finalParams.keyLength, {
    N: finalParams.cost,
    r: finalParams.blockSize,
    p: finalParams.parallelization,
    maxmem: 64 * 1024 * 1024,
  });
}
