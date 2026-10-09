import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AddEditModal } from './components/AddEditModal';
import { BottomNav, NavTab } from './components/BottomNav';
import { DetailModal } from './components/DetailModal';
import { Header } from './components/Header';
import { AskScreen } from './screens/AskScreen';
import { DevicesScreen } from './screens/DevicesScreen';
import { ImportScreen } from './screens/ImportScreen';
import { LockedScreen } from './screens/LockedScreen';
import { SetupScreen } from './screens/SetupScreen';
import { VaultScreen } from './screens/VaultScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { mobileApi } from './state/apiClient';
import {
  MobileVaultEntry,
  seedEntries,
} from './state/vaultStore';
import { colors, radii, spacing, typography } from './theme/tokens';

export function App() {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [hasSetup, setHasSetup] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [currentTab, setCurrentTab] = useState<NavTab>('vault');
  const [entries, setEntries] = useState<MobileVaultEntry[]>(seedEntries);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Modals state
  const [selectedEntry, setSelectedEntry] = useState<MobileVaultEntry | null>(null);
  const [entryToEdit, setEntryToEdit] = useState<MobileVaultEntry | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Toast state
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev));
    }, 2800);
  };

  // Sync with backend API on mount
  useEffect(() => {
    let isMounted = true;

    async function syncBackendState() {
      const isHealthy = await mobileApi.checkHealth();
      if (!isMounted) return;

      if (isHealthy) {
        setIsBackendConnected(true);
        const statusRes = await mobileApi.getVaultStatus();
        if (!isMounted) return;

        if (statusRes.success && statusRes.data) {
          if (!statusRes.data.isInitialized) {
            setHasSetup(false);
            setHasOnboarded(true);
          } else if (statusRes.data.isLocked) {
            setIsLocked(true);
            setHasSetup(true);
            setHasOnboarded(true);
          } else {
            setIsLocked(false);
            setHasSetup(true);
            setHasOnboarded(true);
            // Fetch metadata list (strictly zero secrets)
            const listRes = await mobileApi.listEntries();
            if (isMounted && listRes.success && listRes.data && listRes.data.length > 0) {
              setEntries(listRes.data);
            }
          }
        }
      } else {
        setIsBackendConnected(false);
      }
    }

    syncBackendState();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopy = (label: string, text: string) => {
    showToast(`Copied ${label} to clipboard`);
  };

  const handleSetupComplete = async (password?: string, action?: 'import' | 'open') => {
    if (isBackendConnected && password) {
      const res = await mobileApi.initVault(password);
      if (!res.success && res.error) {
        showToast(res.error);
      }
    }
    setHasSetup(true);
    if (action === 'import') {
      setCurrentTab('import');
    } else {
      setCurrentTab('vault');
    }
  };

  const handleUnlock = async (passphrase?: string) => {
    if (isBackendConnected && passphrase) {
      const res = await mobileApi.unlockVault(passphrase);
      if (!res.success) {
        return { success: false, error: res.error || 'Invalid master credentials' };
      }
      // Populate entries upon successful unlock
      const listRes = await mobileApi.listEntries();
      if (listRes.success && listRes.data) {
        setEntries(listRes.data);
      }
      setIsLocked(false);
      return { success: true };
    }
    // Offline local fallback
    setIsLocked(false);
    return { success: true };
  };

  const handleLock = async () => {
    if (isBackendConnected) {
      await mobileApi.lockVault();
    }
    setIsLocked(true);
  };

  const handleRevealSecret = async (entry: MobileVaultEntry): Promise<string> => {
    if (isBackendConnected) {
      const res = await mobileApi.getEntry(entry.id);
      if (res.success && res.data?.secret) {
        // Update local secret in state cache
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, secret: res.data!.secret } : e))
        );
        return res.data.secret;
      }
    }
    return entry.secret || '••••••••';
  };

  const handleAskLocalAi = async (query: string) => {
    if (isBackendConnected) {
      const res = await mobileApi.askVault(query);
      if (res.success && res.data) {
        return res.data;
      }
    }
    return null;
  };

  const handleSaveEntry = async (
    data: Omit<MobileVaultEntry, 'id' | 'updated'> & { id?: string | number }
  ) => {
    if (data.id !== undefined) {
      if (isBackendConnected) {
        const res = await mobileApi.updateEntry(data.id, data);
        if (res.success && res.data) {
          setEntries((prev) => prev.map((e) => (e.id === data.id ? res.data! : e)));
          showToast(`Updated "${data.title}"`);
          return;
        }
      }
      setEntries((prev) =>
        prev.map((e) =>
          e.id === data.id
            ? { ...e, ...data, id: e.id, updated: 'Just now' }
            : e
        )
      );
      showToast(`Updated "${data.title}"`);
    } else {
      if (isBackendConnected) {
        const res = await mobileApi.createEntry(data);
        if (res.success && res.data) {
          setEntries((prev) => [res.data!, ...prev]);
          showToast(`Added "${data.title}" to vault`);
          return;
        }
      }
      const newEntry: MobileVaultEntry = {
        ...data,
        id: Date.now(),
        updated: 'Just now',
      };
      setEntries((prev) => [newEntry, ...prev]);
      showToast(`Added "${data.title}" to vault`);
    }
  };

  const handleDeleteEntry = async (id: string | number) => {
    const item = entries.find((e) => e.id === id);
    if (isBackendConnected) {
      await mobileApi.deleteEntry(id);
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    showToast(`Deleted ${item?.title || 'item'}`);
  };

  const handleCommitImport = (newItems: MobileVaultEntry[]) => {
    setEntries((prev) => [...newItems, ...prev]);
    showToast(`Successfully imported ${newItems.length} items`);
    setCurrentTab('vault');
  };

  // 1. Onboarding Flow
  if (!hasOnboarded) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
        <WelcomeScreen onComplete={() => setHasOnboarded(true)} />
      </SafeAreaView>
    );
  }

  // 2. Setup Flow
  if (!hasSetup) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
        <SetupScreen onSetupComplete={handleSetupComplete} />
      </SafeAreaView>
    );
  }

  // 3. Locked State
  if (isLocked) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
        <LockedScreen onUnlock={handleUnlock} />
      </SafeAreaView>
    );
  }

  // 4. Main App Shell
  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.brandOrange} />

      {/* Top Header */}
      <Header
        onLock={handleLock}
        syncActive={true}
        backendConnected={isBackendConnected}
      />

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {currentTab === 'vault' && (
          <VaultScreen
            entries={entries}
            onSelectEntry={(entry) => setSelectedEntry(entry)}
            onOpenAsk={() => setCurrentTab('ask')}
          />
        )}

        {currentTab === 'ask' && (
          <AskScreen
            entries={entries}
            onSelectEntry={(entry) => setSelectedEntry(entry)}
            onAskLocalAi={handleAskLocalAi}
          />
        )}

        {currentTab === 'import' && (
          <ImportScreen onCommitImport={handleCommitImport} />
        )}

        {currentTab === 'devices' && (
          <DevicesScreen onShowToast={showToast} />
        )}
      </View>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onAddNew={() => {
          setEntryToEdit(null);
          setAddModalVisible(true);
        }}
      />

      {/* Entry Detail Sheet */}
      <DetailModal
        entry={selectedEntry}
        visible={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
        onEdit={(entry) => {
          setSelectedEntry(null);
          setEntryToEdit(entry);
          setAddModalVisible(true);
        }}
        onDelete={handleDeleteEntry}
        onCopy={handleCopy}
        onReveal={handleRevealSecret}
      />

      {/* Add / Edit Sheet */}
      <AddEditModal
        visible={addModalVisible}
        entryToEdit={entryToEdit}
        onClose={() => {
          setAddModalVisible(false);
          setEntryToEdit(null);
        }}
        onSave={handleSaveEntry}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <View style={styles.toastContainer} pointerEvents="none">
          <View style={styles.toastPill}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.brandOrange,
  },
  mainContent: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 85,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastPill: {
    backgroundColor: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.pill,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  toastText: {
    color: colors.paper,
    fontSize: typography.sizeSm,
    fontWeight: '700',
  },
});

export default App;
