import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVault } from '../VaultContext';
import { api } from '../api';
import { Shield, AlertTriangle } from 'lucide-react';

import { Button } from '../components/primitives/Button';
import { InputField } from '../components/primitives/InputField';
import { LoadingState } from '../components/primitives/LoadingState';

export const LockScreen: React.FC = () => {
  const { isInitialized, checkStatus, status } = useVault();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Vault creation flow states
  const [creationStep, setCreationStep] = useState<'password' | 'recovery' | 'confirm'>('password');
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[]>([]);

  const DUMMY_PHRASE = "abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual".split(" ");

  const handleInitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryPhrase(DUMMY_PHRASE);
    setCreationStep('recovery');
  };

  const confirmRecovery = async () => {
    setError('');
    setIsLoading(true);
    try {
      await api.initVault(password);
      await checkStatus();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Initialization failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.unlockVault(password);
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

  // RECOVERY PHRASE FLOW
  if (!isInitialized && creationStep === 'recovery') {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-[var(--color-canvas)] text-[var(--color-text)] p-4">
        <div className="w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-6 sm:p-8 shadow-xs">
          <h1 className="text-section-title text-center text-[var(--color-brand-orange)] mb-4">Your Recovery Phrase</h1>
          
          <div className="flex items-start gap-3 p-4 mb-6 rounded-md bg-orange-50/10 border border-[var(--color-brand-orange)]">
            <AlertTriangle className="text-[var(--color-brand-orange)] shrink-0 w-5 h-5" aria-hidden="true" />
            <p className="text-sm">
              Write down these 24 words in exact order. <strong>We cannot recover your vault if you lose this phrase.</strong> Do not screenshot this.
            </p>
          </div>

          <ol
            aria-label="24-word recovery phrase"
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-8"
          >
            {recoveryPhrase.map((word, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 p-2 bg-[var(--color-assist-surface)] rounded-[var(--radius-sm)] border border-[var(--color-border)]"
              >
                <span className="text-[var(--color-text-muted)] select-none w-5 text-right text-xs">
                  {idx + 1}.
                </span>
                <span className="font-mono font-medium text-xs sm:text-sm">{word}</span>
              </li>
            ))}
          </ol>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
            <Button variant="secondary" onClick={() => setCreationStep('password')}>Back</Button>
            <Button onClick={() => setCreationStep('confirm')}>I have saved these words</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized && creationStep === 'confirm') {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-[var(--color-canvas)] text-[var(--color-text)] p-4">
        <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-6 sm:p-8 shadow-xs">
          <h1 className="text-section-title text-center mb-6">Confirm Recovery</h1>
          <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
            Are you sure you have securely stored your recovery phrase?
          </p>
          
          {error && (
            <div role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-[var(--radius-sm)] mb-4">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button 
              onClick={confirmRecovery} 
              disabled={isLoading}
              isLoading={isLoading}
            >
              Confirm and Create Vault
            </Button>
            <Button variant="secondary" onClick={() => setCreationStep('recovery')} disabled={isLoading}>
              Back to Phrase
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // STANDARD PASSWORD PROMPT
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-[var(--color-canvas)] text-[var(--color-text)] p-4">
      <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col items-center mb-8">
          <Shield className="w-12 h-12 text-[var(--color-brand-orange)] mb-4" />
          <h1 className="text-section-title text-center">Verma</h1>
          <p className="text-body text-[var(--color-text-muted)] text-center mt-2">
            What matters, stays with you.
          </p>
        </div>

        <form onSubmit={!isInitialized ? handleInitSubmit : handleUnlockSubmit} className="flex flex-col gap-4">
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
            <div role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-[var(--radius-sm)]">
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
