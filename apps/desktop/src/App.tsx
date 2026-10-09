import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native';
const SafeAreaProvider = ({ children }: any) => <>{children}</>;
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
import { MobileVaultEntry } from './state/vaultStore';
import {
  ApiError,
  apiClient,
  EntryDraft,
  MobileEntryMetadata,
} from './state/apiClient';
import { colors, radii, spacing, typography } from './theme/tokens';

/** List metadata (secret-free) → the editable mobile entry shape. */
function metadataToEntry(m: MobileEntryMetadata): MobileVaultEntry {
  return {
    id: m.id,
    type: m.type,
    title: m.title,
    subtitle: m.subtitle,
    domain: m.domain,
    tags: m.tags,
    favorite: false, // not a backend concept; client-side only
    brand: m.brand,
    secret: '', // filled lazily on explicit reveal
    updated: m.updated,
  };
}

type LoadState = 'loading' | 'ready' | 'error';

export function App() {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [currentTab, setCurrentTab] = useState<NavTab>('vault');

  const [entries, setEntries] = useState<MobileVaultEntry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const loadEntries = useCallback(async () => {
    setLoadState('loading');
    setLoadError(null);
    try {
      const list = await apiClient.listEntries();
      setEntries(list.map(metadataToEntry));
      setLoadState('ready');
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Could not load your vault.';
      setLoadError(msg);
      setLoadState('error');
    }
  }, []);

  // Load the list once the user is onboarded and the vault is unlocked.
  useEffect(() => {
    if (hasOnboarded && !isLocked) {
      void loadEntries();
    }
  }, [hasOnboarded, isLocked, loadEntries]);

  const handleCopy = (label: string, _text: string) => {
    showToast(`Copied ${label} to clipboard`);
  };

  const toDraft = (
    data: Omit<MobileVaultEntry, 'id' | 'updated'> & { id?: string | number }
  ): EntryDraft => ({
    type: data.type,
    title: data.title,
    subtitle: data.subtitle,
    user: data.user,
    domain: data.domain,
    tags: data.tags,
    secret: data.secret,
  });

  const handleSaveEntry = async (
    data: Omit<MobileVaultEntry, 'id' | 'updated'> & { id?: string | number }
  ) => {
    try {
      if (data.id !== undefined) {
        await apiClient.updateEntry(String(data.id), toDraft(data));
        showToast(`Updated "${data.title}"`);
      } else {
        await apiClient.createEntry(toDraft(data));
        showToast(`Added "${data.title}" to vault`);
      }
      await loadEntries();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not save entry.');
    }
  };

  const handleDeleteEntry = async (id: string | number) => {
    const item = entries.find((e) => e.id === id);
    try {
      await apiClient.deleteEntry(String(id));
      showToast(`Deleted ${item?.title || 'item'}`);
      await loadEntries();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not delete entry.');
    }
  };

  const handleCommitImport = (_newItems: MobileVaultEntry[]) => {
    // Import is handled by its own screen; refresh the list afterwards.
    void loadEntries();
    showToast('Import complete');
    setCurrentTab('vault');
  };

  const handleLock = async () => {
    try {
      await apiClient.lockVault();
    } catch {
      // Lock the UI regardless; a failed network call must not keep us unlocked.
    }
    setEntries([]);
    setIsLocked(true);
  };

  // 1. Onboarding Flow
  if (!hasOnboarded) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="dark-content" />
        <WelcomeScreen onComplete={() => setHasOnboarded(true)} />
      </SafeAreaView>
    );
  }

  // 2. Locked State
  if (isLocked) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="dark-content" />
        <LockedScreen
          onUnlock={async (passphrase?: string) => {
            if (passphrase) {
              try {
                await apiClient.unlockVault(passphrase);
              } catch {
                // LockedScreen surfaces its own error; stay locked on failure.
                throw new Error('unlock-failed');
              }
            }
            setIsLocked(false);
          }}
        />
      </SafeAreaView>
    );
  }

  // 3. Main App Shell
  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" />

      <Header onLock={handleLock} syncActive={true} />

      <View style={styles.mainContent}>
        {currentTab === 'vault' && (
          <>
            {loadState === 'loading' && (
              <View style={styles.centerFill}>
                <ActivityIndicator color={colors.brandPeri} />
                <Text style={styles.centerText}>Loading your vault…</Text>
              </View>
            )}
            {loadState === 'error' && (
              <View style={styles.centerFill}>
                <Text style={styles.errorTitle}>Couldn’t reach your vault</Text>
                <Text style={styles.centerText}>{loadError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => void loadEntries()}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
            {loadState === 'ready' && (
              <VaultScreen
                entries={entries}
                onSelectEntry={(entry) => setSelectedEntry(entry)}
                onOpenAsk={() => setCurrentTab('ask')}
              />
            )}
          </>
        )}

        {currentTab === 'ask' && (
          <AskScreen
            entries={entries}
            onSelectEntry={(entry) => setSelectedEntry(entry)}
          />
        )}

        {currentTab === 'import' && (
          <ImportScreen onCommitImport={handleCommitImport} />
        )}

        {currentTab === 'devices' && <DevicesScreen onShowToast={showToast} />}
      </View>

      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onAddNew={() => {
          setEntryToEdit(null);
          setAddModalVisible(true);
        }}
      />

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
        onRevealSecret={(id) => apiClient.getEntrySecret(String(id))}
      />

      <AddEditModal
        visible={addModalVisible}
        entryToEdit={entryToEdit}
        onClose={() => {
          setAddModalVisible(false);
          setEntryToEdit(null);
        }}
        onSave={handleSaveEntry}
        onLoadSecret={(id) => apiClient.getEntrySecret(String(id))}
      />

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
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  centerText: {
    fontSize: typography.sizeSm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: typography.sizeLg,
    fontWeight: '700',
    color: colors.text,
  },
  retryBtn: {
    backgroundColor: colors.brandOrange,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radii.pill,
    marginTop: spacing.sm,
  },
  retryBtnText: {
    fontSize: typography.sizeSm,
    fontWeight: '700',
    color: colors.text,
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

function AppRoot() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

export default AppRoot;
