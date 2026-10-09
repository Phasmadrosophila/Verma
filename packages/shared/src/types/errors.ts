/**
 * Redaction & Vault Errors
 */

export class VaultLockedError extends Error {
  readonly code = 'VAULT_LOCKED';

  constructor(message = 'Vault is locked: AI metadata access is revoked') {
    super(message);
    this.name = 'VaultLockedError';
    Object.setPrototypeOf(this, VaultLockedError.prototype);
  }
}

export class RedactionSecurityError extends Error {
  readonly code = 'REDACTION_SECURITY_VIOLATION';

  constructor(message: string) {
    super(message);
    this.name = 'RedactionSecurityError';
    Object.setPrototypeOf(this, RedactionSecurityError.prototype);
  }
}
