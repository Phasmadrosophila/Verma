import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from '../components/Icon';
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

type AskResult = { entry: MobileVaultEntry; matched: string[]; score: number };

const EXAMPLE_PROMPTS = [
  'My work Google account',
  'That cloud token for my side project',
  'Our family streaming account',
];

export const AskScreen: React.FC<AskScreenProps> = ({
  entries,
  onSelectEntry,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AskResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [offlineFallback, setOfflineFallback] = useState(false);

  /** Local, zero-secret metadata search — searches title/domain/tags/type only. */
  const localSearch = (queryText: string) => findMetadata(entries, queryText);

  const handleAsk = async (queryText: string) => {
    if (!queryText.trim()) return;
    setQuery(queryText);
    setBusy(true);
    setOfflineFallback(false);
    // Local metadata match drives the "matched tokens" explanation.
    const local = localSearch(queryText);
    try {
      // Ask the sandboxed on-device model via the backend (metadata only).
      const { relevantEntryIds } = await apiClient.askVault(queryText);
      const localById = new Map(local.map((r) => [String(r.entry.id), r]));
      const byId = new Map(entries.map((e) => [String(e.id), e]));
      const matched = relevantEntryIds
        .map((id) => byId.get(String(id)))
        .filter((e): e is MobileVaultEntry => e !== undefined)
        .map(
          (entry): AskResult =>
            localById.get(String(entry.id)) ?? { entry, matched: [], score: 1 }
        );
      // If the model matched nothing resolvable, fall back to local search.
      setResults(matched.length > 0 ? matched : local);
    } catch {
      // Offline / server unavailable: degrade to local metadata search.
      setResults(local);
      setOfflineFallback(true);
    } finally {
      setBusy(false);
      setHasSearched(true);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Assistant hero: orb on an assist-colored band */}
      <View style={styles.art}>
        <View style={styles.orb}>
          <Icon name="spark" size={44} color={colors.surface} />
        </View>
        <View style={styles.artShapeSquare} />
        <View style={styles.artShapeQuarter} />
      </View>

      {/* Eyebrow + headline + subcopy */}
      <View style={styles.head}>
        <Text style={styles.eyebrow}>A LITTLE HELP, RIGHT HERE</Text>
        <Text style={styles.headline}>You know the one.{'\n'}Let’s find it.</Text>
        <Text style={styles.subcopy}>
          A name, a memory, a few words.{'\n'}Tell Verma what you’re looking for.
        </Text>
      </View>

      {/* Ask form */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="That Google account I use for work..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void handleAsk(query)}
          returnKeyType="search"
          maxLength={300}
          multiline
          editable={!busy}
        />
        <View style={styles.formBottom}>
          <View style={styles.deviceRow}>
            <Icon name="shield" size={14} color={colors.textMuted} />
            <Text style={styles.deviceText}>Just on this device</Text>
          </View>
          <TouchableOpacity
            style={[styles.findBtn, (!query.trim() || busy) && styles.findBtnDisabled]}
            onPress={() => void handleAsk(query)}
            disabled={!query.trim() || busy}
            activeOpacity={0.8}
          >
            <Text style={styles.findBtnText}>{busy ? 'Finding…' : 'Find it  →'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results, or example prompts before any search */}
      {hasSearched ? (
        <View style={styles.resultsSection}>
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionTitle}>
              {results.length
                ? results.length === 1
                  ? 'This might be your one.'
                  : 'This might be your match.'
                : 'Not quite ringing a bell.'}
              {offlineFallback ? ' · on this device' : ''}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setResults([]);
                setHasSearched(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.smallAction}>Start over</Text>
            </TouchableOpacity>
          </View>

          {results.length ? (
            results.map(({ entry, matched }, i) => (
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
                </View>
                <Text style={styles.matchExplanation}>
                  {i === 0 ? 'Best match' : 'Also found'}
                  {matched.length ? ` · ${matched.join(', ')}` : ''}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Try a different little clue.</Text>
              <Text style={styles.emptyText}>
                A website, a tag, or part of its name usually helps.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.promptBlock}>
          <Text style={styles.sectionTitle}>A little inspiration</Text>
          <View style={styles.promptList}>
            {EXAMPLE_PROMPTS.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                style={styles.promptBtn}
                onPress={() => void handleAsk(prompt)}
                activeOpacity={0.7}
              >
                <Text style={styles.promptText}>{prompt}</Text>
                <Text style={styles.promptArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Privacy footnote */}
      <View style={styles.footnote}>
        <Icon name="lock" size={14} color={colors.textMuted} />
        <Text style={styles.footnoteText}>
          Your secrets are never part of the search.
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
    paddingBottom: 40,
  },
  art: {
    backgroundColor: colors.assist,
    minHeight: 170,
    paddingTop: 30,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orb: {
    width: 85,
    height: 85,
    borderRadius: 999,
    backgroundColor: colors.brandPeri,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artShapeSquare: {
    position: 'absolute',
    width: 34,
    height: 34,
    backgroundColor: colors.brandPeri,
    left: 38,
    top: 37,
    transform: [{ rotate: '45deg' }],
  },
  artShapeQuarter: {
    position: 'absolute',
    width: 50,
    height: 50,
    backgroundColor: colors.brandOrange,
    borderTopLeftRadius: 50,
    right: 32,
    bottom: 27,
  },
  head: {
    backgroundColor: colors.assist,
    paddingHorizontal: 25,
    paddingBottom: 24,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.brandPeri,
    marginBottom: spacing.sm,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.7,
    lineHeight: 32,
  },
  subcopy: {
    marginTop: 11,
    fontSize: 12,
    lineHeight: 20,
    color: colors.textMuted,
    maxWidth: 290,
  },
  form: {
    marginHorizontal: 23,
    backgroundColor: '#F7F4F0',
    borderRadius: 24,
    padding: 15,
    gap: spacing.md,
  },
  input: {
    fontSize: typography.sizeMd,
    color: colors.text,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  formBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deviceText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  findBtn: {
    backgroundColor: colors.text,
    paddingHorizontal: 18,
    minHeight: 36,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findBtnDisabled: {
    opacity: 0.5,
  },
  findBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.surface,
  },
  resultsSection: {
    marginTop: 22,
    paddingHorizontal: 24,
    gap: spacing.sm,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  smallAction: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandPeri,
  },
  resultCard: {
    borderWidth: 1,
    borderColor: '#E4E1EE',
    borderRadius: 19,
    paddingHorizontal: 13,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
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
  matchExplanation: {
    fontSize: 10,
    color: colors.textMuted,
  },
  emptyCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
  promptBlock: {
    marginTop: 22,
    paddingHorizontal: 24,
  },
  promptList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  promptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#ECE2D8',
    borderRadius: 30,
    minHeight: 45,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  promptText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  promptArrow: {
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 24,
  },
  footnoteText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
