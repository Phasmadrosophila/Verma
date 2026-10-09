import React, { useEffect, useCallback, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  Search,
  FileText,
  Database,
  Shield,
  Settings as SettingsIcon,
  Menu,
  X,
} from 'lucide-react';
import { useVault } from '../VaultContext';
import { api } from '../api';
import { SyncStatusBadge } from './SyncStatusBadge';
import clsx from 'clsx';

export const Layout: React.FC = () => {
  const { isLocked, checkStatus } = useVault();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setIsMobileMenuOpen(false);
  }

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

  const navItems = [
    {
      to: '/',
      label: 'All Items',
      icon: Database,
      end: true,
    },
    {
      to: '/ask',
      label: 'Ask Your Vault',
      icon: Search,
      shortcut: '⌘K',
      badgeColor: 'text-[var(--color-brand-periwinkle)]',
    },
    {
      to: '/import',
      label: 'Smart Import',
      icon: FileText,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: SettingsIcon,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[var(--color-canvas)] text-[var(--color-text)]">
      {/* Skip to Main Content Link for Keyboard Accessibility (AC-C-M0-04-02) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-brand-orange)] focus:text-[var(--color-text)] focus:rounded-md focus:font-semibold"
      >
        Skip to main content
      </a>

      {/* Top Mobile Bar (Narrow Viewports < 768px - AC-C-M0-04-04) */}
      <header
        aria-label="Mobile header"
        className="md:hidden flex items-center justify-between h-14 px-4 bg-[var(--color-paper)] border-b border-[var(--color-border)] flex-shrink-0 z-30"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--color-brand-orange)]" />
          <span className="font-semibold text-sm tracking-tight text-[var(--color-text)]">Verma</span>
        </div>

        <div className="flex items-center gap-2">
          <SyncStatusBadge mode="local" />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            className="p-2 rounded-lg text-[var(--color-text)] hover:bg-[var(--color-canvas)] focus-ring"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation drawer"
          className="md:hidden fixed inset-0 top-14 z-40 bg-black/40 backdrop-blur-xs flex flex-col"
        >
          <div className="bg-[var(--color-paper)] p-4 border-b border-[var(--color-border)] flex flex-col gap-2 shadow-xl animate-in slide-in-from-top-2 duration-150">
            <nav aria-label="Mobile menu links" className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors focus-ring',
                        isActive
                          ? 'bg-[var(--color-canvas)] text-[var(--color-text)] font-semibold'
                          : 'hover:bg-[var(--color-canvas)]/60 text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={clsx('w-4 h-4 flex-shrink-0', item.badgeColor)} />
                      <span>{item.label}</span>
                    </div>
                    {item.shortcut && (
                      <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-canvas)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                        {item.shortcut}
                      </kbd>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-[var(--color-border)] mt-2">
              <button
                type="button"
                onClick={handleLock}
                aria-label="Lock vault now"
                className="flex items-center justify-between w-full py-2.5 px-3 rounded-full bg-[var(--color-canvas)] hover:bg-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] transition-colors focus-ring"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Vault</span>
                </div>
                <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                  ⌘L
                </kbd>
              </button>
            </div>
          </div>
          <div
            className="flex-1"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Desktop Left Navigation (>= 768px - AC-C-M0-04-02 & AC-C-M0-04-04) */}
      <nav
        aria-label="Vault navigation"
        className="hidden md:flex md:w-60 flex-shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-paper)] p-4"
      >
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[var(--color-brand-orange)]" />
            <span className="text-interface-heading font-semibold">Verma</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center justify-between px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors focus-ring',
                    isActive
                      ? 'bg-[var(--color-canvas)] text-[var(--color-text)] font-semibold'
                      : 'hover:bg-[var(--color-canvas)]/60 text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className={clsx('w-4 h-4 flex-shrink-0', item.badgeColor)} />
                  <span>{item.label}</span>
                </div>
                {item.shortcut && (
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-canvas)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                    {item.shortcut}
                  </kbd>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Status & Lock Controls */}
        <div className="mt-auto pt-4 border-t border-[var(--color-border)] flex flex-col gap-3">
          <SyncStatusBadge mode="local" className="w-full justify-center" />

          <button
            type="button"
            onClick={handleLock}
            aria-label="Lock vault now"
            className="flex items-center justify-between w-full py-2 px-3 rounded-full bg-[var(--color-canvas)] hover:bg-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] transition-colors focus-ring"
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

      {/* Main Workspace (Guaranteed zero horizontal scroll - AC-C-M0-04-04) */}
      <main
        id="main-content"
        className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden bg-[var(--color-canvas)]"
      >
        <header className="hidden md:flex h-14 border-b border-[var(--color-border)] items-center justify-between px-6 flex-shrink-0 bg-[var(--color-paper)]">
          <div className="text-xs font-medium text-[var(--color-text-muted)]">
            Verma Desktop / Offline Vault
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-text-muted)] font-mono">
              AES-256-GCM Encrypted
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 pb-20 md:pb-6 min-w-0 max-w-full">
          <Outlet />
        </div>
      </main>

      {/* Compact Bottom Navigation for Narrow Mobile Viewports (< 768px - AC-C-M0-04-04) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--color-paper)] border-t border-[var(--color-border)] flex items-center justify-around py-1.5 px-2"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center p-1.5 min-w-[56px] rounded-lg text-[10px] font-medium transition-colors focus-ring',
                  isActive
                    ? 'text-[var(--color-brand-orange)] font-semibold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                )
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label === 'Ask Your Vault' ? 'Ask Vault' : item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
