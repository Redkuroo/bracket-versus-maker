import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { HudButton } from '@/components/bracket/HudButton';
import { HudText } from '@/components/bracket/HudText';
import { HudTextInput } from '@/components/bracket/HudTextInput';
import { Netrunner } from '@/constants/netrunner-theme';

type RenameSaveModalProps = {
  visible: boolean;
  initialLabel?: string;
  onConfirm: (label: string) => void;
  onClose: () => void;
};

export function RenameSaveModal({
  visible,
  initialLabel = '',
  onConfirm,
  onClose,
}: RenameSaveModalProps) {
  const [label, setLabel] = useState(initialLabel);
  const canConfirm = label.trim().length > 0;

  useEffect(() => {
    if (!visible) return;
    setLabel(initialLabel);
  }, [visible, initialLabel]);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(label.trim());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.dialog}>
          <HudText variant="label" color={Netrunner.primary} glow style={styles.title}>
            RENAME SAVE
          </HudText>
          <HudText variant="caption" color={Netrunner.textMuted} style={styles.subtitle}>
            Choose a name for this saved tournament.
          </HudText>

          <HudTextInput
            label="Save name"
            value={label}
            onChangeText={setLabel}
            placeholder="Tournament name"
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />

          <View style={styles.actions}>
            <HudButton label="Cancel" variant="ghost" onPress={onClose} style={styles.actionButton} />
            <HudButton
              label="Save"
              variant="primary"
              onPress={handleConfirm}
              disabled={!canConfirm}
              style={styles.actionButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 11, 20, 0.88)',
  },
  dialog: {
    borderWidth: 1,
    borderColor: Netrunner.border,
    backgroundColor: Netrunner.background,
    padding: 20,
    gap: 12,
  },
  title: {
    letterSpacing: 2,
  },
  subtitle: {
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    minWidth: 100,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
});
