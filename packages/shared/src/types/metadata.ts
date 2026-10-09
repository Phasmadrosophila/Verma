import type { EntryType } from './entry.js';

export interface RedactedEntryMetadata {
  id: string;
  type: EntryType;
  title: string;
  domain?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isReused?: boolean;
  isWeak?: boolean;
  fieldLabels: string[];
}
