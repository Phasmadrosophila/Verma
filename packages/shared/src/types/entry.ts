export type EntryType = 'login' | 'note' | 'api_key';

export interface CustomField {
  label: string;
  value: string;
  isSecret?: boolean;
}

export interface BaseEntry {
  id: string;
  type: EntryType;
  title: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface LoginEntry extends BaseEntry {
  type: 'login';
  username: string;
  password: string;
  url?: string;
  domain?: string;
  totpSecret?: string;
  recoveryCodes?: string[];
  customFields?: CustomField[];
}

export interface NoteEntry extends BaseEntry {
  type: 'note';
  content: string;
  category?: string;
}

export interface ApiKeyEntry extends BaseEntry {
  type: 'api_key';
  service: string;
  apiKey: string;
  apiSecret?: string;
  keyId?: string;
  expiresAt?: number;
}

export type VaultEntry = LoginEntry | NoteEntry | ApiKeyEntry;

export type CreateEntryInput<T extends VaultEntry = VaultEntry> =
  T extends LoginEntry
    ? Omit<LoginEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    : T extends NoteEntry
      ? Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
      : T extends ApiKeyEntry
        ? Omit<ApiKeyEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
        : never;

export type UpdateEntryInput<T extends VaultEntry = VaultEntry> =
  T extends LoginEntry
    ? Partial<Omit<LoginEntry, 'id' | 'type' | 'createdAt' | 'updatedAt'>>
    : T extends NoteEntry
      ? Partial<Omit<NoteEntry, 'id' | 'type' | 'createdAt' | 'updatedAt'>>
      : T extends ApiKeyEntry
        ? Partial<Omit<ApiKeyEntry, 'id' | 'type' | 'createdAt' | 'updatedAt'>>
        : never;
