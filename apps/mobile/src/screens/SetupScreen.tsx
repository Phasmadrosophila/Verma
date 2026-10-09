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
import { recoveryWordList } from '../state/vaultStore';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface SetupScreenProps {
  onSetupComplete: () => void;
}

type Step = 1 | 2 | 3;

export const SetupScreen: React.FC<SetupScreenProps> = ({ onSetupComplete }) => {
  const [step, setStep] = useState<Step>(1);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [confirmedBackup, setConfirmedBackup] = useState(false);
  const [error, setError] = useState('');

  const handleContinueToRecovery = () => {
    if (passphrase.length < 8) {
      setError('Use at least 8 characters and a sample phrase, never a real password.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError('Those phrases don’t quite match. Try once more.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleContinueToCompletion = () => {
    if (!confirmedBackup) {
      setError('Please confirm you understand these are sample recovery words.');
      return;
    }
    setError('');
    setStep(3);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Step indicator */}
      <View style={styles.steps}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.stepBar, i <= step && styles.stepBarActive]}
          />
        ))}
      </View>

      {step !== 3 && (
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>
            {step === 1 ? 'LET’S MAKE THIS YOURS' : 'A SPARE KEY, JUST IN CASE'}
          </Text>
          <Text style={styles.title}>
            {step === 1
              ? 'Every little universe\nneeds a key.'
              : 'Some words\nworth keeping.'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'Choose a demo passphrase to try the lock and unlock flow.'
              : 'A preview of your recovery kit. These fixed sample words do not unlock or recover anything.'}
          </Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {step === 1 && (
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Demo passphrase</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter a sample passphrase"
              placeholderTextColor="#A89E92"
              secureTextEntry
              autoComplete="off"
              value={passphrase}
              onChangeText={(t) => {
                setPassphrase(t);
                setError('');
              }}
            />
            <Text style={styles.fieldHint}>
              Use at least 8 characters and a sample phrase, never a real password.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Once more, to be sure</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter passphrase"
              placeholderTextColor="#A89E92"
              secureTextEntry
              autoComplete="off"
              value={confirmPassphrase}
              onChangeText={(t) => {
                setConfirmPassphrase(t);
                setError('');
              }}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinueToRecovery}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Keep going</Text>
            <Icon name="import" size={16} color={colors.surface} />
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.formSection}>
          <View style={styles.notice}>
            <Icon name="shield" size={18} color="#714319" />
            <View style={styles.noticeBody}>
              <Text style={styles.noticeTitle}>
                For the real thing: write them down.
              </Text>
              <Text style={styles.noticeText}>
                Keep recovery words somewhere safe, away from the device they unlock.
              </Text>
            </View>
          </View>

          <View style={styles.wordsGrid}>
            {recoveryWordList.map((word, idx) => (
              <View key={idx} style={styles.wordPill}>
                <Text style={styles.wordIndex}>{idx + 1}</Text>
                <Text style={styles.wordText}>{word}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => {
              setConfirmedBackup(!confirmedBackup);
              setError('');
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, confirmedBackup && styles.checkboxChecked]}>
              {confirmedBackup && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I understand these are sample recovery words for the demo.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, !confirmedBackup && styles.buttonDisabled]}
            onPress={handleContinueToCompletion}
            disabled={!confirmedBackup}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>My little universe awaits</Text>
            <Icon name="import" size={16} color={colors.surface} />
          </TouchableOpacity>
        </View>
      )}

      {step === 3 && (
        <View style={styles.completion}>
          <View style={styles.emblem}>
            <Icon name="shield" size={44} color={colors.text} />
          </View>
          <Text style={styles.eyebrow}>MAKE YOURSELF AT HOME</Text>
          <Text style={[styles.title, styles.completionTitle]}>
            Your space.{'\n'}Your fresh start.
          </Text>
          <Text style={[styles.subtitle, styles.completionSubtitle]}>
            Your demo vault is ready. Bring in a few sample passwords or explore
            what’s already here.
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, styles.completionButton]}
            onPress={onSetupComplete}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Enter my vault</Text>
            <Icon name="import" size={16} color={colors.surface} />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: 40,
  },
  steps: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.xxl,
    paddingTop: spacing.sm,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: '#EDE4DA',
  },
  stepBarActive: {
    backgroundColor: colors.brandPeri,
  },
  heading: {
    marginBottom: spacing.xl,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: colors.brandPeri,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.9,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 22,
    color: colors.textMuted,
    maxWidth: 300,
  },
  errorBanner: {
    backgroundColor: '#FFEBEA',
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  formSection: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: typography.sizeBase,
    color: colors.text,
  },
  fieldHint: {
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: 4,
  },
  notice: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.warm,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  noticeBody: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#714319',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#684019',
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  wordPill: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F2ED',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.xl,
    gap: 8,
    minHeight: 35,
  },
  wordIndex: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    width: 16,
  },
  wordText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
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
  checkboxChecked: {
    backgroundColor: colors.brandOrange,
    borderColor: colors.brandOrange,
  },
  checkmark: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14,
  },
  checkboxLabel: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.text,
    flex: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.text,
    borderRadius: radii.xxl,
    paddingVertical: 16,
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: typography.sizeSm,
    fontWeight: '700',
    color: colors.surface,
  },
  completion: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emblem: {
    width: 108,
    height: 108,
    borderRadius: radii.pill,
    backgroundColor: colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  completionTitle: {
    textAlign: 'center',
    fontSize: 29,
    lineHeight: 36,
  },
  completionSubtitle: {
    textAlign: 'center',
  },
  completionButton: {
    marginTop: spacing.xxl,
    alignSelf: 'stretch',
  },
});
