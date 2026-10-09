export type LockStatus = 'locked' | 'unlocked' | 'uninitialized';

export interface LockStateInfo {
  status: LockStatus;
  isLocked: boolean;
  isInitialized: boolean;
  lastUnlockedAt?: number;
}
