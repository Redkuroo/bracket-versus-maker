import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { HudButton } from '@/components/bracket/HudButton';
import { HudText } from '@/components/bracket/HudText';
import { HudTextInput } from '@/components/bracket/HudTextInput';
import { Netrunner } from '@/constants/netrunner-theme';

type AddPlayersModalProps = {
  visible: boolean;
  initialNames?: string[];
  onConfirm: (names: string[]) => void;
  onClose: () => void;
};

function createEmptyRows(count: number): string[] {
  return Array.from({ length: count }, () => '');
}

export function AddPlayersModal({
  visible,
  initialNames = [],
  onConfirm,
  onClose,
}: AddPlayersModalProps) {
  const [names, setNames] = useState<string[]>(createEmptyRows(2));

  useEffect(() => {
    if (!visible) return;
    setNames(initialNames.length > 0 ? [...initialNames] : createEmptyRows(2));
  }, [visible]);

  const validNames = names.map((name) => name.trim()).filter((name) => name.length > 0);
  const canConfirm = validNames.length > 0;

  const updateName = (index: number, value: string) => {
    setNames((current) => current.map((name, nameIndex) => (nameIndex === index ? value : name)));
  };

  const addRow = () => {
    setNames((current) => [...current, '']);
  };

  const removeRow = (index: number) => {
    setNames((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(validNames);
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
            ADD PLAYERS
          </HudText>
          <HudText variant="caption" color={Netrunner.textMuted} style={styles.subtitle}>
            Enter human player names. Characters in Round 1 will be assigned evenly when you confirm.
          </HudText>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            {names.map((name, index) => (
              <View key={`player-${index}`} style={styles.row}>
                <View style={styles.inputWrap}>
                  <HudTextInput
                    label={`Player ${index + 1}`}
                    value={name}
                    onChangeText={(text) => updateName(index, text)}
                    placeholder={`Player ${index + 1}`}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
                {names.length > 1 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove player ${index + 1}`}
                    onPress={() => removeRow(index)}
                    style={styles.removeButton}>
                    <HudText variant="caption" color={Netrunner.danger}>
                      ✕
                    </HudText>
                  </Pressable>
                )}
              </View>
            ))}
          </ScrollView>

          <Pressable accessibilityRole="button" onPress={addRow} style={styles.addRowButton}>
            <HudText variant="caption" color={Netrunner.secondary}>
              + Add another player
            </HudText>
          </Pressable>

          <View style={styles.actions}>
            <HudButton label="Cancel" variant="ghost" onPress={onClose} style={styles.actionButton} />
            <HudButton
              label="Confirm"
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
    maxHeight: '85%',
  },
  title: {
    letterSpacing: 2,
  },
  subtitle: {
    lineHeight: 18,
  },
  scroll: {
    maxHeight: 280,
  },
  scrollContent: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputWrap: {
    flex: 1,
  },
  removeButton: {
    width: 36,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Netrunner.border,
    backgroundColor: Netrunner.surface,
  },
  addRowButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
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
