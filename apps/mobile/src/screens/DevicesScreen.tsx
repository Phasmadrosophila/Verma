import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from '../components/Icon';
import { colors, radii, spacing } from '../theme/tokens';

interface DevicesScreenProps {
  onShowToast: (msg: string) => void;
}

// Demo constants — this screen is a simulation. No real pairing or sync, no
// network. The pairing code and words below are a clearly-labeled SAMPLE shown
// to illustrate the flow; they are not secrets and are never sent anywhere.
const SAMPLE_PAIR_CODE = '482 915';
const SAMPLE_PAIR_WORDS = 'maple · harbor · quiet · lantern';

export const DevicesScreen: React.FC<DevicesScreenProps> = ({ onShowToast }) => {
  const [paused, setPaused] = useState(false);
  const [devices, setDevices] = useState<string[]>([]);
  const [pairingOpen, setPairingOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('My laptop');

  const circleCount = 2 + devices.length;

  const handleToggleSync = () => {
    const next = !paused;
    setPaused(next);
    onShowToast(next ? 'Demo sync paused' : 'Demo devices are up to date');
  };

  const handleConfirmPair = () => {
    const name = deviceName.trim();
    if (!name) {
      onShowToast('Give your device a name');
      return;
    }
    setDevices((prev) => [...prev, name]);
    setPairingOpen(false);
    onShowToast(`${name} joined your demo circle`);
    setDeviceName('My laptop');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Page head */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR WORLD, CONNECTED</Text>
        <Text style={styles.title}>Close, even when{'\n'}you're somewhere else.</Text>
        <Text style={styles.subtitle}>
          One personal space, across your devices.{'\n'}Always a little piece of home.
        </Text>
      </View>

      {/* Connected art */}
      <View style={styles.connectedArt}>
        <View style={styles.artCornerPeri} />
        <View style={styles.artCircleOrange} />
        <View style={styles.artRow}>
          <View style={styles.artDevice}>
            <Icon name="shield" size={26} color={colors.brandPeri} />
          </View>
          <Text style={styles.artLink}>{paused ? '⏸' : '⇄'}</Text>
          <View style={styles.artDevice}>
            <Icon name="shield" size={26} color={colors.brandOrange} />
          </View>
        </View>
      </View>

      {/* Trusted circle label */}
      <View style={styles.sectionLabel}>
        <Text style={styles.sectionTitle}>
          Your trusted circle <Text style={styles.sectionCount}>{circleCount}</Text>
        </Text>
        <View style={styles.pillBlue}>
          <Text style={styles.pillBlueText}>Demo</Text>
        </View>
      </View>

      {/* This phone */}
      <View style={styles.deviceCard}>
        <View style={styles.deviceRow}>
          <View style={styles.deviceIcon}>
            <Text style={styles.deviceGlyph}>📱</Text>
          </View>
          <View style={styles.grow}>
            <Text style={styles.deviceName}>This phone</Text>
            <Text style={styles.deviceMeta}>Right here with you</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>This device</Text>
          </View>
        </View>
      </View>

      {/* Studio desktop with pause/resume demo sync */}
      <View style={styles.deviceCard}>
        <View style={styles.deviceRow}>
          <View style={styles.deviceIcon}>
            <Text style={styles.deviceGlyph}>💻</Text>
          </View>
          <View style={styles.grow}>
            <Text style={styles.deviceName}>Studio desktop</Text>
            <Text style={styles.deviceMeta}>
              {paused ? 'Taking a little break' : 'Everything is up to date'}
            </Text>
          </View>
          <Text style={styles.deviceState}>{paused ? '⏸' : '✓'}</Text>
        </View>
        <View style={styles.deviceFooter}>
          <Text style={styles.deviceFooterText}>
            {paused ? 'Sync paused' : 'Last synced just now'}
          </Text>
          <TouchableOpacity onPress={handleToggleSync}>
            <Text style={styles.deviceFooterBtn}>
              {paused ? 'Resume demo sync' : 'Pause demo sync'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Added demo devices */}
      {devices.map((name, i) => (
        <View key={`${name}-${i}`} style={styles.deviceCard}>
          <View style={styles.deviceRow}>
            <View style={styles.deviceIcon}>
              <Text style={styles.deviceGlyph}>💻</Text>
            </View>
            <View style={styles.grow}>
              <Text style={styles.deviceName}>{name}</Text>
              <Text style={styles.deviceMeta}>Added in this demo session</Text>
            </View>
            <View style={styles.pillBlue}>
              <Text style={styles.pillBlueText}>Paired</Text>
            </View>
          </View>
        </View>
      ))}

      {/* Paused warm notice */}
      {paused && (
        <View style={styles.noticeWarm}>
          <Text style={styles.noticeGlyph}>⏸</Text>
          <View style={styles.grow}>
            <Text style={styles.noticeStrong}>Your phone is still good to go.</Text>
            <Text style={styles.noticeText}>
              Everything here stays available while the desktop is away.
            </Text>
          </View>
        </View>
      )}

      {/* Pair button */}
      <TouchableOpacity
        style={styles.pairBtn}
        onPress={() => setPairingOpen(true)}
        activeOpacity={0.85}
      >
        <Icon name="plus" size={18} color={colors.text} />
        <Text style={styles.pairBtnText}>Welcome another device</Text>
      </TouchableOpacity>

      {/* Simulated notice */}
      <View style={styles.noticeNeutral}>
        <Text style={styles.noticeGlyph}>ℹ️</Text>
        <View style={styles.grow}>
          <Text style={styles.noticeStrong}>A preview of a closer connection.</Text>
          <Text style={styles.noticeText}>
            Pairing and sync are simulated in this concept. No data is sent to another
            device.
          </Text>
        </View>
      </View>

      {/* Pair sheet */}
      <Modal
        animationType="slide"
        transparent
        visible={pairingOpen}
        onRequestClose={() => setPairingOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>A new member of your circle.</Text>
              <TouchableOpacity
                onPress={() => setPairingOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              In the full app, you'll check that both devices show the same number and
              words.
            </Text>

            <View style={styles.codeBox}>
              <Text style={styles.codeEyebrow}>SAMPLE PAIRING CODE</Text>
              <Text style={styles.pairCode}>{SAMPLE_PAIR_CODE}</Text>
              <Text style={styles.pairWords}>{SAMPLE_PAIR_WORDS}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Give this demo device a name</Text>
              <TextInput
                style={styles.input}
                value={deviceName}
                onChangeText={setDeviceName}
                maxLength={50}
                placeholder="My laptop"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmPair}>
              <Text style={styles.confirmBtnText}>The details match</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => setPairingOpen(false)}
            >
              <Text style={styles.ghostBtnText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
    marginBottom: 8,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  connectedArt: {
    backgroundColor: colors.assist,
    borderRadius: 27,
    height: 144,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artCornerPeri: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 70,
    height: 70,
    backgroundColor: colors.brandPeri,
    borderBottomRightRadius: 70,
    opacity: 0.45,
  },
  artCircleOrange: {
    position: 'absolute',
    right: -30,
    bottom: -25,
    width: 80,
    height: 80,
    borderWidth: 18,
    borderColor: colors.brandOrange,
    borderRadius: 40,
  },
  artRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  artDevice: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artLink: {
    fontSize: 22,
    color: colors.text,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  sectionCount: {
    color: colors.brandPeri,
  },
  deviceCard: {
    borderWidth: 1,
    borderColor: '#e9dfd5',
    borderRadius: 22,
    padding: 17,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceGlyph: {
    fontSize: 20,
  },
  grow: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  deviceMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  deviceState: {
    fontSize: 18,
    color: colors.success,
  },
  deviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#efe5dc',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  deviceFooterText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  deviceFooterBtn: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandPeri,
    minHeight: 20,
  },
  pill: {
    backgroundColor: colors.cardBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  pillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  pillBlue: {
    backgroundColor: colors.assist,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  pillBlueText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5c6daa',
  },
  noticeWarm: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.warm,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  noticeNeutral: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.cardBg,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  noticeGlyph: {
    fontSize: 16,
  },
  noticeStrong: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  noticeText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  pairBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandOrange,
    borderRadius: radii.pill,
    paddingVertical: 14,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  pairBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 13,
    color: colors.text,
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  codeBox: {
    backgroundColor: colors.assist,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  codeEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  pairCode: {
    fontSize: 36,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: 5,
  },
  pairWords: {
    fontSize: 13,
    color: '#5c6daa',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  confirmBtn: {
    backgroundColor: colors.brandOrange,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  ghostBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
});
