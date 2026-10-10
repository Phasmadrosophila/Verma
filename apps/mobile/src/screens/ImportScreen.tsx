import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ApiError, apiClient, ImportAnalysis } from '../state/apiClient';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface ImportScreenProps {
  onCommitImport: () => void;
}

export const ImportScreen: React.FC<ImportScreenProps> = ({ onCommitImport }) => {
  const [csvContent, setCsvContent] = useState('');
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!csvContent.trim()) {
      setError('Paste a CSV export before analyzing it.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await apiClient.analyzeImport(csvContent);
      setAnalysis(result);
      setSelectedRows(result.proposal.previewRows.map((row) => row.rowIndex));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not analyze this CSV.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (analysis) await apiClient.cancelImport(analysis.stagingId).catch(() => undefined);
    setAnalysis(null);
    setSelectedRows([]);
  };

  const confirm = async () => {
    if (!analysis || selectedRows.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiClient.confirmImport(analysis.stagingId, selectedRows);
      onCommitImport();
      if (result.failedCount > 0) {
        setError(`${result.importedCount} imported; ${result.failedCount} rows could not be imported.`);
      }
      setAnalysis(null);
      setSelectedRows([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not confirm this import.');
    } finally {
      setBusy(false);
    }
  };

  const toggleRow = (rowIndex: number) => {
    setSelectedRows((current) =>
      current.includes(rowIndex)
        ? current.filter((index) => index !== rowIndex)
        : [...current, rowIndex]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.tagBadge}><Text style={styles.tagBadgeText}>SMART IMPORT</Text></View>
        <Text style={styles.title}>Messy CSV Cleanup</Text>
        <Text style={styles.subtitle}>
          Analyze a browser export, review masked previews, and confirm only the rows you want to store.
        </Text>
      </View>

      {!analysis ? (
        <>
          <TextInput
            multiline
            value={csvContent}
            onChangeText={setCsvContent}
            placeholder="Paste your sanitized CSV export here"
            placeholderTextColor={colors.textMuted}
            style={styles.csvInput}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.primaryButton} onPress={analyze} disabled={busy}>
            {busy ? <ActivityIndicator color={colors.paper} /> : <Text style={styles.primaryButtonText}>Analyze CSV</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{analysis.proposal.totalRows} rows found</Text>
            <Text style={styles.summaryText}>
              {selectedRows.length} selected · {analysis.proposal.duplicateGroups.length} duplicate groups
            </Text>
          </View>
          {analysis.proposal.previewRows.map((row) => {
            const selected = selectedRows.includes(row.rowIndex);
            return (
              <TouchableOpacity key={row.rowIndex} style={styles.rowCard} onPress={() => toggleRow(row.rowIndex)}>
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{row.title || 'Untitled entry'}</Text>
                  <Text style={styles.rowMeta}>{row.username || row.domain || 'No username or domain'}</Text>
                  <Text style={styles.rowSecret}>{row.passwordMasked}</Text>
                  {row.isDuplicate && <Text style={styles.warning}>Duplicate candidate</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={cancel} disabled={busy}>
              <Text style={styles.secondaryButtonText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={confirm} disabled={busy || selectedRows.length === 0}>
              {busy ? <ActivityIndicator color={colors.paper} /> : <Text style={styles.primaryButtonText}>Confirm Import</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  contentContainer: { padding: spacing.xl, gap: spacing.md },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  tagBadge: { alignSelf: 'flex-start', backgroundColor: colors.assist, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  tagBadgeText: { color: colors.brandPeri, fontSize: typography.sizeXs, fontWeight: '700', letterSpacing: 1 },
  title: { color: colors.text, fontSize: typography.sizeXl, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: typography.sizeSm, lineHeight: 20 },
  csvInput: { minHeight: 220, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.paper, color: colors.text, padding: spacing.md, textAlignVertical: 'top' },
  primaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandOrange, borderRadius: radii.md, paddingHorizontal: spacing.lg, flex: 1 },
  primaryButtonText: { color: colors.paper, fontWeight: '700' },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.lg, flex: 1 },
  secondaryButtonText: { color: colors.text, fontWeight: '700' },
  summaryCard: { backgroundColor: colors.assist, borderRadius: radii.md, padding: spacing.md },
  summaryTitle: { color: colors.text, fontWeight: '800' },
  summaryText: { color: colors.textMuted, marginTop: spacing.xs },
  rowCard: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.paper, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: colors.brandPeri, borderColor: colors.brandPeri },
  checkmark: { color: colors.paper, fontWeight: '800' },
  rowContent: { flex: 1, gap: spacing.xs },
  rowTitle: { color: colors.text, fontWeight: '700' },
  rowMeta: { color: colors.textMuted, fontSize: typography.sizeSm },
  rowSecret: { color: colors.textMuted, letterSpacing: 1 },
  warning: { color: colors.brandOrange, fontSize: typography.sizeXs, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: typography.sizeSm },
});
