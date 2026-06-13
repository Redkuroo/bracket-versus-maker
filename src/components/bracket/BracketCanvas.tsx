import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { BracketRoundColumn } from '@/components/bracket/BracketRoundColumn';
import { HudText } from '@/components/bracket/HudText';
import { BracketLayout, Netrunner } from '@/constants/netrunner-theme';
import { getBracketVerticalOffset, getCanvasHeight } from '@/lib/bracket-engine';
import type { TournamentState } from '@/types/bracket';

const MAX_SCALE = 3;
/** Prevents zero/inverted scale only — not a practical zoom-out cap. */
const SCALE_EPSILON = 0.001;

function clampScale(value: number) {
  'worklet';
  return Math.min(MAX_SCALE, Math.max(SCALE_EPSILON, value));
}

function clampTranslation(
  translateX: number,
  translateY: number,
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number,
) {
  'worklet';
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return { x: translateX, y: translateY };
  }

  const scaledWidth = contentWidth * scale;
  const scaledHeight = contentHeight * scale;

  let x = translateX;
  let y = translateY;

  if (scaledWidth <= viewportWidth) {
    x = (viewportWidth - scaledWidth) / 2;
  } else {
    x = Math.min(0, Math.max(viewportWidth - scaledWidth, x));
  }

  if (scaledHeight <= viewportHeight) {
    y = (viewportHeight - scaledHeight) / 2;
  } else {
    y = Math.min(0, Math.max(viewportHeight - scaledHeight, y));
  }

  return { x, y };
}

function applyBounds(
  translateX: SharedValue<number>,
  translateY: SharedValue<number>,
  savedTranslateX: SharedValue<number>,
  savedTranslateY: SharedValue<number>,
  scale: SharedValue<number>,
  viewportWidth: SharedValue<number>,
  viewportHeight: SharedValue<number>,
  contentWidth: SharedValue<number>,
  contentHeight: SharedValue<number>,
) {
  'worklet';
  const clamped = clampTranslation(
    translateX.value,
    translateY.value,
    scale.value,
    viewportWidth.value,
    viewportHeight.value,
    contentWidth.value,
    contentHeight.value,
  );
  translateX.value = clamped.x;
  translateY.value = clamped.y;
  savedTranslateX.value = clamped.x;
  savedTranslateY.value = clamped.y;
}

function getInitialScale(viewportWidth: number, viewportHeight: number) {
  if (viewportWidth <= 0 || viewportHeight <= 0) return 1.25;

  const columnWidth = BracketLayout.matchWidth + BracketLayout.roundGap;
  const byWidth = (viewportWidth * 0.92) / columnWidth;
  const byHeight = (viewportHeight * 0.58) / BracketLayout.matchNodeHeight;

  return Math.min(Math.max(byWidth, byHeight, 1.25), MAX_SCALE);
}

type BracketCanvasProps = {
  tournament: TournamentState;
  viewportWidth: number;
  viewportHeight: number;
  onSelectWinner: (matchId: string, participantId: string) => void;
  onReassignController?: (participantId: string) => void;
};

export function BracketCanvas({
  tournament,
  viewportWidth,
  viewportHeight,
  onSelectWinner,
  onReassignController,
}: BracketCanvasProps) {
  const unitHeight = BracketLayout.unitHeight;
  const matchNodeHeight = BracketLayout.matchNodeHeight;
  const rounds = tournament.rounds ?? [];

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const pinchStartTranslateX = useSharedValue(0);
  const pinchStartTranslateY = useSharedValue(0);
  const viewportWidthSv = useSharedValue(0);
  const viewportHeightSv = useSharedValue(0);
  const contentWidthSv = useSharedValue(1);
  const contentHeightSv = useSharedValue(1);

  const hasRounds = rounds.length > 0;
  const canvasHeight = hasRounds ? getCanvasHeight(rounds, unitHeight) : unitHeight;
  const firstRoundMatchCount = rounds[0]?.matches.length ?? 1;
  const verticalOffset = hasRounds
    ? getBracketVerticalOffset(rounds, unitHeight, matchNodeHeight)
    : 0;
  const treeHeight = canvasHeight + BracketLayout.roundLabelHeight;
  const canvasWidth = hasRounds
    ? Math.max(
        rounds.length * (BracketLayout.matchWidth + BracketLayout.roundGap) - BracketLayout.roundGap,
        BracketLayout.matchWidth,
      )
    : BracketLayout.matchWidth;

  const players = tournament.players ?? [];
  const controllerAssignments = tournament.controllerAssignments ?? {};

  const contentWidthPx = canvasWidth + BracketLayout.canvasPadding * 2;
  const contentHeightPx = treeHeight + BracketLayout.canvasPadding * 2;

  useEffect(() => {
    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    const nextScale = getInitialScale(viewportWidth, viewportHeight);
    const scaledWidth = contentWidthPx * nextScale;
    const scaledHeight = contentHeightPx * nextScale;

    viewportWidthSv.value = viewportWidth;
    viewportHeightSv.value = viewportHeight;
    contentWidthSv.value = contentWidthPx;
    contentHeightSv.value = contentHeightPx;

    scale.value = nextScale;
    savedScale.value = nextScale;
    translateX.value = (viewportWidth - scaledWidth) / 2;
    translateY.value = (viewportHeight - scaledHeight) / 2;
    savedTranslateX.value = translateX.value;
    savedTranslateY.value = translateY.value;
  }, [
    viewportWidth,
    viewportHeight,
    contentWidthPx,
    contentHeightPx,
    scale,
    savedScale,
    translateX,
    translateY,
    savedTranslateX,
    savedTranslateY,
    viewportWidthSv,
    viewportHeightSv,
    contentWidthSv,
    contentHeightSv,
  ]);

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      pinchStartScale.value = savedScale.value;
      pinchStartTranslateX.value = savedTranslateX.value;
      pinchStartTranslateY.value = savedTranslateY.value;
    })
    .onUpdate((event) => {
      const nextScale = clampScale(pinchStartScale.value * event.scale);
      const scaleRatio = nextScale / pinchStartScale.value;

      scale.value = nextScale;
      translateX.value = event.focalX - (event.focalX - pinchStartTranslateX.value) * scaleRatio;
      translateY.value = event.focalY - (event.focalY - pinchStartTranslateY.value) * scaleRatio;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      applyBounds(
        translateX,
        translateY,
        savedTranslateX,
        savedTranslateY,
        scale,
        viewportWidthSv,
        viewportHeightSv,
        contentWidthSv,
        contentHeightSv,
      );
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
      applyBounds(
        translateX,
        translateY,
        savedTranslateX,
        savedTranslateY,
        scale,
        viewportWidthSv,
        viewportHeightSv,
        contentWidthSv,
        contentHeightSv,
      );
    });

  const gesture = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!hasRounds) {
    return (
      <View style={[styles.emptyState, { width: viewportWidth, height: viewportHeight }]}>
        <HudText variant="body" color={Netrunner.textMuted}>
          Bracket data is missing. Go Home and launch the tournament again.
        </HudText>
      </View>
    );
  }

  const hostStyle = {
    width: Math.max(viewportWidth, 1),
    height: Math.max(viewportHeight, 1),
  };

  return (
    <View style={[styles.host, hostStyle]} collapsable={false}>
      <GestureDetector gesture={gesture}>
        <View style={[styles.viewport, hostStyle]} collapsable={false}>
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
  host: {
    overflow: 'hidden',
  },
  viewport: {
    overflow: 'hidden',
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
