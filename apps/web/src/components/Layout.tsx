
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Lock, Search, FileText, Database, Shield } from 'lucide-react';
import { useVault } from '../VaultContext';
import { api } from '../api';
import clsx from 'clsx';

export const Layout = () => {
  const { isLocked, checkStatus } = useVault();
  const navigate = useNavigate();

  const handleLock = async () => {
    try {
      await api.lockVault();
      await checkStatus();
      navigate('/lock');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-canvas)] text-[var(--color-text)]">
      {/* Left Navigation */}
      <nav className="w-56 flex-shrink-0 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-paper)] p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
          <Shield className="w-6 h-6 text-[var(--color-brand-orange)]" />
          <span className="text-interface-heading">Verma</span>
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-body transition-colors',
                isActive ? 'bg-[var(--color-canvas)] font-medium' : 'hover:bg-[var(--color-canvas)]/50 text-[var(--color-text-muted)]'
              )
            }
          >
            <Database className="w-5 h-5" />
            All Items
          </NavLink>
          <NavLink
            to="/ask"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-body transition-colors',
                isActive ? 'bg-[var(--color-canvas)] font-medium' : 'hover:bg-[var(--color-canvas)]/50 text-[var(--color-text-muted)]'
              )
            }
          >
            <Search className="w-5 h-5" />
            Ask Your Vault
          </NavLink>
          <NavLink
            to="/import"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-body transition-colors',
                isActive ? 'bg-[var(--color-canvas)] font-medium' : 'hover:bg-[var(--color-canvas)]/50 text-[var(--color-text-muted)]'
              )
            }
          >
            <FileText className="w-5 h-5" />
            Smart Import
          </NavLink>
        </div>

        <div className="mt-auto pt-4 border-t border-[var(--color-border)] flex flex-col gap-4">
          <div className="text-label text-[var(--color-text-muted)] px-2">
            Local mode · Offline
          </div>
          
          <button
            onClick={handleLock}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-full bg-[var(--color-canvas)] text-body hover:bg-[var(--color-border)] transition-colors"
          >
            <Lock className="w-4 h-4" />
            {isLocked ? 'Locked' : 'Lock Vault'}
          </button>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-[var(--color-canvas)]">
        <header className="h-14 border-b border-[var(--color-border)] flex items-center px-6 flex-shrink-0 bg-[var(--color-paper)]">
          <div className="text-label text-[var(--color-text-muted)]">Verma / My Vault</div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
