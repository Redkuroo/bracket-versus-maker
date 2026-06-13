import { StyleSheet, View } from 'react-native';

import { PlayerCard } from '@/components/bracket/PlayerCard';
import { HudText } from '@/components/bracket/HudText';
import { BracketLayout, Netrunner, neonGlow } from '@/constants/netrunner-theme';
import type { BracketMatch } from '@/types/bracket';

type MatchNodeProps = {
  match: BracketMatch;
  isActive: boolean;
  onSelectWinner: (participantId: string) => void;
};

export function MatchNode({ match, isActive, onSelectWinner }: MatchNodeProps) {
  const canInteract = (match.status === 'active' || match.status === 'ready') && !match.winnerId;

  return (
    <View style={[styles.container, isActive && styles.activeContainer]}>
      {isActive && (
        <HudText variant="caption" color={Netrunner.secondary} style={styles.activeTag}>
          ACTIVE
        </HudText>
      )}
      <PlayerCard
        name={match.slotA.name}
        isActive={isActive && canInteract}
        isBye={match.slotA.isBye}
        isLoser={Boolean(match.winnerId && match.winnerId !== match.slotA.participantId)}
        isWinner={match.winnerId === match.slotA.participantId}
        disabled={!canInteract || !match.slotA.participantId}
        onPress={() => match.slotA.participantId && onSelectWinner(match.slotA.participantId)}
      />
      <View style={styles.vsRow}>
        <View style={styles.vsLine} />
        <HudText variant="caption" color={Netrunner.textMuted}>
          VS
        </HudText>
        <View style={styles.vsLine} />
      </View>
      <PlayerCard
        name={match.slotB.name}
        isActive={isActive && canInteract}
        isBye={match.slotB.isBye}
        isLoser={Boolean(match.winnerId && match.winnerId !== match.slotB.participantId)}
        isWinner={match.winnerId === match.slotB.participantId}
        disabled={!canInteract || !match.slotB.participantId}
        onPress={() => match.slotB.participantId && onSelectWinner(match.slotB.participantId)}
      />
    </View>
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
