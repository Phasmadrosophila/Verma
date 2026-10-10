import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from '../components/Icon';
import type { ErrorKind } from '../state/apiClient';
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
      setError('Enter your demo passphrase to unlock.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onUnlock(passphrase.trim());
      setPassphrase('');
    } catch (err) {
      // `onUnlock` rejects with a classified ErrorKind. Only a true
      // Unauthorized means a wrong passphrase; an offline/transport failure
      // must not be mislabeled as a bad passphrase.
      const kind = err as ErrorKind;
      if (kind === 'Offline') {
        setError('You’re offline. Reconnect to unlock your vault.');
      } else if (kind === 'Unauthorized') {
        setError('That doesn’t match your demo passphrase. Try again.');
      } else {
        setError('Couldn’t unlock your vault. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Lock art band */}
      <View style={styles.art}>
        <View style={styles.artHalo} />
        <View style={styles.artRing} />
        <Icon name="lock" size={57} color={colors.text} />
        <Text style={styles.star}>✳</Text>
      </View>

      {/* Copy panel */}
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>A MOMENT JUST FOR YOU</Text>
        <Text style={styles.title}>Welcome back.</Text>
        <Text style={styles.subtitle}>
          Your little universe is right here.{'\n'}Unlock it when you’re ready.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Demo passphrase</Text>
          <TextInput
            style={styles.input}
            placeholder="Your demo passphrase"
            placeholderTextColor="#A89E92"
            secureTextEntry
            autoComplete="off"
            value={passphrase}
            onChangeText={(t) => {
              setPassphrase(t);
              setError('');
            }}
            onSubmitEditing={() => void handleUnlock()}
            returnKeyType="done"
            editable={!busy}
          />
          <Text style={styles.fieldHint}>For this preview, use: verma-demo</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.unlockBtn, busy && styles.unlockBtnDisabled]}
            onPress={() => void handleUnlock()}
            activeOpacity={0.85}
            disabled={busy}
          >
            <Icon name="lock" size={16} color={colors.surface} />
            <Text style={styles.unlockBtnText}>
              {busy ? 'Unlocking…' : 'Unlock my space'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          Offline security: AI access is revoked while your vault is locked.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  art: {
    height: 178,
    width: '100%',
    backgroundColor: colors.brandOrange,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artHalo: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.31)',
    top: 30,
  },
  artRing: {
    position: 'absolute',
    width: 125,
    height: 125,
    borderRadius: radii.pill,
    borderWidth: 30,
    borderColor: 'rgba(255,255,255,0.21)',
    right: -33,
    top: -30,
  },
  star: {
    position: 'absolute',
    top: 35,
    right: 66,
    fontSize: 30,
    color: colors.text,
  },
  panel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    marginTop: -21,
    paddingHorizontal: 26,
    paddingTop: 29,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: '#857567',
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
    marginTop: 13,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    marginTop: 10,
    marginBottom: spacing.xl,
  },
  form: {
    gap: 8,
  },
  label: {
    fontSize: 10,
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
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.text,
    paddingVertical: 16,
    borderRadius: radii.xxl,
    marginTop: spacing.lg,
  },
  unlockBtnDisabled: {
    opacity: 0.6,
  },
  unlockBtnText: {
    fontSize: typography.sizeSm,
    fontWeight: '700',
    color: colors.surface,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
