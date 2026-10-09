import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MobileVaultEntry } from '../state/vaultStore';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface EntryRowProps {
  entry: MobileVaultEntry;
  onPress: (entry: MobileVaultEntry) => void;
}

export const EntryRow: React.FC<EntryRowProps> = ({ entry, onPress }) => {
  const getBadgeStyle = () => {
    switch (entry.brand) {
      case 'netflix':
        return { backgroundColor: '#FFF0EC', color: '#E50914' };
      case 'ocean':
        return { backgroundColor: '#EAF0FF', color: '#0080FF' };
      case 'wifi':
        return { backgroundColor: colors.warm, color: '#8F5413' };
      case 'github':
        return { backgroundColor: '#F0F0F0', color: '#24292E' };
      case 'google':
        return { backgroundColor: '#F0F4FF', color: '#4285F4' };
      default:
        return { backgroundColor: '#F5F1EC', color: colors.text };
    }
  };

  const badgeStyle = getBadgeStyle();
  const initial =
    entry.title === 'Google'
      ? 'G'
      : entry.title === 'GitHub'
      ? 'GH'
      : entry.title === 'Netflix'
      ? 'N'
      : entry.brand === 'wifi'
      ? '📶'
      : entry.title.slice(0, 2).toUpperCase();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(entry)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}, ${entry.subtitle}`}
    >
      <View style={[styles.brandIcon, { backgroundColor: badgeStyle.backgroundColor }]}>
        <Text style={[styles.brandIconText, { color: badgeStyle.color }]}>{initial}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {entry.title}
          </Text>
          {entry.tags.length > 0 && (
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>{entry.tags[0]}</Text>
            </View>
          )}
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>
          {entry.subtitle || entry.domain || entry.user}
        </Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E9E2',
    minHeight: 80,
  },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  brandIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  tagBadge: {
    backgroundColor: colors.badgeBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  chevron: {
    fontSize: 24,
    color: '#BDB1A5',
    marginLeft: spacing.lg,
    fontWeight: '300',
  },
});
