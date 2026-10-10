import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MobileVaultEntry } from '../state/vaultStore';
import { apiClient } from '../state/apiClient';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface ImportScreenProps {
  onCommitImport: (newEntries: MobileVaultEntry[]) => void;
}

export const ImportScreen: React.FC<ImportScreenProps> = ({ onCommitImport }) => {
  const [csvContent, setCsvContent] = useState('');
  const [stagingId, setStagingId] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [acceptedIndices, setAcceptedIndices] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState('Google Chrome');

  const handleAnalyze = async () => {
    if (!csvContent.trim()) {
      setError('Please paste CSV content first.');
      return;
    }
    setError('');
    setIsProcessing(true);
    try {
      const result = await apiClient.analyzeImport(csvContent);
      setStagingId(result.stagingId);
      setPreviewRows(result.proposal.previewRows);
      
      const newAccepted = new Set<number>();
      result.proposal.previewRows.forEach((row: any) => {
        if (!row.isDuplicate) {
          newAccepted.add(row.rowIndex);
        }
      });
      setAcceptedIndices(newAccepted);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze CSV.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleAccepted = (idx: number) => {
    const next = new Set(acceptedIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setAcceptedIndices(next);
  };

  const handleSelectAll = () => {
    if (acceptedIndices.size === previewRows.length) {
      setAcceptedIndices(new Set());
    } else {
      setAcceptedIndices(new Set(previewRows.map(r => r.rowIndex)));
    }
  };

  const handleCancel = async () => {
    if (stagingId) {
      await apiClient.cancelImport(stagingId).catch(() => {});
    }
    setStagingId(null);
    setPreviewRows([]);
    setCsvContent('');
    setAcceptedIndices(new Set());
  };

  const handleCommit = async () => {
    if (!stagingId) return;
    setIsProcessing(true);
    try {
      const result = await apiClient.confirmImport(stagingId, {
        confirmedRowIndices: Array.from(acceptedIndices),
      });
      // The onCommitImport expects a list of MobileVaultEntry, but here we can just pass empty since it reloads anyways
      onCommitImport([]);
    } catch (err: any) {
      setError(err.message || 'Failed to import.');
      setIsProcessing(false);
    }
  };

  if (!stagingId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagBadgeText}>IMPORT VAULT</Text>
          </View>
          <Text style={styles.title}>Paste CSV Data</Text>
          <Text style={styles.subtitle}>
            Paste your exported CSV here. We'll analyze it before importing.
          </Text>
        </View>

        {error ? <Text style={{color: 'red', marginBottom: 10}}>{error}</Text> : null}

        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            minHeight: 200,
            padding: 12,
            textAlignVertical: 'top',
            marginBottom: 20,
            backgroundColor: '#fff',
          }}
          multiline
          placeholder="username,password,url..."
          value={csvContent}
          onChangeText={setCsvContent}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={styles.commitBtn}
          onPress={handleAnalyze}
          disabled={isProcessing}
        >
          <Text style={styles.commitBtnText}>
            {isProcessing ? 'Analyzing...' : 'Analyze CSV'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.tagBadge}>
          <Text style={styles.tagBadgeText}>SMART IMPORT</Text>
        </View>
        <Text style={styles.title}>Review Import</Text>
        <Text style={styles.subtitle}>
          Preview your entries. Verma groups duplicates and suggests tags.
        </Text>
      </View>

      {error ? <Text style={{color: 'red', marginBottom: 10}}>{error}</Text> : null}

      <View style={styles.listHeaderRow}>
        <Text style={styles.listHeaderTitle}>
          CANDIDATES ({acceptedIndices.size}/{previewRows.length} SELECTED)
        </Text>
        <TouchableOpacity onPress={handleSelectAll}>
          <Text style={styles.selectAllText}>
            {acceptedIndices.size === previewRows.length ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.candidatesList}>
        {previewRows.map((item) => {
          const isAccepted = acceptedIndices.has(item.rowIndex);
          const entry = item.proposedEntry;
          return (
            <TouchableOpacity
              key={item.rowIndex}
              style={[
                styles.candidateCard,
                item.isDuplicate && styles.duplicateCard,
                isAccepted && styles.candidateCardAccepted,
              ]}
              onPress={() => toggleAccepted(item.rowIndex)}
              activeOpacity={0.8}
            >
              <View style={styles.candidateTop}>
                <View style={styles.leftCol}>
                  <View style={styles.checkboxWrapper}>
                    <View style={[styles.checkbox, isAccepted && styles.checkboxActive]}>
                      {isAccepted && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </View>
                  <View style={styles.infoCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.itemTitle}>{entry.title || 'Untitled'}</Text>
                      {item.isDuplicate && (
                        <View style={styles.duplicateTag}>
                          <Text style={styles.duplicateTagText}>DUPLICATE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemUser}>{entry.username || 'No user'}</Text>
                  </View>
                </View>
                {entry.tags && entry.tags.length > 0 && (
                  <View style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{entry.tags[0]}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.commitBtn, acceptedIndices.size === 0 && styles.commitBtnDisabled]}
        onPress={handleCommit}
        disabled={acceptedIndices.size === 0 || isProcessing}
        activeOpacity={0.8}
      >
        <Text style={styles.commitBtnText}>
          {isProcessing ? 'Importing...' : `Import ${acceptedIndices.size} Items`}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={{ marginTop: 16, alignItems: 'center', padding: 12 }}
        onPress={handleCancel}
        disabled={isProcessing}
      >
        <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
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
