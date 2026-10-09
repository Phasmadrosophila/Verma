import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { Icon, IconName } from './Icon';

export type NavTab = 'vault' | 'ask' | 'import' | 'devices';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onAddNew: () => void;
}

const TABS: { tab: NavTab; label: string; icon: IconName }[] = [
  { tab: 'vault', label: 'My vault', icon: 'vault' },
  { tab: 'ask', label: 'Ask Verma', icon: 'spark' },
  { tab: 'import', label: 'Import', icon: 'import' },
  { tab: 'devices', label: 'Devices', icon: 'devices' },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onAddNew,
}) => {
  const navButton = ({ tab, label, icon }: (typeof TABS)[number]) => {
    const active = currentTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        style={styles.navButton}
        onPress={() => onSelectTab(tab)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        activeOpacity={0.7}
      >
        <View style={[styles.navIcon, active && styles.navIconActive]}>
          <Icon name={icon} size={20} color={colors.text} />
        </View>
        <Text style={styles.navLabel}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.navBar}>
      {navButton(TABS[0])}
      {navButton(TABS[1])}

      <TouchableOpacity
        style={styles.navButton}
        onPress={onAddNew}
        accessibilityLabel="Add new item"
        accessibilityRole="button"
        activeOpacity={0.8}
      >
        <View style={styles.addIcon}>
          <Icon name="plus" size={22} color={colors.text} />
        </View>
        <Text style={styles.navLabel}>New item</Text>
      </TouchableOpacity>

      {navButton(TABS[2])}
      {navButton(TABS[3])}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    backgroundColor: colors.brandPeri,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: spacing.md,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 5,
    minWidth: 54,
    minHeight: 52,
  },
  navIcon: {
    width: 39,
    height: 28,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconActive: {
    backgroundColor: colors.surface,
  },
  navLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  addIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.brandOrange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: colors.surface,
    marginTop: -17,
  },
});
