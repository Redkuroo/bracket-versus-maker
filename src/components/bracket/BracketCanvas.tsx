import { ScrollView, StyleSheet, View } from 'react-native';

import { BracketRoundColumn } from '@/components/bracket/BracketRoundColumn';
import { BracketLayout } from '@/constants/netrunner-theme';
import { getCanvasHeight } from '@/lib/bracket-engine';
import type { TournamentState } from '@/types/bracket';

type BracketCanvasProps = {
  tournament: TournamentState;
  scale?: number;
  onSelectWinner: (matchId: string, participantId: string) => void;
};

export function BracketCanvas({ tournament, scale = 1, onSelectWinner }: BracketCanvasProps) {
  const unitHeight = BracketLayout.unitHeight;
  const canvasHeight = getCanvasHeight(tournament.rounds, unitHeight);
  const canvasWidth =
    tournament.rounds.length * (BracketLayout.matchWidth + BracketLayout.roundGap) +
    BracketLayout.canvasPadding * 2;
  const scaledWidth = canvasWidth * scale;
  const scaledHeight = (canvasHeight + 48) * scale;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        bounces
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.horizontalContent, { minWidth: scaledWidth }]}>
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.verticalContent, { minHeight: scaledHeight }]}>
          <View style={[styles.scaleHost, { width: scaledWidth, height: scaledHeight }]}>
            <View
              style={[
                styles.bracketTree,
                {
                  height: canvasHeight,
                  transform: [{ scale }],
                  transformOrigin: 'top left',
                },
              ]}>
              {tournament.rounds.map((round, index) => (
                <BracketRoundColumn
                  key={round.index}
                  round={round}
                  canvasHeight={canvasHeight}
                  unitHeight={unitHeight}
                  activeMatchId={tournament.activeMatchId}
                  isFinal={index === tournament.rounds.length - 1}
                  onSelectWinner={onSelectWinner}
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
  horizontalContent: {
    paddingHorizontal: BracketLayout.canvasPadding,
    paddingVertical: BracketLayout.canvasPadding,
  },
  verticalContent: {
    paddingBottom: BracketLayout.canvasPadding,
  },
  scaleHost: {
    overflow: 'visible',
  },
  bracketTree: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
