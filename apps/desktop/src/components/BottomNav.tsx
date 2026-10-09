import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

export type NavTab = 'vault' | 'ask' | 'import' | 'devices';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onAddNew: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onAddNew,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {/* Vault Tab */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => onSelectTab('vault')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconWrapper,
              currentTab === 'vault' && styles.iconWrapperActive,
            ]}
          >
            <Text style={styles.tabIcon}>📁</Text>
          </View>
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'vault' && styles.tabLabelActive,
            ]}
          >
            Vault
          </Text>
        </TouchableOpacity>

        {/* Ask Tab */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => onSelectTab('ask')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconWrapper,
              currentTab === 'ask' && styles.iconWrapperActive,
            ]}
          >
            <Text style={styles.tabIcon}>✨</Text>
          </View>
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'ask' && styles.tabLabelActive,
            ]}
          >
            Ask
          </Text>
        </TouchableOpacity>

        {/* Add Floating Pill/Circle */}
        <TouchableOpacity
          style={styles.addButtonWrapper}
          onPress={onAddNew}
          activeOpacity={0.8}
        >
          <View style={styles.addButton}>
            <Text style={styles.addIcon}>＋</Text>
          </View>
          <Text style={styles.addLabel}>New item</Text>
        </TouchableOpacity>

        {/* Import Tab */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => onSelectTab('import')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconWrapper,
              currentTab === 'import' && styles.iconWrapperActive,
            ]}
          >
            <Text style={styles.tabIcon}>📥</Text>
          </View>
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'import' && styles.tabLabelActive,
            ]}
          >
            Import
          </Text>
        </TouchableOpacity>

        {/* Devices Tab */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => onSelectTab('devices')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconWrapper,
              currentTab === 'devices' && styles.iconWrapperActive,
            ]}
          >
            <Text style={styles.tabIcon}>💻</Text>
          </View>
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'devices' && styles.tabLabelActive,
            ]}
          >
            Devices
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
  },
  navBar: {
    backgroundColor: colors.brandPeri,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: spacing.sm,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  iconWrapper: {
    width: 38,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: colors.surface,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.text,
    marginTop: 3,
  },
  tabLabelActive: {
    fontWeight: '800',
  },
  addButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.brandOrange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  addIcon: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '700',
    lineHeight: 26,
  },
  addLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
});
