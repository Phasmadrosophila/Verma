import type { EntryType } from './entry.js';

export type TargetField = 'title' | 'username' | 'password' | 'url' | 'notes' | 'tags' | 'ignore';

export interface ColumnMapping {
  sourceColumn: string;
  targetField: TargetField;
  confidence: 'high' | 'medium' | 'low';
  suggestedBy: 'ai' | 'heuristic';
}

export interface DuplicateCandidate {
  rowIndex: number;
  title: string;
  username: string;
  url?: string;
  domain?: string;
  matchedExistingId?: string;
  reason: string;
}

export interface DuplicateGroup {
  id: string;
  key: string;
  reason: string;
  candidates: DuplicateCandidate[];
}

export interface ImportPreviewRow {
  rowIndex: number;
  sourceData: Record<string, string>;
  proposedEntry: {
    type: EntryType;
    title: string;
    username: string;
    passwordMasked: string; // '••••••••' - secrets stay masked
    url?: string;
    domain?: string;
    tags: string[];
    notes?: string;
  };
  hasPasswordSecret: boolean;
  isDuplicate: boolean;
  duplicateGroupId?: string;
  warnings: string[];
  status: 'ready' | 'duplicate' | 'warning' | 'invalid';
}

export interface ImportProposal {
  sourceType: 'browser_csv' | 'generic_csv';
  totalRows: number;
  columns: string[];
  mappings: ColumnMapping[];
  duplicateGroups: DuplicateGroup[];
  previewRows: ImportPreviewRow[];
  suggestedTags: string[];
}

export interface ConfirmImportItem {
  rowIndex: number;
  title: string;
  username?: string;
  password?: string;
  url?: string;
  domain?: string;
  tags?: string[];
  notes?: string;
  type?: EntryType;
  skip?: boolean;
}

export interface ImportConfirmInput {
  stagingId?: string;
  items?: ConfirmImportItem[];
  selectedRowIndices?: number[];
  csvContent?: string;
  customMappings?: Record<string, TargetField>;
}

export interface ImportResult {
  importedCount: number;
  failedCount: number;
  importedEntries: { id: string; title: string; type: EntryType }[];
  failedRows: { rowIndex: number; reason: string }[];
}
