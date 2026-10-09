export interface EncryptedPayload {
  iv: string;        // Hex encoded
  authTag: string;   // Hex encoded
  ciphertext: string;// Hex encoded
  version: number;
}

export interface KdfParams {
  cost?: number;     // N for scrypt
  blockSize?: number;// r for scrypt
  parallelization?: number; // p for scrypt
  keyLength?: number;
}

export interface VaultMetaRecord {
  id: string;
  salt: string;
  kdfAlgorithm: string;
  kdfParams: string;
  keyCheck: EncryptedPayload;
  createdAt: number;
  updatedAt: number;
}
