import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface LockedScreenProps {
  /** Resolves on success; rejects to signal invalid credentials. */
  onUnlock: (passphrase?: string) => void | Promise<void>;
}

export const LockedScreen: React.FC<LockedScreenProps> = ({ onUnlock }) => {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleUnlock = async () => {
    if (!passphrase.trim()) {
      setError('Please enter your master passphrase.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onUnlock(passphrase.trim());
      setPassphrase('');
    } catch {
      setError('That passphrase did not unlock the vault. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleBiometric = async () => {
    // Biometric authentication trigger (LocalAuthentication) — demo path.
    setBusy(true);
    try {
      await onUnlock();
    } catch {
      setError('Biometric unlock is unavailable right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Lock Graphic */}
        <View style={styles.lockBadge}>
          <Text style={styles.lockEmoji}>🔒</Text>
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.eyebrow}>ENCRYPTED AT REST</Text>
          <Text style={styles.title}>Vault is Locked</Text>
          <Text style={styles.subtitle}>
            Enter your master passphrase to decrypt your local vault storage.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Master passphrase (demo: verma-demo)"
              placeholderTextColor="#A89E92"
              secureTextEntry
              value={passphrase}
              onChangeText={(t) => {
                setPassphrase(t);
                setError('');
              }}
              onSubmitEditing={() => void handleUnlock()}
              returnKeyType="done"
              editable={!busy}
            />
          </View>

          <TouchableOpacity
            style={[styles.unlockBtn, busy && styles.unlockBtnDisabled]}
            onPress={() => void handleUnlock()}
            activeOpacity={0.8}
            disabled={busy}
          >
            <Text style={styles.unlockBtnText}>
              {busy ? 'Unlocking…' : 'Unlock Vault'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.biometricBtn}
            onPress={() => void handleBiometric()}
            activeOpacity={0.7}
            disabled={busy}
          >
            <Text style={styles.biometricIcon}>👆</Text>
            <Text style={styles.biometricBtnText}>Unlock with Biometrics</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Offline security: AI access is revoked while vault is locked.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.xxl,
    paddingVertical: 50,
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    width: '100%',
  },
  lockBadge: {
    width: 88,
    height: 88,
    borderRadius: radii.pill,
    backgroundColor: colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  lockEmoji: {
    fontSize: 40,
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brandPeri,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  errorBanner: {
    backgroundColor: '#FFEBEA',
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  formSection: {
    width: '100%',
    gap: spacing.md,
  },
  inputGroup: {
    width: '100%',
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: 15,
    fontSize: typography.sizeBase,
    color: colors.text,
    textAlign: 'center',
  },
  unlockBtn: {
    backgroundColor: colors.brandOrange,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  unlockBtnDisabled: {
    opacity: 0.6,
  },
  unlockBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  biometricIcon: {
    fontSize: 18,
  },
  biometricBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
