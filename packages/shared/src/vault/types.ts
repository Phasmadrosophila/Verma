import { EncryptedPayload } from '../crypto/symmetric.js';

export type EntryType = 'login' | 'note' | 'api_key';

export interface SecretPayload {
  username?: string;
  password?: string;
  url?: string;
  note?: string;
  apiKey?: string;
  customFields?: Record<string, string>;
}

export interface VaultEntry {
  id: string;
  type: EntryType;
  title: string;
  domain?: string;
  tags: string[];
  encryptedSecret: EncryptedPayload;
  version: number;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface RedactedMetadata {
  id: string;
  title: string;
  domain?: string;
  tags: string[];
  fieldLabels: string[];
  createdAt: number;
  updatedAt: number;
  isWeak: boolean;
  isReused: boolean;
}

export interface VaultChangeset {
  deviceId: string;
  sequence: number;
  timestamp: number;
  entries: VaultEntry[];
  deletedIds: string[];
}
