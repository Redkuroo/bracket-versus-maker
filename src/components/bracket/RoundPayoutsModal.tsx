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
import { formatPeso } from '@/lib/bracket-engine';
import { Netrunner } from '@/constants/netrunner-theme';
import type { BracketRound } from '@/types/bracket';

type RoundPayoutsModalProps = {
  visible: boolean;
  rounds: BracketRound[];
  roundPayouts: Record<number, number>;
  onConfirm: (roundPayouts: Record<number, number>) => void;
  onClose: () => void;
};

function payoutsToInputs(
  rounds: BracketRound[],
  roundPayouts: Record<number, number>,
): Record<number, string> {
  const inputs: Record<number, string> = {};
  for (const round of rounds) {
    inputs[round.index] = String(roundPayouts[round.index] ?? round.index + 1);
  }
  return inputs;
}

function parsePayoutInput(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function RoundPayoutsModal({
  visible,
  rounds,
  roundPayouts,
  onConfirm,
  onClose,
}: RoundPayoutsModalProps) {
  const [inputs, setInputs] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!visible) return;
    setInputs(payoutsToInputs(rounds, roundPayouts));
  }, [visible, rounds, roundPayouts]);

  const updateInput = (roundIndex: number, value: string) => {
    const sanitized = value.replace(/[^\d]/g, '');
    setInputs((current) => ({ ...current, [roundIndex]: sanitized }));
  };

  const handleConfirm = () => {
    const next: Record<number, number> = {};
    for (const round of rounds) {
      next[round.index] = parsePayoutInput(inputs[round.index] ?? '0');
    }
    onConfirm(next);
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
            ROUND PAYOUTS
          </HudText>
          <HudText variant="caption" color={Netrunner.textMuted} style={styles.subtitle}>
            Set how many pesos the controlling human player earns for each match won in that round.
          </HudText>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            {rounds.map((round) => (
              <View key={`round-${round.index}`} style={styles.row}>
                <View style={styles.roundCopy}>
                  <HudText variant="label" color={Netrunner.secondary}>
                    {round.label}
                  </HudText>
                  <HudText variant="caption" color={Netrunner.textMuted}>
                    {round.matches.length} match{round.matches.length === 1 ? '' : 'es'}
                  </HudText>
                </View>
                <View style={styles.inputWrap}>
                  <HudTextInput
                    label="Win payout"
                    value={inputs[round.index] ?? '0'}
                    onChangeText={(text) => updateInput(round.index, text)}
                    placeholder="0"
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                </View>
                <HudText variant="mono" color={Netrunner.textMuted} style={styles.preview}>
                  {formatPeso(parsePayoutInput(inputs[round.index] ?? '0'))}
                </HudText>
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <HudButton label="Cancel" variant="ghost" onPress={onClose} style={styles.actionButton} />
            <HudButton
              label="Save"
              variant="primary"
              onPress={handleConfirm}
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
    maxHeight: 320,
  },
  scrollContent: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  roundCopy: {
    width: 108,
    gap: 2,
    paddingBottom: 10,
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
  },
  preview: {
    width: 44,
    textAlign: 'right',
    paddingBottom: 14,
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
