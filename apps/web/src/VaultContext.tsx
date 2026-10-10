/* eslint-disable react/only-export-components, react/set-state-in-effect */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LockStatus } from '@app/shared';
import { api, type VaultStatusResponse } from './api';

export type VaultStatus = LockStatus | 'loading' | 'unavailable';

export interface VaultState {
  status: VaultStatus;
  isLocked: boolean;
  isInitialized: boolean;
}

export interface VaultContextType extends VaultState {
  checkStatus: () => Promise<void>;
}

/**
 * Resolves the next vault state from a status fetch, never rejecting.
 *
 * A failed status request (network error, non-JSON HTML fallback, 5xx, ...)
 * resolves to an explicit 'unavailable' state instead of leaving the UI
 * spinning in 'loading' forever. `isLocked`/`isInitialized` stay false so no
 * protected route can be entered while the backend is unreachable.
 */
export const loadVaultState = async (
  getStatus: () => Promise<VaultStatusResponse>
): Promise<VaultState> => {
  try {
    const data = await getStatus();
    return {
      status: data.status,
      isLocked: data.isLocked,
      isInitialized: data.isInitialized,
    };
  } catch (err) {
    console.error('Failed to fetch vault status', err);
    return { status: 'unavailable', isLocked: false, isInitialized: false };
  }
};

export const VaultContext = createContext<VaultContextType | null>(null);

export const VaultProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<VaultStatus>('loading');
  const [isLocked, setIsLocked] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const checkStatus = async () => {
    const next = await loadVaultState(api.getVaultStatus);
    setStatus(next.status);
    setIsLocked(next.isLocked);
    setIsInitialized(next.isInitialized);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <VaultContext.Provider value={{ status, isLocked, isInitialized, checkStatus }}>
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within VaultProvider');
  return ctx;
};