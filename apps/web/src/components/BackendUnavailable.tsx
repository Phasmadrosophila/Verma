import React from 'react';
import { ErrorState } from './primitives/ErrorState';

export interface BackendUnavailableProps {
  onRetry: () => void;
}

/**
 * Full-screen "vault backend offline" state shown when the status fetch fails.
 *
 * Replaces the previous behavior of spinning in 'loading' forever. The Retry
 * button re-runs the vault status check.
 */
export const BackendUnavailable: React.FC<BackendUnavailableProps> = ({ onRetry }) => {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[var(--color-canvas)] p-4">
      <ErrorState
        title="Vault backend offline"
        description="Verma could not reach the vault service. Your data remains safe on this device. Check that the vault backend is running, then try again."
        action={{ label: 'Retry', onClick: onRetry }}
      />
    </div>
  );
};