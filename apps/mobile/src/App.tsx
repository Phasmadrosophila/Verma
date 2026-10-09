import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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

  // Modals state
  const [selectedEntry, setSelectedEntry] = useState<MobileVaultEntry | null>(null);
  const [entryToEdit, setEntryToEdit] = useState<MobileVaultEntry | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Toast state
  const [toast, setToast] = useState<string | null>(null);

  const tabAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    tabAnim.setValue(0);
    Animated.spring(tabAnim, {
      toValue: 1,
      friction: 5,
      tension: 65,
      useNativeDriver: true,
    }).start();
  }, [currentTab]);

  const contentTranslateY = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const contentScale = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const contentOpacity = tabAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1, 1],
  });

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev));
    }, 2800);
  };

  const handleCopy = (label: string, text: string) => {
    showToast(`Copied ${label} to clipboard`);
  };

  const handleSaveEntry = (
    data: Omit<MobileVaultEntry, 'id' | 'updated'> & { id?: number }
  ) => {
    if (data.id) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === data.id
            ? { ...e, ...data, id: e.id, updated: 'Just now' }
            : e
        )
      );
      showToast(`Updated "${data.title}"`);
    } else {
      const newEntry: MobileVaultEntry = {
        ...data,
        id: Date.now(),
        updated: 'Just now',
      };
      setEntries((prev) => [newEntry, ...prev]);
      showToast(`Added "${data.title}" to vault`);
    }
  };

  const handleDeleteEntry = (id: number) => {
    const item = entries.find((e) => e.id === id);
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
        <SetupScreen onSetupComplete={() => setHasSetup(true)} />
      </SafeAreaView>
    );
  }

  // 3. Locked State
  if (isLocked) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
        <LockedScreen onUnlock={() => setIsLocked(false)} />
      </SafeAreaView>
    );
  }

  // 4. Main App Shell
  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.brandOrange} />

      {/* Top Header */}
      <Header onLock={() => setIsLocked(true)} syncActive={true} />

      {/* Main Content Area */}
      <Animated.View
        style={[
          styles.mainContent,
          {
            opacity: contentOpacity,
            transform: [
              { translateY: contentTranslateY },
              { scale: contentScale },
            ],
          },
        ]}
      >
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
          />
        )}

        {currentTab === 'import' && (
          <ImportScreen onCommitImport={handleCommitImport} />
        )}

        {currentTab === 'devices' && (
          <DevicesScreen onShowToast={showToast} />
        )}
      </Animated.View>

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
