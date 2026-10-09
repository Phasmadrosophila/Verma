import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVault } from '../VaultContext';
import { api } from '../api';
import { Shield } from 'lucide-react';

import { Button } from '../components/primitives/Button';
import { InputField } from '../components/primitives/InputField';
import { LoadingState } from '../components/primitives/LoadingState';

export const LockScreen = () => {
  const { isInitialized, checkStatus, status } = useVault();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!isInitialized) {
        await api.initVault(password);
      } else {
        await api.unlockVault(password);
      }
      await checkStatus();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <LoadingState
        fullPage
        title="Checking vault lock state..."
        description="Reading local encrypted store on this device."
      />
    );
  }

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-[var(--color-canvas)] text-[var(--color-text)] p-4">
      <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-8 shadow-xs">
        <div className="flex flex-col items-center mb-8">
          <Shield className="w-12 h-12 text-[var(--color-brand-orange)] mb-4" />
          <h1 className="text-section-title text-center">Verma</h1>
          <p className="text-body text-[var(--color-text-muted)] text-center mt-2">
            What matters, stays with you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <InputField
            label={!isInitialized ? 'Set Master Password' : 'Enter Master Password'}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            description="Your master password encrypts the vault key locally."
          />

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-[var(--radius-sm)]">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !password}
            isLoading={isLoading}
            className="w-full mt-2"
          >
            {!isInitialized ? 'Initialize Vault' : 'Unlock Vault'}
          </Button>
        </form>
        
        {isInitialized && (
          <div className="mt-6 p-4 rounded-[var(--radius-md)] bg-[var(--color-assist-surface)]">
            <p className="text-label text-center">
              Your vault is locked. AI metadata access has been revoked. Unlock to continue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
