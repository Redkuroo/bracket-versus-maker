import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { HudButton } from '@/components/bracket/HudButton';
import { HudText } from '@/components/bracket/HudText';
import { Netrunner } from '@/constants/netrunner-theme';
import type { TournamentPlayer } from '@/types/bracket';

type ReassignControllerModalProps = {
  visible: boolean;
  participantName: string;
  players: TournamentPlayer[];
  currentPlayerId?: string | null;
  onSelect: (playerId: string) => void;
  onClose: () => void;
};

export function ReassignControllerModal({
  visible,
  participantName,
  players,
  currentPlayerId,
  onSelect,
  onClose,
}: ReassignControllerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.dialog}>
          <HudText variant="label" color={Netrunner.primary} glow style={styles.title}>
            REASSIGN CONTROLLER
          </HudText>
          <HudText variant="caption" color={Netrunner.textMuted} style={styles.subtitle}>
            Hold the controller label on a bracket card to change who controls {participantName}.
          </HudText>

          <View style={styles.playerList}>
            {players.length === 0 ? (
              <HudText variant="caption" color={Netrunner.textMuted}>
                No eligible players for this character.
              </HudText>
            ) : (
              players.map((player) => {
              const isSelected = player.id === currentPlayerId;
              return (
                <Pressable
                  key={player.id}
                  accessibilityRole="button"
                  onPress={() => {
                    onSelect(player.id);
                    onClose();
                  }}
                  style={[styles.playerOption, isSelected && styles.playerOptionSelected]}>
                  <HudText
                    variant="mono"
                    color={isSelected ? Netrunner.primary : Netrunner.text}
                    glow={isSelected}>
                    {player.name}
                  </HudText>
                </Pressable>
              );
            })
            )}
          </View>

          <HudButton label="Cancel" variant="ghost" onPress={onClose} style={styles.cancelButton} />
        </View>
      </View>
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
  playerList: {
    gap: 8,
    marginTop: 4,
  },
  playerOption: {
    borderWidth: 1,
    borderColor: Netrunner.border,
    backgroundColor: Netrunner.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  playerOptionSelected: {
    borderColor: Netrunner.primary,
    backgroundColor: '#0D2A22',
  },
  cancelButton: {
    alignSelf: 'flex-end',
    minWidth: 100,
    marginTop: 4,
  },
});
