import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { EntryRow } from '../components/EntryRow';
import {
  EntryType,
  MobileVaultEntry,
  filterEntries,
} from '../state/vaultStore';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface VaultScreenProps {
  entries: MobileVaultEntry[];
  onSelectEntry: (entry: MobileVaultEntry) => void;
  onOpenAsk: () => void;
}

export const VaultScreen: React.FC<VaultScreenProps> = ({
  entries,
  onSelectEntry,
  onOpenAsk,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const filteredEntries = useMemo(() => {
    return filterEntries(entries, query, filter);
  }, [entries, query, filter]);

  const favorites = useMemo(() => {
    return entries.filter((e) => e.favorite);
  }, [entries]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Vault Hero */}
      <View style={styles.vaultHero}>
        <View style={styles.heroTextCol}>
          <Text style={styles.heroEyebrow}>ENCRYPTED LOCAL STORAGE</Text>
          <Text style={styles.heroTitle}>Your vault is ready and on-device.</Text>
          <Text style={styles.heroMeta}>
            {entries.length} items stored · SQLite + libsodium · Zero telemetry
          </Text>
        </View>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeEmoji}>🔐</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search logins, notes, API keys..."
          placeholderTextColor="#8D847B"
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Ask Verma Assistant Banner */}
      <TouchableOpacity
        style={styles.askBanner}
        onPress={onOpenAsk}
        activeOpacity={0.8}
      >
        <View style={styles.askIconBox}>
          <Text style={styles.askSparkle}>✨</Text>
        </View>
        <View style={styles.askTextBox}>
          <Text style={styles.askTitle}>Ask in plain English</Text>
          <Text style={styles.askSubtitle}>
            "Where is my Wi-Fi?" or "Show streaming accounts"
          </Text>
        </View>
        <View style={styles.arrowCircle}>
          <Text style={styles.arrowText}>→</Text>
        </View>
      </TouchableOpacity>

      {/* Favorites Section */}
      {favorites.length > 0 && query.length === 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorites</Text>
            <TouchableOpacity onPress={() => setFilter('favorite')}>
              <Text style={styles.sectionLink}>View all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.favoritesGrid}>
            {favorites.slice(0, 3).map((item, idx) => {
              const bgColors = [colors.warm, colors.assist, colors.canvas];
              const cardBg = bgColors[idx % bgColors.length];

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.favCard, { backgroundColor: cardBg }]}
                  onPress={() => onSelectEntry(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.favCardTop}>
                    <View style={styles.favBrandBadge}>
                      <Text style={styles.favBrandText}>
                        {item.title.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.starIcon}>★</Text>
                  </View>
                  <Text style={styles.favTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.favSubtitle} numberOfLines={1}>
                    {item.subtitle || item.user || ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {[
          { key: 'all', label: `All (${entries.length})` },
          { key: 'login', label: 'Logins' },
          { key: 'note', label: 'Notes' },
          { key: 'api', label: 'API Keys' },
          { key: 'favorite', label: 'Favorites' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.filterPill,
              filter === item.key && styles.filterPillActive,
            ]}
            onPress={() => setFilter(item.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                filter === item.key && styles.filterTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Entry List */}
      <View style={styles.entriesList}>
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onPress={onSelectEntry}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔎</Text>
            <Text style={styles.emptyTitle}>No matching items found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your query or filter
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentContainer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: 40,
  },
  vaultHero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  heroTextCol: {
    flex: 1,
    marginRight: spacing.md,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7F7164',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  heroMeta: {
    fontSize: 13,
    color: '#8B7969',
    marginTop: 8,
  },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeEmoji: {
    fontSize: 32,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F3EF',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    height: 56,
    marginBottom: spacing.lg,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizeBase,
    color: colors.text,
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  askBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.assist,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  askIconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.brandPeri,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askSparkle: {
    fontSize: 22,
  },
  askTextBox: {
    flex: 1,
  },
  askTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  askSubtitle: {
    fontSize: 13,
    color: '#67729B',
    marginTop: 4,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brandPeri,
  },
  favoritesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  favCard: {
    flex: 1,
    minWidth: 160,
    borderRadius: radii.lg,
    padding: 16,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  favCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  favBrandBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBrandText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  starIcon: {
    fontSize: 16,
    color: '#9E8873',
  },
  favTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  favSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E9E1D9',
  },
  filterPillActive: {
    backgroundColor: colors.warm,
    borderColor: colors.warm,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  entriesList: {
    marginTop: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
