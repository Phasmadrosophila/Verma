import type { EntryType } from './entry.js';

export interface ConflictMetadata {
  hasConflict?: boolean;
  conflictFields?: string[];
  localUpdatedAt?: number;
  remoteUpdatedAt?: number;
  remoteDeviceId?: string;
}

export interface RedactedEntryMetadata {
  id: string;
  type: EntryType | string;
  title: string;
  domain?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isReused?: boolean;
  isWeak?: boolean;
  fieldLabels: string[];
  importSource?: string;
  conflictMetadata?: ConflictMetadata;
}

