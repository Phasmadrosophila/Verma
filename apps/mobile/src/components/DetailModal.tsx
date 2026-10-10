import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { classifyError } from '../state/apiClient';
import { MobileVaultEntry } from '../state/vaultStore';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface DetailModalProps {
  entry: MobileVaultEntry | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (entry: MobileVaultEntry) => void;
  onDelete: (id: string | number) => void;
  onCopy: (label: string, text: string) => void;
  /** Lazily fetch the plaintext secret — called ONLY on explicit reveal. */
  onRevealSecret: (id: string | number) => Promise<string>;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  entry,
  visible,
  onClose,
  onEdit,
  onDelete,
  onCopy,
  onRevealSecret,
}) => {
  // The plaintext secret is held only while revealed, and only in this
  // component's local state — never in the list / App state.
  const [secret, setSecret] = useState<string | null>(null);
  const [revealBusy, setRevealBusy] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  if (!entry) return null;

  const revealed = secret !== null;

  const clearSecret = () => {
    setSecret(null);
    setRevealError(null);
    setRevealBusy(false);
  };

  const handleClose = () => {
    clearSecret();
    onClose();
  };

  const handleToggleReveal = async () => {
    if (revealed) {
      clearSecret();
      return;
    }
    setRevealBusy(true);
    setRevealError(null);
    try {
      const value = await onRevealSecret(entry.id);
      setSecret(value);
    } catch (err) {
      const kind = classifyError(err);
      setRevealError(
        kind === 'Locked'
          ? 'Vault locked — unlock to reveal'
          : kind === 'Offline'
          ? 'Offline — can’t reach your vault'
          : 'Could not load secret'
      );
    } finally {
      setRevealBusy(false);
    }
  };

  const getSecretDisplay = () => {
    if (revealError) return revealError;
    if (revealBusy) return 'Revealing…';
    if (revealed) return secret;
    return '••••••••••••••••';
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>
                {entry.title.slice(0, 2).toUpperCase()}
              </Text>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.entryTitle}>{entry.title}</Text>
              <Text style={styles.entrySubtitle}>{entry.subtitle || entry.domain}</Text>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityLabel="Close"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Tags */}
            {entry.tags.length > 0 && (
              <View style={styles.tagRow}>
                {entry.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Username / Account */}
            {entry.user && (
              <View style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Account / Username</Text>
                <View style={styles.fieldActionRow}>
                  <Text style={styles.fieldValue}>{entry.user}</Text>
                  <TouchableOpacity
                    onPress={() => onCopy('Username', entry.user || '')}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.actionBtnText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Domain / Website */}
            {entry.domain && (
              <View style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Website</Text>
                <View style={styles.fieldActionRow}>
                  <Text style={styles.fieldValue}>{entry.domain}</Text>
                  <TouchableOpacity
                    onPress={() => onCopy('Website', entry.domain || '')}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.actionBtnText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Secret Field (Enforces zero-secret exposure by default) */}
            <View style={styles.fieldCard}>
              <View style={styles.secretHeader}>
                <Text style={styles.fieldLabel}>
                  {entry.type === 'note'
                    ? 'Secure Note Body'
                    : entry.type === 'api'
                    ? 'API Key Secret'
                    : 'Password'}
                </Text>
                <TouchableOpacity
                  onPress={() => void handleToggleReveal()}
                  style={styles.revealBtn}
                  disabled={revealBusy}
                >
                  <Text style={styles.revealBtnText}>
                    {revealed ? 'Hide secret' : revealBusy ? 'Revealing…' : 'Reveal secret'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fieldActionRow}>
                <Text
                  style={[
                    styles.fieldValue,
                    styles.secretText,
                    !revealed && styles.secretMasked,
                  ]}
                  selectable={revealed}
                >
                  {getSecretDisplay()}
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    // Fetch on demand if not already revealed; never cache in list state.
                    const value = revealed ? secret : await onRevealSecret(entry.id).catch(() => null);
                    if (value) onCopy('Secret', value);
                  }}
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                >
                  <Text style={styles.actionBtnPrimaryText}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Security Notice */}
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Local-first Security</Text>
              <Text style={styles.noticeBody}>
                Stored only on this device. This secret never leaves your device and
                is never exposed to the Local AI assistant.
              </Text>
            </View>

            {/* Metadata Footer */}
            <Text style={styles.updatedText}>Last updated: {entry.updated}</Text>

            {/* Actions */}
            <View style={styles.bottomButtons}>
              <TouchableOpacity
                onPress={() => {
                  handleClose();
                  onEdit(entry);
                }}
                style={styles.editButton}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  handleClose();
                  onDelete(entry.id);
                }}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    maxHeight: '85%',
    paddingTop: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E9E2',
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  brandBadgeText: {
    fontSize: typography.sizeMd,
    fontWeight: '700',
    color: colors.text,
  },
  headerInfo: {
    flex: 1,
  },
  entryTitle: {
    fontSize: typography.sizeLg,
    fontWeight: '700',
    color: colors.text,
  },
  entrySubtitle: {
    fontSize: typography.sizeSm,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: '#F4EEE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: spacing.xxl,
  },
  bodyContent: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.xs,
  },
  tagPill: {
    backgroundColor: colors.badgeBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  tagText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  fieldCard: {
    backgroundColor: colors.inputBg,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  fieldLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldValue: {
    fontSize: typography.sizeBase,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
    marginRight: spacing.sm,
  },
  secretHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  revealBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  revealBtnText: {
    fontSize: 11,
    color: colors.brandPeri,
    fontWeight: '600',
  },
  secretText: {
    fontFamily: 'Courier',
    fontSize: typography.sizeBase,
  },
  secretMasked: {
    letterSpacing: 3,
  },
  actionBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#E6DACE',
  },
  actionBtnText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  actionBtnPrimary: {
    backgroundColor: colors.brandOrange,
    borderColor: colors.brandOrange,
  },
  actionBtnPrimaryText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '700',
  },
  noticeCard: {
    backgroundColor: colors.assist,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  noticeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F66BD',
    marginBottom: 4,
  },
  noticeBody: {
    fontSize: 11,
    lineHeight: 16,
    color: '#4F66BD',
  },
  updatedText: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FFEBEA',
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
});
