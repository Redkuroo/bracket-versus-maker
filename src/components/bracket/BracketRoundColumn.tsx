import { StyleSheet, View } from 'react-native';

import { BracketConnector } from '@/components/bracket/BracketConnector';
import { HudText } from '@/components/bracket/HudText';
import { MatchNode } from '@/components/bracket/MatchNode';
import { BracketLayout, Netrunner } from '@/constants/netrunner-theme';
import { getCanvasHeight, getMatchTop } from '@/lib/bracket-engine';
import type { BracketRound } from '@/types/bracket';

type BracketRoundColumnProps = {
  round: BracketRound;
  canvasHeight: number;
  unitHeight: number;
  activeMatchId: string | null;
  onSelectWinner: (matchId: string, participantId: string) => void;
  isFinal: boolean;
};

export function BracketRoundColumn({
  round,
  canvasHeight,
  unitHeight,
  activeMatchId,
  onSelectWinner,
  isFinal,
}: BracketRoundColumnProps) {
  return (
    <View style={[styles.column, { height: canvasHeight }]}>
      <HudText
        variant="label"
        color={isFinal ? Netrunner.secondary : Netrunner.primary}
        style={styles.roundLabel}
        glow={isFinal}>
        {round.label}
      </HudText>

      <View style={styles.matchesLayer}>
        {round.matches.map((match, matchIndex) => {
          const top = getMatchTop(round.index, matchIndex, unitHeight);
          const isActive = match.id === activeMatchId;
          const isComplete = Boolean(match.winnerId);
          const isActivePath = isActive || isComplete;

          return (
            <View key={match.id} style={[styles.matchWrap, { top }]}>
              <MatchNode
                match={match}
                isActive={isActive}
                onSelectWinner={(participantId) => onSelectWinner(match.id, participantId)}
              />
              {!isFinal && (
                <BracketConnector isComplete={isComplete} isActivePath={isActivePath} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: BracketLayout.matchWidth + BracketLayout.connectorWidth,
    marginRight: BracketLayout.roundGap - BracketLayout.connectorWidth,
  },
  roundLabel: {
    marginBottom: 12,
    textAlign: 'center',
  },
  matchesLayer: {
    flex: 1,
    position: 'relative',
  },
  matchWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
