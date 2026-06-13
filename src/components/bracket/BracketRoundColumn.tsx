import { StyleSheet, View } from 'react-native';

import { BracketRoundConnectors } from '@/components/bracket/BracketConnector';
import { HudText } from '@/components/bracket/HudText';
import { MatchNode } from '@/components/bracket/MatchNode';
import { BracketLayout, Netrunner } from '@/constants/netrunner-theme';
import { getMatchTop } from '@/lib/bracket-engine';
import type { BracketRound } from '@/types/bracket';

type BracketRoundColumnProps = {
  round: BracketRound;
  canvasHeight: number;
  unitHeight: number;
  matchNodeHeight: number;
  verticalOffset: number;
  activeMatchId: string | null;
  onSelectWinner: (matchId: string, participantId: string) => void;
  isFinal: boolean;
};

export function BracketRoundColumn({
  round,
  canvasHeight,
  unitHeight,
  matchNodeHeight,
  verticalOffset,
  activeMatchId,
  onSelectWinner,
  isFinal,
}: BracketRoundColumnProps) {
  const pairIndexes = round.matches
    .map((_, index) => index)
    .filter((index) => index % 2 === 0 && index + 1 < round.matches.length);

  const getMatchByIndex = (index: number) => round.matches[index];

  return (
    <View style={[styles.column, { height: canvasHeight + BracketLayout.roundLabelHeight }]}>
      <HudText
        variant="label"
        color={isFinal ? Netrunner.secondary : Netrunner.primary}
        style={styles.roundLabel}
        glow={isFinal}>
        {round.label}
      </HudText>

      <View style={[styles.matchesLayer, { height: canvasHeight }]}>
        {round.matches.map((match, matchIndex) => {
          const top = getMatchTop(round.index, matchIndex, unitHeight) + verticalOffset;
          const isActive = match.id === activeMatchId;

          return (
            <View key={match.id} style={[styles.matchWrap, { top, height: matchNodeHeight }]}>
              <MatchNode
                match={match}
                isActive={isActive}
                onSelectWinner={(participantId) => onSelectWinner(match.id, participantId)}
              />
            </View>
          );
        })}

        {!isFinal && (
          <BracketRoundConnectors
            pairIndexes={pairIndexes}
            roundIndex={round.index}
            unitHeight={unitHeight}
            matchNodeHeight={matchNodeHeight}
            verticalOffset={verticalOffset}
            getPairActive={(topIndex, bottomIndex) => {
              const topMatch = getMatchByIndex(topIndex);
              const bottomMatch = getMatchByIndex(bottomIndex);
              return (
                topMatch?.id === activeMatchId ||
                bottomMatch?.id === activeMatchId ||
                topMatch?.status === 'active' ||
                bottomMatch?.status === 'active'
              );
            }}
            getPairComplete={(topIndex, bottomIndex) => {
              const topMatch = getMatchByIndex(topIndex);
              const bottomMatch = getMatchByIndex(bottomIndex);
              return Boolean(topMatch?.winnerId || bottomMatch?.winnerId);
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: BracketLayout.matchWidth + BracketLayout.roundGap,
  },
  roundLabel: {
    height: BracketLayout.roundLabelHeight,
    marginBottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  matchesLayer: {
    position: 'relative',
  },
  matchWrap: {
    position: 'absolute',
    left: 0,
    width: BracketLayout.matchWidth,
    justifyContent: 'center',
  },
});
