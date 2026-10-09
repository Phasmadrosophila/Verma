/**
 * Vault Session & Lock Types
 */

export interface IVaultLockProvider {
  isUnlocked(): boolean;
}

export interface VaultSessionState {
  isUnlocked: boolean;
  unlockedAt?: number;
  lockedAt?: number;
}
