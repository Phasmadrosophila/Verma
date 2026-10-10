import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  EntryType,
  MobileVaultEntry,
  generatePassword,
} from '../state/vaultStore';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface AddEditModalProps {
  visible: boolean;
  entryToEdit: MobileVaultEntry | null;
  onClose: () => void;
  onSave: (
    entry: Omit<MobileVaultEntry, 'id' | 'updated'> & { id?: string | number }
  ) => void;
  /** Fetch the plaintext secret for an existing entry being edited. */
  onLoadSecret: (id: string | number) => Promise<string>;
}

export const AddEditModal: React.FC<AddEditModalProps> = ({
  visible,
  entryToEdit,
  onClose,
  onSave,
  onLoadSecret,
}) => {
  const [type, setType] = useState<EntryType>('login');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [user, setUser] = useState('');
  const [domain, setDomain] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [secret, setSecret] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [revealSecret, setRevealSecret] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (entryToEdit) {
      setType(entryToEdit.type);
      setTitle(entryToEdit.title);
      setSubtitle(entryToEdit.subtitle || '');
      setUser(entryToEdit.user || '');
      setDomain(entryToEdit.domain || '');
      setTagsStr(entryToEdit.tags.join(', '));
      setFavorite(entryToEdit.favorite);
      // The list entry carries no secret; fetch it lazily for editing.
      if (entryToEdit.secret) {
        setSecret(entryToEdit.secret);
      } else {
        setSecret('');
        void onLoadSecret(entryToEdit.id)
          .then((value) => {
            if (!cancelled) setSecret(value);
          })
          .catch(() => {
            /* leave empty; user can re-enter */
          });
      }
    } else {
      setType('login');
      setTitle('');
      setSubtitle('');
      setUser('');
      setDomain('');
      setTagsStr('');
      setSecret(generatePassword(18));
      setFavorite(false);
    }
    setRevealSecret(false);
    return () => {
      cancelled = true;
    };
  }, [entryToEdit, visible, onLoadSecret]);

  const handleGenerate = () => {
    const pw = generatePassword(20);
    setSecret(pw);
    setRevealSecret(true);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      id: entryToEdit ? entryToEdit.id : undefined,
      type,
      title: title.trim(),
      subtitle: subtitle.trim(),
      user: user.trim() || undefined,
      domain: domain.trim() || undefined,
      tags,
      favorite,
      brand: title.toLowerCase().replace(/[^a-z0-9]/g, ''),
      secret: secret.trim(),
    });

    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {entryToEdit ? 'Edit Item' : 'New Item'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Type selector */}
            <View style={styles.typeSelector}>
              {(['login', 'note', 'api'] as EntryType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    styles.typeOption,
                    type === t && styles.typeOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      type === t && styles.typeOptionTextActive,
                    ]}
                  >
                    {t === 'login' ? 'Login' : t === 'note' ? 'Secure Note' : 'API Key'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. GitHub, Netflix, Work Wi-Fi"
                placeholderTextColor="#A89E92"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Subtitle / Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subtitle / Label</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Work account, Production cluster"
                placeholderTextColor="#A89E92"
                value={subtitle}
                onChangeText={setSubtitle}
              />
            </View>

            {/* Username / User */}
            {type !== 'note' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username / Email / Identifier</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. user@example.com"
                  placeholderTextColor="#A89E92"
                  value={user}
                  onChangeText={setUser}
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Domain / Website */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Domain / Website</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. github.com"
                placeholderTextColor="#A89E92"
                value={domain}
                onChangeText={setDomain}
                autoCapitalize="none"
              />
            </View>

            {/* Tags */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tags (comma-separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="Work, Development, Cloud"
                placeholderTextColor="#A89E92"
                value={tagsStr}
                onChangeText={setTagsStr}
              />
            </View>

            {/* Secret Field with CSPRNG Generator */}
            <View style={styles.inputGroup}>
              <View style={styles.secretLabelRow}>
                <Text style={styles.label}>
                  {type === 'note' ? 'Secret Note Body' : 'Secret / Password'}
                </Text>
                {type !== 'note' && (
                  <TouchableOpacity onPress={handleGenerate} style={styles.genBtn}>
                    <Text style={styles.genBtnText}>⚡ Generate CSPRNG</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.secretInputWrapper}>
                <TextInput
                  style={[styles.input, type === 'note' && styles.noteInput]}
                  secureTextEntry={!revealSecret && type !== 'note'}
                  multiline={type === 'note'}
                  placeholder="Enter or generate secret"
                  placeholderTextColor="#A89E92"
                  value={secret}
                  onChangeText={setSecret}
                  autoCapitalize="none"
                />
                {type !== 'note' && (
                  <TouchableOpacity
                    onPress={() => setRevealSecret(!revealSecret)}
                    style={styles.eyeBtn}
                  >
                    <Text style={styles.eyeBtnText}>
                      {revealSecret ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Save Button */}
            <View style={styles.bottomButtons}>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
                disabled={!title.trim()}
              >
                <Text style={styles.saveBtnText}>Save to Vault</Text>
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
    maxHeight: '90%',
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E9E2',
  },
  headerTitle: {
    fontSize: typography.sizeLg,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: '#F4EEE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.text,
  },
  body: {
    paddingHorizontal: spacing.xxl,
  },
  bodyContent: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F2EDE6',
    borderRadius: radii.pill,
    padding: 3,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: colors.warm,
  },
  typeOptionText: {
    fontSize: typography.sizeSm,
    fontWeight: '500',
    color: colors.textMuted,
  },
  typeOptionTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: 2,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    fontSize: typography.sizeBase,
    color: colors.text,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  secretLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  genBtnText: {
    fontSize: 11,
    color: colors.brandPeri,
    fontWeight: '700',
  },
  secretInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  eyeBtnText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  bottomButtons: {
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  saveBtn: {
    backgroundColor: colors.brandOrange,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: typography.sizeBase,
    fontWeight: '700',
    color: colors.text,
  },
});
