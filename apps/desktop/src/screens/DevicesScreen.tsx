import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PairedDevice } from '../state/vaultStore';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface DevicesScreenProps {
  onShowToast: (msg: string) => void;
}

const initialDevices: PairedDevice[] = [
  {
    id: 'dev-laptop-01',
    name: "Helena's MacBook Pro",
    type: 'laptop',
    lastSync: 'Just now',
    status: 'active',
  },
  {
    id: 'dev-desktop-02',
    name: 'Home Linux Workstation',
    type: 'laptop',
    lastSync: '15 mins ago',
    status: 'active',
  },
];

export const DevicesScreen: React.FC<DevicesScreenProps> = ({ onShowToast }) => {
  const [directSyncEnabled, setDirectSyncEnabled] = useState(true);
  const [devices, setDevices] = useState<PairedDevice[]>(initialDevices);
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [pairingPhrase, setPairingPhrase] = useState('meadow-cobalt-lantern');
  const [pairingCode, setPairingCode] = useState('4821');

  const localDeviceId = 'ed25519:7f8a42...9c1b52';

  const handleToggleSync = () => {
    const next = !directSyncEnabled;
    setDirectSyncEnabled(next);
    onShowToast(next ? 'Direct QUIC sync enabled' : 'Direct sync paused');
  };

  const handleTriggerSyncNow = () => {
    onShowToast('Direct QUIC sync synchronized with 2 devices');
  };

  const handleGeneratePairingCode = () => {
    setPairingPhrase('orchard-beacon-summit');
    setPairingCode(Math.floor(1000 + Math.random() * 9000).toString());
    setPairingModalOpen(true);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>QUIC TRANSPORT</Text>
        </View>
        <Text style={styles.title}>Direct Device Sync</Text>
        <Text style={styles.subtitle}>
          Serverless, direct peer-to-peer sync between your authenticated devices using
          QUIC and SPAKE2 pairing.
        </Text>
      </View>

      {/* Local Device Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>THIS DEVICE</Text>
        <View style={styles.deviceRow}>
          <View style={styles.deviceIconBox}>
            <Text style={styles.deviceIcon}>📱</Text>
          </View>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>Android Mobile App</Text>
            <Text style={styles.deviceHash}>Fingerprint: {localDeviceId}</Text>
          </View>
        </View>

        {/* Sync toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Direct QUIC Sync</Text>
            <Text style={styles.toggleDesc}>
              Listen for authenticated peer devices on the local network
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleToggleSync}
            style={[styles.toggleBtn, directSyncEnabled && styles.toggleBtnActive]}
          >
            <View
              style={[
                styles.toggleThumb,
                directSyncEnabled && styles.toggleThumbActive,
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Paired Devices List */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>
          PAIRED DEVICES ({devices.length})
        </Text>
        <TouchableOpacity onPress={handleTriggerSyncNow}>
          <Text style={styles.syncNowBtn}>Sync Now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.deviceList}>
        {devices.map((dev) => (
          <View key={dev.id} style={styles.pairedCard}>
            <View style={styles.pairedLeft}>
              <View style={styles.pairedIconBox}>
                <Text style={styles.pairedIcon}>💻</Text>
              </View>
              <View>
                <Text style={styles.pairedName}>{dev.name}</Text>
                <Text style={styles.pairedMeta}>Last sync: {dev.lastSync}</Text>
              </View>
            </View>

            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Pair New Device Action */}
      <TouchableOpacity
        style={styles.pairNewBtn}
        onPress={handleGeneratePairingCode}
        activeOpacity={0.8}
      >
        <Text style={styles.pairNewBtnText}>+ Pair Another Device</Text>
      </TouchableOpacity>

      {/* Protocol Guarantee */}
      <View style={styles.protocolCard}>
        <Text style={styles.protocolTitle}>Zero Central Server</Text>
        <Text style={styles.protocolDesc}>
          Direct sync uses Syncthing-style QUIC tunnels authenticated via Ed25519
          cryptographic device keys. No cloud provider ever receives your encrypted vault
          payloads.
        </Text>
      </View>

      {/* Pairing Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={pairingModalOpen}
        onRequestClose={() => setPairingModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SPAKE2 Device Pairing</Text>
              <TouchableOpacity
                onPress={() => setPairingModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Enter this pairing phrase and confirmation code on your other device to
              establish an authenticated QUIC channel:
            </Text>

            <View style={styles.codeBox}>
              <Text style={styles.phraseText}>{pairingPhrase}</Text>
              <View style={styles.codeBadge}>
                <Text style={styles.codeText}>PIN #{pairingCode}</Text>
              </View>
            </View>

            <Text style={styles.pairingHint}>
              Waiting for incoming pairing request over local network...
            </Text>

            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => {
                setPairingModalOpen(false);
                onShowToast('New device paired successfully');
              }}
            >
              <Text style={styles.dismissBtnText}>Done</Text>
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
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.assist,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F66BD',
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
  card: {
    backgroundColor: colors.inputBg,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  deviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceIcon: {
    fontSize: 22,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  deviceHash: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#EBE2D7',
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  toggleDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  toggleBtn: {
    width: 44,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: '#DDD3C7',
    padding: 3,
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.brandOrange,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  syncNowBtn: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandPeri,
  },
  deviceList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pairedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#EFE7DE',
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  pairedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pairedIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairedIcon: {
    fontSize: 18,
  },
  pairedName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  pairedMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF7EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: '#2E8540',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2E8540',
  },
  pairNewBtn: {
    borderWidth: 1,
    borderColor: '#DED4CA',
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pairNewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  protocolCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  protocolTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  protocolDesc: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
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
    backgroundColor: colors.inputBg,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  phraseText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
  },
  codeBadge: {
    backgroundColor: colors.warm,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8F5413',
  },
  pairingHint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  dismissBtn: {
    backgroundColor: colors.brandOrange,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
});
