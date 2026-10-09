export class VaultLockedError extends Error {
  constructor(message = 'Vault is locked. Decrypted access and metadata projection are denied.') {
    super(message);
    this.name = 'VaultLockedError';
  }
}

export class VaultNotInitializedError extends Error {
  constructor(message = 'Vault is not initialized.') {
    super(message);
    this.name = 'VaultNotInitializedError';
  }
}

export class VaultAlreadyInitializedError extends Error {
  constructor(message = 'Vault is already initialized.') {
    super(message);
    this.name = 'VaultAlreadyInitializedError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor(message = 'Invalid vault password or recovery credentials.') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

export class EntryNotFoundError extends Error {
  constructor(id: string) {
    super(`Entry with id "${id}" not found.`);
    this.name = 'EntryNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
