import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { BracketRoundColumn } from '@/components/bracket/BracketRoundColumn';
import { HudText } from '@/components/bracket/HudText';
import { BracketLayout, Netrunner } from '@/constants/netrunner-theme';
import { getBracketVerticalOffset, getCanvasHeight } from '@/lib/bracket-engine';
import type { TournamentState } from '@/types/bracket';

const MAX_SCALE = 2.5;
const SCALE_EPSILON = 0.001;

function clampScale(value: number) {
  'worklet';
  return Math.min(MAX_SCALE, Math.max(SCALE_EPSILON, value));
}

type BracketCanvasProps = {
  tournament: TournamentState;
  onSelectWinner: (matchId: string, participantId: string) => void;
  onReassignController?: (participantId: string) => void;
};

export function BracketCanvas({ tournament, onSelectWinner, onReassignController }: BracketCanvasProps) {
  const unitHeight = BracketLayout.unitHeight;
  const matchNodeHeight = BracketLayout.matchNodeHeight;
  const rounds = tournament.rounds ?? [];

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

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={gesture}>
        <View style={styles.viewport}>
          <Animated.View style={[styles.content, animatedStyle]}>
            <View style={[styles.bracketTree, { height: treeHeight, width: canvasWidth }]}>
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
