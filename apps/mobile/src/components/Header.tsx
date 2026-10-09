import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface HeaderProps {
  onLock: () => void;
  syncActive?: boolean;
  backendConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onLock,
  syncActive = true,
  backendConnected = false,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>V</Text>
        </View>
        <Text style={styles.wordmark}>
          Verma<Text style={styles.wordmarkDot}>.</Text>
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <View style={styles.syncBadge}>
          <View
            style={[
              styles.syncDot,
              (syncActive || backendConnected) && styles.syncDotActive,
            ]}
          />
          <Text style={styles.syncText}>
            {backendConnected ? 'Backend linked' : 'Direct sync'}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityLabel="Lock Vault"
          accessibilityRole="button"
          onPress={onLock}
          style={styles.lockButton}
          activeOpacity={0.8}
        >
          <Text style={styles.lockIcon}>🔒</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.brandOrange,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    fontSize: typography.sizeLg,
    fontWeight: '800',
    color: colors.brandOrange,
  },
  wordmark: {
    fontSize: typography.sizeXxl,
    fontWeight: '700',
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
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    gap: 6,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: '#C5B5A3',
  },
  syncDotActive: {
    backgroundColor: '#2E8540',
  },
  syncText: {
    fontSize: typography.sizeXs,
    fontWeight: '600',
    color: colors.text,
  },
  lockButton: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  lockIcon: {
    fontSize: 16,
  },
});
