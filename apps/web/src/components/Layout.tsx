import { useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Lock, Search, FileText, Database, Shield } from 'lucide-react';
import { useVault } from '../VaultContext';
import { api } from '../api';
import { SyncStatusBadge } from './SyncStatusBadge';
import clsx from 'clsx';

export const Layout = () => {
  const { isLocked, checkStatus } = useVault();
  const navigate = useNavigate();

  const handleLock = useCallback(async () => {
    try {
      await api.lockVault();
      await checkStatus();
      navigate('/lock');
    } catch (err) {
      console.error(err);
    }
  }, [checkStatus, navigate]);

  // Keyboard navigation shortcuts: Cmd/Ctrl+K (Ask) and Cmd/Ctrl+L (Lock)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate('/ask');
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleLock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, handleLock]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-canvas)] text-[var(--color-text)]">
      {/* Skip to Main Content Link for Keyboard Accessibility (AC-C-M0-03-04) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-brand-orange)] focus:text-[var(--color-text)] focus:rounded-md focus:font-semibold"
      >
        Skip to main content
      </a>

      {/* Left Navigation */}
      <nav
        aria-label="Vault navigation"
        className="w-60 flex-shrink-0 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-paper)] p-4"
      >
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[var(--color-brand-orange)]" />
            <span className="text-interface-heading font-semibold">Verma</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1.5">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              clsx(
                'flex items-center justify-between px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors focus:ring-2 focus:ring-[var(--color-brand-orange)]',
                isActive
                  ? 'bg-[var(--color-canvas)] text-[var(--color-text)] font-semibold'
                  : 'hover:bg-[var(--color-canvas)]/60 text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              )
            }
          >
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 flex-shrink-0" />
              <span>All Items</span>
            </div>
          </NavLink>

          <NavLink
            to="/ask"
            className={({ isActive }) =>
              clsx(
                'flex items-center justify-between px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors focus:ring-2 focus:ring-[var(--color-brand-orange)]',
                isActive
                  ? 'bg-[var(--color-canvas)] text-[var(--color-text)] font-semibold'
                  : 'hover:bg-[var(--color-canvas)]/60 text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              )
            }
          >
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4 flex-shrink-0 text-[var(--color-brand-periwinkle)]" />
              <span>Ask Your Vault</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-canvas)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
              ⌘K
            </kbd>
          </NavLink>

          <NavLink
            to="/import"
            className={({ isActive }) =>
              clsx(
                'flex items-center justify-between px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors focus:ring-2 focus:ring-[var(--color-brand-orange)]',
                isActive
                  ? 'bg-[var(--color-canvas)] text-[var(--color-text)] font-semibold'
                  : 'hover:bg-[var(--color-canvas)]/60 text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              )
            }
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>Smart Import</span>
            </div>
          </NavLink>
        </div>

        {/* Bottom Status & Lock Controls */}
        <div className="mt-auto pt-4 border-t border-[var(--color-border)] flex flex-col gap-3">
          <SyncStatusBadge mode="local" className="w-full justify-center" />

          <button
            type="button"
            onClick={handleLock}
            aria-label="Lock vault now"
            className="flex items-center justify-between w-full py-2 px-3 rounded-full bg-[var(--color-canvas)] hover:bg-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] transition-colors focus:ring-2 focus:ring-[var(--color-brand-orange)]"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              <span>{isLocked ? 'Locked' : 'Lock Vault'}</span>
            </div>
            <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
              ⌘L
            </kbd>
          </button>
        </div>
      </nav>

      {/* Main Workspace */}
      <main
        id="main-content"
        className="flex-1 flex flex-col min-w-0 bg-[var(--color-canvas)] overflow-hidden"
      >
        <header className="h-14 border-b border-[var(--color-border)] flex items-center justify-between px-6 flex-shrink-0 bg-[var(--color-paper)]">
          <div className="text-xs font-medium text-[var(--color-text-muted)]">
            Verma Desktop / Offline Vault
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-text-muted)]">AES-256-GCM Encrypted</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
