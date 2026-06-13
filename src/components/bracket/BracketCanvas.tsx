import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { BracketRoundColumn } from '@/components/bracket/BracketRoundColumn';
import { BracketLayout } from '@/constants/netrunner-theme';
import {
  getBracketVerticalOffset,
  getBracketVisualBounds,
  getCanvasHeight,
} from '@/lib/bracket-engine';
import type { TournamentState } from '@/types/bracket';

const MAX_SCALE = 2.5;
const MIN_SCALE_FLOOR = 0.2;

function clampScale(value: number, minScale: number) {
  'worklet';
  return Math.min(MAX_SCALE, Math.max(minScale, value));
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

function fitToViewport(
  scale: SharedValue<number>,
  savedScale: SharedValue<number>,
  translateX: SharedValue<number>,
  translateY: SharedValue<number>,
  savedTranslateX: SharedValue<number>,
  savedTranslateY: SharedValue<number>,
  viewportWidth: SharedValue<number>,
  viewportHeight: SharedValue<number>,
  contentWidth: SharedValue<number>,
  contentHeight: SharedValue<number>,
  minScale: SharedValue<number>,
) {
  'worklet';
  if (viewportWidth.value <= 0 || viewportHeight.value <= 0) return;

  const fitScale = Math.min(
    viewportWidth.value / contentWidth.value,
    viewportHeight.value / contentHeight.value,
    1,
  );
  minScale.value = Math.max(fitScale * 0.95, MIN_SCALE_FLOOR);
  const nextScale = minScale.value;

  scale.value = nextScale;
  savedScale.value = nextScale;

  const clamped = clampTranslation(
    0,
    0,
    nextScale,
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

  const visualBounds = getBracketVisualBounds(
    tournament.rounds,
    unitHeight,
    matchNodeHeight,
    BracketLayout.roundLabelHeight,
    BracketLayout.matchWidth,
    BracketLayout.roundGap,
  );

  const contentWidthPx = visualBounds.width + BracketLayout.canvasPadding * 2;
  const contentHeightPx = visualBounds.height + BracketLayout.canvasPadding * 2;
  const fitKey = `${contentWidthPx}x${contentHeightPx}`;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const pinchStartTranslateX = useSharedValue(0);
  const pinchStartTranslateY = useSharedValue(0);
  const viewportWidth = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const contentWidth = useSharedValue(contentWidthPx);
  const contentHeight = useSharedValue(contentHeightPx);
  const minScale = useSharedValue(1);
  const fittedKey = useSharedValue('');

  useEffect(() => {
    contentWidth.value = contentWidthPx;
    contentHeight.value = contentHeightPx;
    fittedKey.value = '';
  }, [contentWidthPx, contentHeightPx, contentWidth, contentHeight, fittedKey]);

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      pinchStartScale.value = savedScale.value;
      pinchStartTranslateX.value = savedTranslateX.value;
      pinchStartTranslateY.value = savedTranslateY.value;
    })
    .onUpdate((event) => {
      const nextScale = clampScale(pinchStartScale.value * event.scale, minScale.value);
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
        viewportWidth,
        viewportHeight,
        contentWidth,
        contentHeight,
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
        viewportWidth,
        viewportHeight,
        contentWidth,
        contentHeight,
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

  const handleViewportLayout = (width: number, height: number) => {
    viewportWidth.value = width;
    viewportHeight.value = height;

    runOnUI(() => {
      if (fittedKey.value !== fitKey) {
        fitToViewport(
          scale,
          savedScale,
          translateX,
          translateY,
          savedTranslateX,
          savedTranslateY,
          viewportWidth,
          viewportHeight,
          contentWidth,
          contentHeight,
          minScale,
        );
        fittedKey.value = fitKey;
      } else {
        applyBounds(
          translateX,
          translateY,
          savedTranslateX,
          savedTranslateY,
          scale,
          viewportWidth,
          viewportHeight,
          contentWidth,
          contentHeight,
        );
      }
    })();

  };

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.viewport}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            handleViewportLayout(width, height);
          }}>
          <Animated.View style={[styles.content, animatedStyle]}>
            <View
              style={[
                styles.visualClip,
                { width: visualBounds.width, height: visualBounds.height },
              ]}>
              <View
                style={[
                  styles.treeShift,
                  {
                    marginTop: -visualBounds.top,
                    width: canvasWidth,
                    height: treeHeight,
                  },
                ]}>
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
              </View>
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
    transformOrigin: 'top left',
  },
  visualClip: {
    overflow: 'hidden',
  },
  treeShift: {
    position: 'relative',
  },
  bracketTree: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
