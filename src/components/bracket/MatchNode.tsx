import { StyleSheet, View } from 'react-native';

import { HudText } from '@/components/bracket/HudText';
import { PlayerCard } from '@/components/bracket/PlayerCard';
import { BracketLayout, Netrunner, neonGlow } from '@/constants/netrunner-theme';
import { getControllerName, getSlotKind } from '@/lib/bracket-engine';
import type { BracketMatch, BracketSlot, TournamentPlayer } from '@/types/bracket';

type MatchNodeProps = {
  match: BracketMatch;
  isActive: boolean;
  players: TournamentPlayer[];
  controllerAssignments: Record<string, string>;
  onSelectWinner: (participantId: string) => void;
  onReassignController?: (participantId: string) => void;
};

export function MatchNode({
  match,
  isActive,
  players,
  controllerAssignments,
  onSelectWinner,
  onReassignController,
}: MatchNodeProps) {
  const canInteract = (match.status === 'active' || match.status === 'ready') && !match.winnerId;

  return (
    <View style={[styles.container, isActive && styles.activeContainer]}>
      {isActive && (
        <HudText variant="caption" color={Netrunner.secondary} style={styles.activeTag}>
          ACTIVE
        </HudText>
      )}
      <MatchSlot
        slot={match.slotA}
        players={players}
        controllerAssignments={controllerAssignments}
        isActive={isActive && canInteract}
        isLoser={Boolean(match.winnerId && match.winnerId !== match.slotA.participantId)}
        isWinner={match.winnerId === match.slotA.participantId}
        disabled={!canInteract || !match.slotA.participantId}
        onPress={() => match.slotA.participantId && onSelectWinner(match.slotA.participantId)}
        onReassignController={onReassignController}
      />
      <View style={styles.vsRow}>
        <View style={styles.vsLine} />
        <HudText variant="caption" color={Netrunner.textMuted}>
          VS
        </HudText>
        <View style={styles.vsLine} />
      </View>
      <MatchSlot
        slot={match.slotB}
        players={players}
        controllerAssignments={controllerAssignments}
        isActive={isActive && canInteract}
        isLoser={Boolean(match.winnerId && match.winnerId !== match.slotB.participantId)}
        isWinner={match.winnerId === match.slotB.participantId}
        disabled={!canInteract || !match.slotB.participantId}
        onPress={() => match.slotB.participantId && onSelectWinner(match.slotB.participantId)}
        onReassignController={onReassignController}
      />
    </View>
  );
}

function MatchSlot({
  slot,
  players,
  controllerAssignments,
  isActive,
  isWinner,
  isLoser,
  disabled,
  onPress,
  onReassignController,
}: {
  slot: BracketSlot;
  players: TournamentPlayer[];
  controllerAssignments: Record<string, string>;
  isActive: boolean;
  isWinner: boolean;
  isLoser: boolean;
  disabled: boolean;
  onPress: () => void;
  onReassignController?: (participantId: string) => void;
}) {
  const variant = getSlotKind(slot);
  const controllerName = getControllerName(slot.participantId, players, controllerAssignments);

  return (
    <PlayerCard
      name={slot.name}
      participantId={slot.participantId}
      imageUri={slot.imageUri}
      variant={variant}
      controllerName={controllerName}
      isActive={isActive}
      isBye={variant === 'bye'}
      isLoser={isLoser}
      isWinner={isWinner}
      disabled={disabled || variant !== 'player'}
      onPress={onPress}
      onControllerPress={
        slot.participantId && onReassignController
          ? () => onReassignController(slot.participantId!)
          : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: BracketLayout.matchWidth,
    gap: BracketLayout.slotGap,
    padding: 8,
    borderWidth: 1,
    borderColor: Netrunner.border,
    borderRadius: 0,
    backgroundColor: '#061018',
  },
  activeContainer: {
    borderColor: Netrunner.secondary,
    ...neonGlow(Netrunner.secondary, 12),
  },
  activeTag: {
    letterSpacing: 2,
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vsLine: {
    flex: 1,
    height: 1,
    backgroundColor: Netrunner.border,
  },
});
