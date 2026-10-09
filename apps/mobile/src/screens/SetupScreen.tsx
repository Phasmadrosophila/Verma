import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { recoveryWordList } from '../state/vaultStore';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface SetupScreenProps {
  onSetupComplete: (password?: string, action?: 'import' | 'open') => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onSetupComplete }) => {
  const [step, setStep] = useState<'passphrase' | 'recovery' | 'complete'>('passphrase');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [confirmedBackup, setConfirmedBackup] = useState(false);
  const [error, setError] = useState('');

  const handleContinueToRecovery = () => {
    if (passphrase.length < 8) {
      setError('Master passphrase must be at least 8 characters.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match.');
      return;
    }
    setError('');
    setStep('recovery');
  };

  const handleFinish = () => {
    if (!confirmedBackup) {
      setError('Please confirm that you have stored your 24-word recovery phrase.');
      return;
    }
    setStep('complete');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {step !== 'complete' && (
        <View style={styles.header}>
          <Image
            source={require('../../assets/verma-logo.png')}
            style={styles.brandLogo}
          />
          <Text style={styles.eyebrow}>SECURE VAULT CREATION</Text>
          <Text style={styles.title}>
            {step === 'passphrase' ? 'Create Master Passphrase' : '24-Word Recovery Phrase'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'passphrase'
              ? 'Your master passphrase encrypts your SQLite database using libsodium.'
              : 'Write down these 24 words in order. Verma has zero servers and cannot restore lost phrases.'}
          </Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {step === 'passphrase' ? (
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Master Passphrase</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter strong passphrase"
              placeholderTextColor="#A89E92"
              secureTextEntry
              value={passphrase}
              onChangeText={(t) => {
                setPassphrase(t);
                setError('');
              }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Master Passphrase</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter passphrase"
              placeholderTextColor="#A89E92"
              secureTextEntry
              value={confirmPassphrase}
              onChangeText={(t) => {
                setConfirmPassphrase(t);
                setError('');
              }}
            />
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Local-first Guarantee</Text>
            <Text style={styles.noticeText}>
              Verma operates offline. This passphrase never touches a remote server.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinueToRecovery}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Continue to Recovery Phrase</Text>
          </TouchableOpacity>
        </View>
      ) : step === 'recovery' ? (
        <View style={styles.formSection}>
          {/* Recovery Words Grid */}
          <View style={styles.wordsGrid}>
            {recoveryWordList.map((word, idx) => (
              <View key={idx} style={styles.wordPill}>
                <Text style={styles.wordIndex}>{(idx + 1).toString().padStart(2, '0')}</Text>
                <Text style={styles.wordText}>{word}</Text>
              </View>
            ))}
          </View>

          {/* Confirmation Checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setConfirmedBackup(!confirmedBackup)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, confirmedBackup && styles.checkboxChecked]}>
              {confirmedBackup && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I have written down all 24 recovery words and stored them in a safe place.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, !confirmedBackup && styles.buttonDisabled]}
            onPress={handleFinish}
            disabled={!confirmedBackup}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Initialize & Unlock Vault</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.completionContainer}>
          <View style={styles.completionHero}>
            <View style={styles.successEmblem}>
              <Image
                source={require('../../assets/verma-logo.png')}
                style={styles.emblemLogo}
              />
              <View style={styles.emblemCheck}>
                <Text style={styles.emblemCheckText}>✓</Text>
              </View>
            </View>
          </View>

          <Text style={styles.completionTitle}>
            Your space.{'\n'}
            <Text style={{ color: colors.brandOrange }}>Your fresh start.</Text>
          </Text>

          <View style={styles.completionActions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => onSetupComplete(passphrase, 'import')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Import credentials →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => onSetupComplete(passphrase, 'open')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Open my vault</Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandLogo: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.brandPeri,
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
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
    textAlign: 'center',
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
  noticeCard: {
    backgroundColor: colors.assist,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F66BD',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#4F66BD',
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  wordPill: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    gap: 8,
  },
  wordIndex: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    width: 18,
  },
  wordText: {
    fontSize: 13,
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
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.brandOrange,
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DFD3C6',
    marginTop: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  completionContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    justifyContent: 'center',
  },
  completionHero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
    position: 'relative',
  },
  successEmblem: {
    width: 136,
    height: 136,
    borderRadius: 44,
    backgroundColor: colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  emblemLogo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  emblemCheck: {
    position: 'absolute',
    right: -10,
    bottom: -8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandPeri,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemCheckText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  completionTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -1,
    marginVertical: spacing.xl,
  },
  completionActions: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
