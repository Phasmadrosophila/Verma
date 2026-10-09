/* eslint-disable react/only-export-components, react/set-state-in-effect */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LockStatus } from '@app/shared';
import { api } from './api';

export interface VaultContextType {
  status: LockStatus | 'loading';
  isLocked: boolean;
  isInitialized: boolean;
  checkStatus: () => Promise<void>;
}

export const VaultContext = createContext<VaultContextType | null>(null);

export const VaultProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<LockStatus | 'loading'>('loading');
  const [isLocked, setIsLocked] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const checkStatus = async () => {
    try {
      // E2E only: makes the otherwise sub-frame startup state observable without
      // changing production behavior or API timing.
      const delayMs = Number(import.meta.env.VITE_E2E_STATUS_DELAY_MS ?? '0');
      if (delayMs > 0) await new Promise((resolvePromise) => setTimeout(resolvePromise, delayMs));
      const data = await api.getVaultStatus();
      setStatus(data.status);
      setIsLocked(data.isLocked);
      setIsInitialized(data.isInitialized);
    } catch (err) {
      console.error('Failed to fetch vault status', err);
    }
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
