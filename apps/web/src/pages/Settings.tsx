import React, { useState } from 'react';
import { Shield, Smartphone, Sliders, Info, Check, Lock } from 'lucide-react';
import { SyncStatusBadge } from '../components/SyncStatusBadge';
import { StatusBanner } from '../components/StatusBanner';

export const Settings: React.FC = () => {
  const [autoLockMinutes, setAutoLockMinutes] = useState('15');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveAutoLock = (val: string) => {
    setAutoLockMinutes(val);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-12">
      {/* Page Heading */}
      <div className="border-b border-[var(--color-border)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">Settings</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Manage your local vault security, direct sync preferences, and device boundaries.
          </p>
        </div>
        <SyncStatusBadge mode="local" />
      </div>

      {savedNotice && (
        <StatusBanner
          variant="success"
          title="Settings updated"
          description="Your vault preferences were saved on this device."
        />
      )}

      {/* Section 1: Vault & Security */}
      <section
        aria-labelledby="security-heading"
        className="p-4 sm:p-6 rounded-[var(--radius-xl)] bg-[var(--color-paper)] border border-[var(--color-border)] shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-canvas)] flex items-center justify-center text-[var(--color-brand-orange)]">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 id="security-heading" className="text-base font-semibold text-[var(--color-text)]">
              Vault & Security
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Control when your vault locks and review your offline recovery safeguards.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <label htmlFor="auto-lock-select" className="text-sm font-medium text-[var(--color-text)]">
            Auto-lock timeout
          </label>
          <select
            id="auto-lock-select"
            value={autoLockMinutes}
            onChange={(e) => handleSaveAutoLock(e.target.value)}
            className="w-full max-w-xs px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus-ring"
          >
            <option value="5">Lock after 5 minutes of inactivity</option>
            <option value="15">Lock after 15 minutes of inactivity</option>
            <option value="60">Lock after 1 hour of inactivity</option>
            <option value="never">Never lock automatically (not recommended)</option>
          </select>
          <p className="text-xs text-[var(--color-text-muted)]">
            Locking immediately hides all secret values and revokes local AI metadata access.
          </p>
        </div>

        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-canvas)] border border-[var(--color-border)] flex items-start gap-3 mt-2">
          <Shield className="w-5 h-5 text-[var(--color-brand-orange)] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[var(--color-text)] leading-relaxed">
            <span className="font-semibold">Recovery Guarantee: </span>
            Keep your recovery phrase somewhere you can access without this device. Verma has no
            central provider back door or server reset.
          </div>
        </div>
      </section>

      {/* Section 2: Direct Device Sync */}
      <section
        aria-labelledby="sync-heading"
        className="p-4 sm:p-6 rounded-[var(--radius-xl)] bg-[var(--color-paper)] border border-[var(--color-border)] shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-canvas)] flex items-center justify-center text-[var(--color-brand-periwinkle)]">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 id="sync-heading" className="text-base font-semibold text-[var(--color-text)]">
              Direct Device Sync
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Serverless, direct synchronization between paired devices.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-canvas)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-sm font-semibold text-[var(--color-text)] block">
              Paired Desktop Devices
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              Currently operating in local mode with 0 paired peer devices.
            </span>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--color-paper)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
            Local Only
          </span>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          Device sync operates directly between paired machines over encrypted local transport.
          No central server stores or handles your encrypted vault.
        </p>
      </section>

      {/* Section 3: Local AI & Privacy Boundaries */}
      <section
        aria-labelledby="ai-heading"
        className="p-4 sm:p-6 rounded-[var(--radius-xl)] bg-[var(--color-paper)] border border-[var(--color-border)] shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-assist-surface)] flex items-center justify-center text-[var(--color-brand-periwinkle)]">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 id="ai-heading" className="text-base font-semibold text-[var(--color-text)]">
              Local AI & Privacy Boundary
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              On-device assistance rules and metadata privacy boundaries.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-assist-surface)] border border-[var(--color-brand-periwinkle)]/40 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text)]">
            <Check className="w-4 h-4 text-green-700" />
            <span>Strict Zero Secret-Field Exposure Enforced in Code</span>
          </div>
          <p className="text-xs text-[var(--color-text)] leading-relaxed">
            Local AI runs completely on this machine with no network connection. It receives only
            task-specific redacted metadata (titles, domains, and tags). Passwords, note contents,
            and private keys are never sent to the model.
          </p>
        </div>
      </section>

      {/* Section 4: About Verma */}
      <section
        aria-labelledby="about-heading"
        className="p-4 sm:p-6 rounded-[var(--radius-xl)] bg-[var(--color-paper)] border border-[var(--color-border)] shadow-xs flex flex-col gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-canvas)] flex items-center justify-center text-[var(--color-brand-orange)]">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h2 id="about-heading" className="text-base font-semibold text-[var(--color-text)]">
              About Verma
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              A password manager you do not have to learn.
            </p>
          </div>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mt-1">
          Verma is an offline, local-first digital secrets manager with an on-device Local AI
          assistant and direct device-to-device synchronization. What matters, stays with you.
        </p>
      </section>
    </div>
  );
};
