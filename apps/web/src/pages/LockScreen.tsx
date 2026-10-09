import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVault } from '../VaultContext';
import { api } from '../api';
import { Shield } from 'lucide-react';

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
    return <div className="flex h-screen items-center justify-center bg-[var(--color-canvas)] text-body">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-[var(--color-canvas)] text-[var(--color-text)] p-4">
      <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-8 shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <Shield className="w-12 h-12 text-[var(--color-brand-orange)] mb-4" />
          <h1 className="text-section-title text-center">Verma</h1>
          <p className="text-body text-[var(--color-text-muted)] text-center mt-2">
            What matters, stays with you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-label text-[var(--color-text)]">
              {!isInitialized ? 'Set Master Password' : 'Enter Master Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-body focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="text-label text-red-600 bg-red-50 p-2 rounded-[var(--radius-sm)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="mt-4 px-4 py-2 rounded-full bg-[var(--color-brand-orange)] text-[var(--color-text)] font-semibold text-body hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {!isInitialized ? 'Initialize Vault' : 'Unlock Vault'}
          </button>
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
