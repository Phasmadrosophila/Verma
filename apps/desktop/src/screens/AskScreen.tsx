import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  MobileVaultEntry,
  findMetadata,
} from '../state/vaultStore';
import { apiClient } from '../state/apiClient';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface AskScreenProps {
  entries: MobileVaultEntry[];
  onSelectEntry: (entry: MobileVaultEntry) => void;
}

export const AskScreen: React.FC<AskScreenProps> = ({
  entries,
  onSelectEntry,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    { entry: MobileVaultEntry; matched: string[]; score: number }[]
  >([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [offlineFallback, setOfflineFallback] = useState(false);

  /** Local, zero-secret metadata search — used as the offline fallback. */
  const localSearch = (queryText: string) => findMetadata(entries, queryText);

  const handleAsk = async (queryText: string) => {
    if (!queryText.trim()) return;
    setQuery(queryText);
    setBusy(true);
    setOfflineFallback(false);
    try {
      // Ask the sandboxed on-device model via the backend (metadata only).
      const { relevantEntryIds } = await apiClient.askVault(queryText);
      const byId = new Map(entries.map((e) => [String(e.id), e]));
      const matched = relevantEntryIds
        .map((id) => byId.get(String(id)))
        .filter((e): e is MobileVaultEntry => e !== undefined)
        .map((entry) => ({ entry, matched: [] as string[], score: 1 }));
      // If the model matched nothing resolvable, fall back to local search.
      setResults(matched.length > 0 ? matched : localSearch(queryText));
    } catch {
      // Offline / server unavailable: degrade to local metadata search.
      setResults(localSearch(queryText));
      setOfflineFallback(true);
    } finally {
      setBusy(false);
      setHasSearched(true);
    }
  };

  const suggestions = [
    'Where is my Wi-Fi password?',
    'Show streaming accounts',
    'Find development tokens',
    'Work accounts for Company X',
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Screen Title & AI Badge */}
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeDot}>●</Text>
          <Text style={styles.statusBadgeText}>SANDBOXED ON-DEVICE AI</Text>
        </View>

        <Text style={styles.title}>Ask Your Vault</Text>
        <Text style={styles.subtitle}>
          Ask in plain English. Verma finds matches using non-secret metadata without
          revealing passwords.
        </Text>
      </View>

      {/* Query Input Box */}
      <View style={styles.inputCard}>
        <TextInput
          style={styles.input}
          placeholder="e.g. Where is my Netflix password?"
          placeholderTextColor="#8D847B"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void handleAsk(query)}
          returnKeyType="search"
          editable={!busy}
        />

        <TouchableOpacity
          style={[styles.askBtn, (!query.trim() || busy) && styles.askBtnDisabled]}
          onPress={() => void handleAsk(query)}
          disabled={!query.trim() || busy}
          activeOpacity={0.8}
        >
          <Text style={styles.askBtnText}>{busy ? 'Asking…' : 'Ask Local AI'}</Text>
        </TouchableOpacity>
      </View>

      {/* Prompt Suggestions */}
      <View style={styles.suggestionsSection}>
        <Text style={styles.sectionHeading}>SUGGESTIONS</Text>
        <View style={styles.chipsWrap}>
          {suggestions.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.chip}
              onPress={() => void handleAsk(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Results Section */}
      {hasSearched && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionHeading}>
            {results.length > 0
              ? `MATCHED ENTRIES (${results.length})`
              : 'NO MATCHES FOUND'}
            {offlineFallback ? ' · OFFLINE SEARCH' : ''}
          </Text>

          {results.length > 0 ? (
            results.map(({ entry, matched }) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.resultCard}
                onPress={() => onSelectEntry(entry)}
                activeOpacity={0.8}
              >
                <View style={styles.resultHeader}>
                  <View style={styles.resultBadge}>
                    <Text style={styles.resultBadgeText}>
                      {entry.title.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.resultTitleCol}>
                    <Text style={styles.resultTitle}>{entry.title}</Text>
                    <Text style={styles.resultSubtitle}>
                      {entry.subtitle || entry.domain}
                    </Text>
                  </View>
                  <View style={styles.inspectBtn}>
                    <Text style={styles.inspectBtnText}>View</Text>
                  </View>
                </View>

                {/* Match Reason / Matched tags */}
                <View style={styles.matchReasonRow}>
                  <Text style={styles.matchReasonLabel}>Matched metadata:</Text>
                  {matched.map((term, i) => (
                    <View key={i} style={styles.matchedTag}>
                      <Text style={styles.matchedTagText}>{term}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No entries matched your question. Remember that passwords and note bodies
                are never searched by AI.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Security Invariant Callout */}
      <View style={styles.securityBox}>
        <Text style={styles.securityTitle}>Zero-Secret Security Model</Text>
        <Text style={styles.securityDesc}>
          Secret fields (passwords, private keys, note contents) are never exposed to the
          AI model. Only entry titles, domain names, and tags are searched.
        </Text>
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
  header: {
    marginBottom: spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.assist,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    gap: 6,
    marginBottom: spacing.sm,
  },
  statusBadgeDot: {
    color: '#2E8540',
    fontSize: 10,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F66BD',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  inputCard: {
    backgroundColor: colors.inputBg,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  input: {
    fontSize: typography.sizeBase,
    color: colors.text,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  askBtn: {
    backgroundColor: colors.brandPeri,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  askBtnDisabled: {
    opacity: 0.5,
  },
  askBtnText: {
    fontSize: typography.sizeBase,
    fontWeight: '700',
    color: colors.text,
  },
  suggestionsSection: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.cardBg,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#E8DFD5',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  resultsSection: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#EFE7DE',
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultBadge: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  resultTitleCol: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  resultSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  inspectBtn: {
    backgroundColor: colors.brandOrange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  inspectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  matchReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F4ECE4',
    paddingTop: 8,
  },
  matchReasonLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  matchedTag: {
    backgroundColor: colors.assist,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  matchedTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4F66BD',
  },
  emptyCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
  securityBox: {
    backgroundColor: colors.assist,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  securityTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F66BD',
    marginBottom: 4,
  },
  securityDesc: {
    fontSize: 11,
    lineHeight: 16,
    color: '#4F66BD',
  },
});
