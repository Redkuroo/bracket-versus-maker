import { ScrollView, StyleSheet, View } from 'react-native';

import { BracketRoundColumn } from '@/components/bracket/BracketRoundColumn';
import { HudText } from '@/components/bracket/HudText';
import { BracketLayout, Netrunner } from '@/constants/netrunner-theme';
import { getBracketVerticalOffset, getCanvasHeight } from '@/lib/bracket-engine';
import type { TournamentState } from '@/types/bracket';

type BracketCanvasProps = {
  tournament: TournamentState;
  onSelectWinner: (matchId: string, participantId: string) => void;
  onReassignController?: (participantId: string) => void;
};

export function BracketCanvas({ tournament, onSelectWinner, onReassignController }: BracketCanvasProps) {
  const unitHeight = BracketLayout.unitHeight;
  const matchNodeHeight = BracketLayout.matchNodeHeight;
  const rounds = tournament.rounds ?? [];

  if (rounds.length === 0) {
    return (
      <View style={styles.emptyState}>
        <HudText variant="body" color={Netrunner.textMuted}>
          Bracket data is missing. Go Home and launch the tournament again.
        </HudText>
      </View>
    );
  }

  const canvasHeight = getCanvasHeight(rounds, unitHeight);
  const firstRoundMatchCount = rounds[0]?.matches.length ?? 1;
  const verticalOffset = getBracketVerticalOffset(rounds, unitHeight, matchNodeHeight);
  const treeHeight = canvasHeight + BracketLayout.roundLabelHeight;
  const canvasWidth = Math.max(
    rounds.length * (BracketLayout.matchWidth + BracketLayout.roundGap) - BracketLayout.roundGap,
    BracketLayout.matchWidth,
  );

  const players = tournament.players ?? [];
  const controllerAssignments = tournament.controllerAssignments ?? {};

  const paddedWidth = canvasWidth + BracketLayout.canvasPadding * 2;
  const paddedHeight = treeHeight + BracketLayout.canvasPadding * 2;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.scrollHost}
        contentContainerStyle={styles.verticalScrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator>
        <ScrollView
          horizontal
          nestedScrollEnabled
          contentContainerStyle={styles.horizontalScrollContent}
          showsHorizontalScrollIndicator>
          <View style={[styles.bracketTree, { width: paddedWidth, height: paddedHeight }]}>
            <View
              style={[
                styles.bracketInner,
                {
                  width: canvasWidth,
                  height: treeHeight,
                  marginHorizontal: BracketLayout.canvasPadding,
                  marginVertical: BracketLayout.canvasPadding,
                },
              ]}>
              {rounds.map((round, index) => (
                <BracketRoundColumn
                  key={round.index}
                  round={round}
                  canvasHeight={canvasHeight}
                  unitHeight={unitHeight}
                  matchNodeHeight={matchNodeHeight}
                  firstRoundMatchCount={firstRoundMatchCount}
                  verticalOffset={verticalOffset}
                  activeMatchId={tournament.activeMatchId}
                  players={players}
                  controllerAssignments={controllerAssignments}
                  isFinal={index === rounds.length - 1}
                  onSelectWinner={onSelectWinner}
                  onReassignController={onReassignController}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scrollHost: {
    flex: 1,
  },
  verticalScrollContent: {
    flexGrow: 1,
  },
  horizontalScrollContent: {
    flexGrow: 1,
  },
  bracketTree: {
    flexGrow: 1,
  },
  bracketInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
