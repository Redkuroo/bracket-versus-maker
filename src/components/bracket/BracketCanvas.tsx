import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { BracketRoundColumn } from '@/components/bracket/BracketRoundColumn';
import { BracketLayout } from '@/constants/netrunner-theme';
import { getBracketVerticalOffset, getCanvasHeight } from '@/lib/bracket-engine';
import type { TournamentState } from '@/types/bracket';

const MAX_SCALE = 2.5;
/** Prevents zero/inverted scale; not a practical zoom-out cap. */
const SCALE_EPSILON = 0.001;

function clampScale(value: number) {
  'worklet';
  return Math.min(MAX_SCALE, Math.max(SCALE_EPSILON, value));
}

type BracketCanvasProps = {
  tournament: TournamentState;
  onSelectWinner: (matchId: string, participantId: string) => void;
};

export function BracketCanvas({ tournament, onSelectWinner }: BracketCanvasProps) {
  const unitHeight = BracketLayout.unitHeight;
  const matchNodeHeight = BracketLayout.matchNodeHeight;
  const canvasHeight = getCanvasHeight(tournament.rounds, unitHeight);
  const firstRoundMatchCount = tournament.rounds[0]?.matches.length ?? 1;
  const verticalOffset = getBracketVerticalOffset(tournament.rounds, unitHeight, matchNodeHeight);
  const treeHeight = canvasHeight + BracketLayout.roundLabelHeight;
  const canvasWidth =
    tournament.rounds.length * (BracketLayout.matchWidth + BracketLayout.roundGap) -
    BracketLayout.roundGap;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = clampScale(savedScale.value * event.scale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .activeOffsetX([-8, 8])
    .activeOffsetY([-8, 8])
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const gesture = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={gesture}>
        <View style={styles.viewport}>
          <Animated.View style={[styles.content, animatedStyle]}>
            <View style={[styles.bracketTree, { height: treeHeight, width: canvasWidth }]}>
              {tournament.rounds.map((round, index) => (
                <BracketRoundColumn
                  key={round.index}
                  round={round}
                  canvasHeight={canvasHeight}
                  unitHeight={unitHeight}
                  matchNodeHeight={matchNodeHeight}
                  firstRoundMatchCount={firstRoundMatchCount}
                  verticalOffset={verticalOffset}
                  activeMatchId={tournament.activeMatchId}
                  isFinal={index === tournament.rounds.length - 1}
                  onSelectWinner={onSelectWinner}
                />
              ))}
            </View>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  viewport: {
    flex: 1,
  },
  content: {
    paddingHorizontal: BracketLayout.canvasPadding,
    paddingVertical: BracketLayout.canvasPadding,
    alignSelf: 'flex-start',
  },
  bracketTree: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
