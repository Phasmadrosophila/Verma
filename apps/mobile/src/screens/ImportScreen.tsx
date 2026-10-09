import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ImportCandidate,
  MobileVaultEntry,
  sampleImportRows,
} from '../state/vaultStore';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface ImportScreenProps {
  onCommitImport: (newEntries: MobileVaultEntry[]) => void;
}

export const ImportScreen: React.FC<ImportScreenProps> = ({ onCommitImport }) => {
  const [candidates, setCandidates] = useState<ImportCandidate[]>(sampleImportRows);
  const [source, setSource] = useState('Google Chrome');

  const toggleAccepted = (id: number) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, accepted: !c.accepted } : c))
    );
  };

  const handleSelectAll = () => {
    const allAccepted = candidates.every((c) => c.accepted);
    setCandidates((prev) => prev.map((c) => ({ ...c, accepted: !allAccepted })));
  };

  const handleCommit = () => {
    const acceptedItems = candidates.filter((c) => c.accepted);
    const converted: MobileVaultEntry[] = acceptedItems.map((c) => ({
      id: Date.now() + c.id,
      type: c.type,
      title: c.title,
      subtitle: c.subtitle,
      user: c.user,
      domain: c.domain,
      tags: [c.tag],
      favorite: false,
      brand: c.brand,
      secret: 'demo-imported-secret-9941',
      updated: 'Just imported',
    }));

    onCommitImport(converted);
  };

  const acceptedCount = candidates.filter((c) => c.accepted).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.tagBadge}>
          <Text style={styles.tagBadgeText}>SMART IMPORT</Text>
        </View>
        <Text style={styles.title}>Messy CSV Cleanup</Text>
        <Text style={styles.subtitle}>
          Preview browser exports. Verma groups duplicates and suggests tags before
          anything is committed to encrypted storage.
        </Text>
      </View>

      {/* Source selector */}
      <View style={styles.sourceCard}>
        <Text style={styles.sourceLabel}>IMPORT SOURCE</Text>
        <View style={styles.sourcePills}>
          {['Google Chrome', '1Password', 'Bitwarden', 'Apple'].map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setSource(s)}
              style={[
                styles.sourcePill,
                source === s && styles.sourcePillActive,
              ]}
            >
              <Text
                style={[
                  styles.sourcePillText,
                  source === s && styles.sourcePillTextActive,
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Candidates List Header */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listHeaderTitle}>
          CANDIDATES ({acceptedCount}/{candidates.length} SELECTED)
        </Text>
        <TouchableOpacity onPress={handleSelectAll}>
          <Text style={styles.selectAllText}>
            {acceptedCount === candidates.length ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Candidate Items */}
      <View style={styles.candidatesList}>
        {candidates.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.candidateCard,
              item.duplicate && styles.duplicateCard,
              item.accepted && styles.candidateCardAccepted,
            ]}
            onPress={() => toggleAccepted(item.id)}
            activeOpacity={0.8}
          >
            <View style={styles.candidateTop}>
              <View style={styles.leftCol}>
                <View style={styles.checkboxWrapper}>
                  <View
                    style={[
                      styles.checkbox,
                      item.accepted && styles.checkboxActive,
                    ]}
                  >
                    {item.accepted && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </View>

                <View style={styles.infoCol}>
                  <View style={styles.nameRow}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.duplicate && (
                      <View style={styles.duplicateTag}>
                        <Text style={styles.duplicateTagText}>DUPLICATE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemUser}>{item.user}</Text>
                </View>
              </View>

              <View style={styles.tagPill}>
                <Text style={styles.tagPillText}>{item.tag}</Text>
              </View>
            </View>

            {item.duplicate && (
              <View style={styles.duplicateWarning}>
                <Text style={styles.duplicateWarningText}>
                  Existing entry found for {item.domain}. Select to overwrite or keep existing.
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Commit Action */}
      <TouchableOpacity
        style={[styles.commitBtn, acceptedCount === 0 && styles.commitBtnDisabled]}
        onPress={handleCommit}
        disabled={acceptedCount === 0}
        activeOpacity={0.8}
      >
        <Text style={styles.commitBtnText}>
          Import {acceptedCount} {acceptedCount === 1 ? 'Item' : 'Items'} to Vault
        </Text>
      </TouchableOpacity>
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
  tagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
  },
  tagBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8F5413',
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
  sourceCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sourceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  sourcePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourcePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E6DACE',
  },
  sourcePillActive: {
    backgroundColor: colors.brandOrange,
    borderColor: colors.brandOrange,
  },
  sourcePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  sourcePillTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  listHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  selectAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandPeri,
  },
  candidatesList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  candidateCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#EFE7DE',
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  candidateCardAccepted: {
    borderColor: colors.brandOrange,
  },
  duplicateCard: {
    backgroundColor: '#FFF8F4',
    borderColor: '#FCD2B3',
  },
  candidateTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  checkboxWrapper: {
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C5B5A3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxActive: {
    backgroundColor: colors.brandOrange,
    borderColor: colors.brandOrange,
  },
  checkmark: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  duplicateTag: {
    backgroundColor: '#FDE1D3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  duplicateTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 0.5,
  },
  itemUser: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  tagPill: {
    backgroundColor: colors.assist,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F66BD',
  },
  duplicateWarning: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F5E4D8',
  },
  duplicateWarningText: {
    fontSize: 10,
    color: '#9E5B28',
  },
  commitBtn: {
    backgroundColor: colors.brandOrange,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
    elevation: 2,
  },
  commitBtnDisabled: {
    opacity: 0.5,
  },
  commitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
});
