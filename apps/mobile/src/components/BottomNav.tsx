import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

export type NavTab = 'vault' | 'ask' | 'import' | 'devices';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onAddNew: () => void;
}

interface NavItemProps {
  tab: NavTab;
  currentTab: NavTab;
  icon: string;
  label: string;
  onPress: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
  tab,
  currentTab,
  icon,
  label,
  onPress,
}) => {
  const isActive = currentTab === tab;
  const popAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    if (isActive) {
      popAnim.setValue(0);
      Animated.spring(popAnim, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } else {
      popAnim.setValue(0);
    }
  }, [isActive]);

  const scale = popAnim.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0.75, 1.18, 1],
  });

  const translateY = popAnim.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [4, -2, 0],
  });

  return (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.iconWrapper,
          isActive && styles.iconWrapperActive,
          isActive && { transform: [{ scale }, { translateY }] },
        ]}
      >
        <Text style={styles.tabIcon}>{icon}</Text>
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          isActive && styles.tabLabelActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onAddNew,
}) => {
  const addScale = useRef(new Animated.Value(1)).current;

  const handleAddNew = () => {
    Animated.sequence([
      Animated.timing(addScale, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(addScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
    onAddNew();
  };

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <NavItem
          tab="vault"
          currentTab={currentTab}
          icon="📁"
          label="Vault"
          onPress={() => onSelectTab('vault')}
        />

        <NavItem
          tab="ask"
          currentTab={currentTab}
          icon="✨"
          label="Ask"
          onPress={() => onSelectTab('ask')}
        />

        {/* Add Floating Pill/Circle */}
        <TouchableOpacity
          style={styles.addButtonWrapper}
          onPress={handleAddNew}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.addButton,
              { transform: [{ scale: addScale }] },
            ]}
          >
            <Text style={styles.addIcon}>＋</Text>
          </Animated.View>
          <Text style={styles.addLabel}>New item</Text>
        </TouchableOpacity>

        <NavItem
          tab="import"
          currentTab={currentTab}
          icon="📥"
          label="Import"
          onPress={() => onSelectTab('import')}
        />

        <NavItem
          tab="devices"
          currentTab={currentTab}
          icon="💻"
          label="Devices"
          onPress={() => onSelectTab('devices')}
        />
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
