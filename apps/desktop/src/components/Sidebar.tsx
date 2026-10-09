import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

export type NavTab = 'vault' | 'ask' | 'import' | 'devices';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onAddNew: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onAddNew,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>Verma</Text>
      </View>
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.addButtonWrapper}
          onPress={onAddNew}
          activeOpacity={0.8}
        >
          <View style={styles.addButton}>
            <Text style={styles.addIcon}>＋</Text>
            <Text style={styles.addLabel}>New Item</Text>
          </View>
        </TouchableOpacity>

        {/* Vault Tab */}
        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'vault' && styles.tabButtonActive]}
          onPress={() => onSelectTab('vault')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>📁</Text>
          <Text style={[styles.tabLabel, currentTab === 'vault' && styles.tabLabelActive]}>
            Vault
          </Text>
        </TouchableOpacity>

        {/* Ask Tab */}
        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'ask' && styles.tabButtonActive]}
          onPress={() => onSelectTab('ask')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>✨</Text>
          <Text style={[styles.tabLabel, currentTab === 'ask' && styles.tabLabelActive]}>
            Ask AI
          </Text>
        </TouchableOpacity>

        {/* Import Tab */}
        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'import' && styles.tabButtonActive]}
          onPress={() => onSelectTab('import')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>📥</Text>
          <Text style={[styles.tabLabel, currentTab === 'import' && styles.tabLabelActive]}>
            Import
          </Text>
        </TouchableOpacity>

        {/* Devices Tab */}
        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'devices' && styles.tabButtonActive]}
          onPress={() => onSelectTab('devices')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>💻</Text>
          <Text style={[styles.tabLabel, currentTab === 'devices' && styles.tabLabelActive]}>
            Devices
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 220,
    backgroundColor: colors.brandPeri,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  logoText: {
    fontSize: typography.sizeXl,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'Fredoka',
  },
  navBar: {
    flex: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: typography.sizeMd,
    fontWeight: '500',
    color: colors.text,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  addButtonWrapper: {
    marginBottom: spacing.xl,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandOrange,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  addIcon: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '700',
  },
  addLabel: {
    fontSize: typography.sizeMd,
    fontWeight: '700',
    color: colors.text,
  },
});
