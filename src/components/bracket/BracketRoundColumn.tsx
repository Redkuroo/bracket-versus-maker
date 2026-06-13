import { StyleSheet, View } from 'react-native';

import { BracketRoundConnectors } from '@/components/bracket/BracketConnector';
import { HudText } from '@/components/bracket/HudText';
import { MatchNode } from '@/components/bracket/MatchNode';
import { BracketLayout, Netrunner } from '@/constants/netrunner-theme';
import { getMatchTop } from '@/lib/bracket-engine';
import type { BracketRound, TournamentPlayer } from '@/types/bracket';

type BracketRoundColumnProps = {
  round: BracketRound;
  canvasHeight: number;
  unitHeight: number;
  matchNodeHeight: number;
  firstRoundMatchCount: number;
  verticalOffset: number;
  activeMatchId: string | null;
  players: TournamentPlayer[];
  controllerAssignments: Record<string, string>;
  onSelectWinner: (matchId: string, participantId: string) => void;
  onReassignController?: (participantId: string) => void;
  isFinal: boolean;
};

export function BracketRoundColumn({
  round,
  canvasHeight,
  unitHeight,
  matchNodeHeight,
  firstRoundMatchCount,
  verticalOffset,
  activeMatchId,
  players,
  controllerAssignments,
  onSelectWinner,
  onReassignController,
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
          const top =
            getMatchTop(
              round.index,
              matchIndex,
              unitHeight,
              firstRoundMatchCount,
              round.matches.length,
              matchNodeHeight,
            ) + verticalOffset;
          const isActive = match.id === activeMatchId;

          return (
            <View key={match.id} style={[styles.matchWrap, { top, minHeight: matchNodeHeight }]}>
              <MatchNode
                match={match}
                isActive={isActive}
                players={players}
                controllerAssignments={controllerAssignments}
                onSelectWinner={(participantId) => onSelectWinner(match.id, participantId)}
                onReassignController={onReassignController}
              />
            </View>
          );
        })}

        {!isFinal && (
          <BracketRoundConnectors
            pairIndexes={pairIndexes}
            roundIndex={round.index}
            firstRoundMatchCount={firstRoundMatchCount}
            roundMatchCount={round.matches.length}
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
    overflow: 'visible',
  },
  matchWrap: {
    position: 'absolute',
    left: 0,
    width: BracketLayout.matchWidth,
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
});
