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
  ImportCandidate,
  MobileVaultEntry,
  sampleImportRows,
} from '../state/vaultStore';
import { colors, radii, spacing } from '../theme/tokens';

interface ImportScreenProps {
  onCommitImport: (newEntries: MobileVaultEntry[]) => void;
}

type Step = 'source' | 'review' | 'complete';
type Source = 'browser' | 'manager';
type Duplicate = '' | 'keep' | 'skip';

// Step progress dots (preview steps(n), 1-indexed → active <= n).
const Steps: React.FC<{ step: number }> = ({ step }) => (
  <View style={styles.steps} accessibilityLabel={`Step ${step} of 3`}>
    {[1, 2, 3].map((i) => (
      <View key={i} style={[styles.stepDot, i <= step && styles.stepDotActive]} />
    ))}
  </View>
);

export const ImportScreen: React.FC<ImportScreenProps> = ({ onCommitImport }) => {
  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<Source>('browser');
  const [rows, setRows] = useState<ImportCandidate[]>([]);
  const [duplicate, setDuplicate] = useState<Duplicate>('');
  const [importedCount, setImportedCount] = useState(0);

  // Step 1 → 2: load the synthetic sample rows (no personal file needed).
  const loadSample = () => {
    setRows(sampleImportRows.map((r) => ({ ...r })));
    setDuplicate('');
    setStep('review');
  };

  const setTag = (id: number, tag: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, tag } : r)));

  const toggleAccept = (id: number) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, accepted: !r.accepted } : r))
    );

  const allAccepted = rows.length > 0 && rows.every((r) => r.accepted);
  const toggleAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, accepted: !allAccepted })));

  // Count that survives the duplicate gate (skip drops the duplicate copy).
  const count = rows.filter((r) => !r.duplicate || duplicate !== 'skip').length;

  // Step 2 → 3: build vault entries from the kept rows, honoring the gate and
  // only attaching tags the user accepted. Secrets are synthetic placeholders.
  const confirmImport = () => {
    const kept = rows.filter((r) => !r.duplicate || duplicate !== 'skip');
    const converted: MobileVaultEntry[] = kept.map((r) => ({
      id: Date.now() + r.id,
      type: r.type,
      title: r.title,
      subtitle: r.subtitle,
      user: r.user,
      domain: r.domain,
      tags: r.accepted ? [r.tag] : [],
      favorite: false,
      brand: r.brand,
      secret: 'demo-imported-secret-9941',
      updated: 'Just imported',
    }));
    setImportedCount(converted.length);
    setStep('complete');
    onCommitImport(converted);
  };

  const importAgain = () => {
    setStep('source');
    setSource('browser');
    setRows([]);
    setDuplicate('');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {step === 'source' && (
        <>
          <Steps step={1} />
          <View style={styles.pageHead}>
            <Text style={styles.eyebrow}>MAKE YOURSELF AT HOME</Text>
            <Text style={styles.h1}>Bring your little universe with you.</Text>
            <Text style={styles.lede}>
              Moving in should feel easy. Let's give your passwords a new place to
              call home.
            </Text>
          </View>

          <View style={styles.illustration} accessibilityElementsHidden>
            <View style={styles.miniFileLeft}>
              <Icon name="import" size={22} color={colors.text} />
              <Text style={styles.miniFileLabel}>.CSV</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
            <View style={styles.miniFileRight}>
              <Icon name="vault" size={22} color={colors.text} />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Where are you moving from?</Text>
          <View style={styles.sourceOptions}>
            <TouchableOpacity
              style={[
                styles.sourceOption,
                source === 'browser' && styles.sourceOptionActive,
              ]}
              onPress={() => setSource('browser')}
              activeOpacity={0.85}
            >
              <Text style={styles.sourceGlyph}>🌐</Text>
              <View>
                <Text style={styles.sourceTitle}>My browser</Text>
                <Text style={styles.sourceSub}>Chrome, Safari…</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sourceOption,
                source === 'manager' && styles.sourceOptionActive,
              ]}
              onPress={() => setSource('manager')}
              activeOpacity={0.85}
            >
              <Text style={styles.sourceGlyph}>🔑</Text>
              <View>
                <Text style={styles.sourceTitle}>Another app</Text>
                <Text style={styles.sourceSub}>Password manager</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.notice}>
            <Icon name="shield" size={20} color={colors.text} />
            <View style={styles.noticeBody}>
              <Text style={styles.noticeStrong}>You get the final say.</Text>
              <Text style={styles.noticeText}>
                Review your items and suggested tags before anything is added to
                your vault.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={loadSample}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Try a sample import →</Text>
          </TouchableOpacity>
          <Text style={styles.hintCenter}>8 sample rows · no personal file needed</Text>

          <View style={styles.howTo}>
            <Text style={styles.howToSummary}>How will importing work?</Text>
            <Text style={styles.howToText}>
              Export a CSV from your browser or password manager, choose the file,
              and review it here. This prototype uses sample data so you can explore
              the flow without sharing real passwords.
            </Text>
          </View>
        </>
      )}

      {step === 'review' && (
        <>
          <Steps step={2} />
          <View style={styles.pageHead}>
            <Text style={styles.eyebrow}>A QUICK LOOK TOGETHER</Text>
            <Text style={styles.h1}>Everything in its place?</Text>
            <Text style={styles.lede}>
              A little tidying before we move in. You decide what stays and how it's
              labeled.
            </Text>
          </View>

          <View style={styles.summary}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryNum}>7</Text>
              <Text style={styles.summaryLabel}>Items found</Text>
            </View>
            <View style={[styles.summaryCell, styles.summaryDivider]}>
              <Text style={styles.summaryNum}>1</Text>
              <Text style={styles.summaryLabel}>Possible duplicate</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryNum}>1</Text>
              <Text style={styles.summaryLabel}>Unreadable row</Text>
            </View>
          </View>

          <View style={styles.noticeWarm}>
            <Text style={styles.noticeGlyph}>ⓘ</Text>
            <View style={styles.noticeBody}>
              <Text style={styles.noticeStrong}>Row 8 needs a little attention.</Text>
              <Text style={styles.noticeText}>
                It has no name or website, so it won't be imported.
              </Text>
            </View>
          </View>

          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>Your items & tags</Text>
            <TouchableOpacity onPress={toggleAll}>
              <Text style={styles.smallAction}>
                {allAccepted ? 'Skip all tags' : 'Accept all tags'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            Edit a tag or tap its checkmark. Unchecked tags won't be saved.
          </Text>

          <View style={styles.reviewStack}>
            {rows.map((r) => (
              <View key={r.id} style={styles.reviewRow}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewInfo}>
                    <Text style={styles.reviewTitle}>{r.title}</Text>
                    <Text style={styles.reviewSub}>{r.subtitle}</Text>
                  </View>
                  {r.duplicate && (
                    <View style={styles.dupPill}>
                      <Text style={styles.dupPillText}>Duplicate?</Text>
                    </View>
                  )}
                </View>
                <View style={styles.reviewTag}>
                  <Text style={styles.reviewTagLabel}>TAG</Text>
                  <TextInput
                    style={styles.reviewTagInput}
                    value={r.tag}
                    maxLength={60}
                    onChangeText={(t) => setTag(r.id, t)}
                    accessibilityLabel={`Tag for ${r.title}`}
                  />
                  <TouchableOpacity
                    style={[
                      styles.acceptBtn,
                      r.accepted && styles.acceptBtnActive,
                    ]}
                    onPress={() => toggleAccept(r.id)}
                    accessibilityLabel={`Include tag for ${r.title}`}
                    accessibilityState={{ selected: r.accepted }}
                  >
                    <Text style={styles.acceptGlyph}>{r.accepted ? '✓' : '+'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.noticeWarm}>
            <View style={styles.noticeBody}>
              <Text style={styles.noticeStrong}>A familiar face: Google work.</Text>
              <Text style={styles.noticeText}>
                A login with this website and username is already in your vault. Keep
                the imported copy too?
              </Text>
              <View style={styles.choiceRow}>
                <TouchableOpacity
                  style={[
                    styles.choiceBtn,
                    duplicate === 'keep' && styles.choiceBtnActive,
                  ]}
                  onPress={() => setDuplicate('keep')}
                  accessibilityState={{ selected: duplicate === 'keep' }}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      duplicate === 'keep' && styles.choiceTextActive,
                    ]}
                  >
                    Keep both
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.choiceBtn,
                    duplicate === 'skip' && styles.choiceBtnActive,
                  ]}
                  onPress={() => setDuplicate('skip')}
                  accessibilityState={{ selected: duplicate === 'skip' }}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      duplicate === 'skip' && styles.choiceTextActive,
                    ]}
                  >
                    Skip this copy
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.stickyAction}>
            <TouchableOpacity
              style={[styles.primaryBtn, !duplicate && styles.primaryBtnDisabled]}
              onPress={confirmImport}
              disabled={!duplicate}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                Add {count} items to my vault →
              </Text>
            </TouchableOpacity>
            <Text style={styles.stickyHint}>
              {duplicate
                ? 'Only checked tags come along. Nothing saved yet.'
                : 'Choose what to do with the duplicate first.'}
            </Text>
            <TouchableOpacity style={styles.ghostBtn} onPress={importAgain}>
              <Text style={styles.ghostBtnText}>Cancel import</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {step === 'complete' && (
        <>
          <Steps step={3} />
          <View style={styles.completion}>
            <View style={styles.emblem}>
              <Text style={styles.emblemGlyph}>✓</Text>
            </View>
            <Text style={styles.eyebrow}>ALL SETTLED IN</Text>
            <Text style={styles.completionH1}>
              {importedCount} little things. One happy home.
            </Text>
            <Text style={styles.lede}>
              Your items are in your vault, with the tags you chose. One unreadable
              row was left behind.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={importAgain}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Bring in more items →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.textBtn} onPress={importAgain}>
              <Text style={styles.textBtnText}>Undo this import</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
    paddingBottom: 60,
  },
  steps: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.lg,
  },
  stepDot: {
    width: 24,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: '#E6DACE',
  },
  stepDotActive: {
    backgroundColor: colors.brandOrange,
  },
  pageHead: {
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.brandOrange,
    marginBottom: spacing.sm,
  },
  h1: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
    lineHeight: 34,
    marginBottom: 8,
  },
  lede: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  illustration: {
    backgroundColor: colors.warm,
    borderRadius: 26,
    height: 138,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  miniFileLeft: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: 4,
    transform: [{ rotate: '-7deg' }],
  },
  miniFileRight: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    transform: [{ rotate: '7deg' }],
  },
  miniFileLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  arrow: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sourceOptions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sourceOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 74,
    paddingHorizontal: spacing.md,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#E7DED4',
    backgroundColor: colors.surface,
  },
  sourceOptionActive: {
    backgroundColor: colors.assist,
    borderColor: '#BAC6F5',
  },
  sourceGlyph: {
    fontSize: 20,
  },
  sourceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  sourceSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  notice: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.cardBg,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeWarm: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#FFF3E8',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeGlyph: {
    fontSize: 16,
    color: '#9E5B28',
  },
  noticeBody: {
    flex: 1,
    gap: 2,
  },
  noticeStrong: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  primaryBtn: {
    backgroundColor: colors.brandOrange,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
    elevation: 2,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  hintCenter: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  howTo: {
    marginTop: spacing.lg,
    gap: 6,
  },
  howToSummary: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  howToText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.assist,
    borderRadius: 22,
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#CDD3ED',
  },
  summaryNum: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  smallAction: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandPeri,
  },
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  reviewStack: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  reviewRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#EEE3D8',
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.md,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewInfo: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  reviewSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  dupPill: {
    backgroundColor: colors.badgeBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  dupPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  reviewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewTagLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  reviewTagInput: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#F7F4F0',
    borderWidth: 1,
    borderColor: '#E9DFD4',
    paddingHorizontal: 13,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
  acceptBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DED5CC',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnActive: {
    backgroundColor: colors.brandOrange,
    borderColor: colors.brandOrange,
  },
  acceptGlyph: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  choiceBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E6DACE',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceBtnActive: {
    backgroundColor: colors.brandOrange,
    borderColor: colors.brandOrange,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  choiceTextActive: {
    color: colors.text,
  },
  stickyAction: {
    backgroundColor: colors.surface,
    gap: spacing.sm,
    alignItems: 'center',
  },
  stickyHint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  ghostBtn: {
    paddingVertical: spacing.md,
  },
  ghostBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  completion: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: spacing.md,
  },
  emblem: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emblemGlyph: {
    fontSize: 43,
    fontWeight: '700',
    color: colors.text,
  },
  completionH1: {
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  textBtn: {
    paddingVertical: spacing.sm,
  },
  textBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandPeri,
  },
});
