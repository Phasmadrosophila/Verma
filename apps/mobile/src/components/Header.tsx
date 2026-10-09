import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { Icon } from './Icon';

interface HeaderProps {
  onLock: () => void;
  /** When false, shows the "Vault locked" state in the status pill. */
  syncActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onLock, syncActive = true }) => {
  const unlocked = syncActive;
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Text style={styles.wordmark}>
          Verma<Text style={styles.wordmarkDot}>.</Text>
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <View style={styles.statusPill}>
          <Icon name={unlocked ? 'shield' : 'lock'} size={14} color={colors.text} />
          <Text style={styles.statusText}>
            {unlocked ? 'On your device' : 'Vault locked'}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityLabel="Lock vault"
          accessibilityRole="button"
          onPress={onLock}
          style={styles.lockButton}
          activeOpacity={0.8}
        >
          <Icon name="lock" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.brandOrange,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 81,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 31,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.5,
  },
  wordmarkDot: {
    color: colors.paper,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.21)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radii.pill,
    gap: 5,
    minHeight: 33,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.text,
  },
  lockButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
