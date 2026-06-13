import { Platform, StyleSheet, View } from 'react-native';

import { BracketLayout, Netrunner } from '@/constants/netrunner-theme';
import { getMatchCenterY } from '@/lib/bracket-engine';

type BracketRoundConnectorsProps = {
  pairIndexes: number[];
  unitHeight: number;
  matchNodeHeight: number;
  firstRoundMatchCount: number;
  roundMatchCount: number;
  verticalOffset: number;
  roundIndex: number;
  getPairActive: (topIndex: number, bottomIndex: number) => boolean;
  getPairComplete: (topIndex: number, bottomIndex: number) => boolean;
};

export function BracketRoundConnectors({
  pairIndexes,
  unitHeight,
  matchNodeHeight,
  firstRoundMatchCount,
  roundMatchCount,
  verticalOffset,
  roundIndex,
  getPairActive,
  getPairComplete,
}: BracketRoundConnectorsProps) {
  const { matchWidth, roundGap, connectorArm } = BracketLayout;

  return (
    <View pointerEvents="none" style={[styles.layer, { left: matchWidth, width: roundGap }]}>
      {pairIndexes.map((topIndex) => {
        const bottomIndex = topIndex + 1;
        const topCenter =
          getMatchCenterY(
            roundIndex,
            topIndex,
            unitHeight,
            matchNodeHeight,
            firstRoundMatchCount,
            roundMatchCount,
          ) + verticalOffset;
        const bottomCenter =
          getMatchCenterY(
            roundIndex,
            bottomIndex,
            unitHeight,
            matchNodeHeight,
            firstRoundMatchCount,
            roundMatchCount,
          ) + verticalOffset;
        const forkCenter = (topCenter + bottomCenter) / 2;
        const isActive = getPairActive(topIndex, bottomIndex);
        const isComplete = getPairComplete(topIndex, bottomIndex);
        const color = lineColor(isActive, isComplete);
        const glow = isActive || isComplete;

        return (
          <View key={`fork-${roundIndex}-${topIndex}`} style={styles.fork}>
            <Line
              color={color}
              glow={glow}
              height={1}
              left={0}
              top={topCenter - 0.5}
              width={connectorArm}
            />
            <Line
              color={color}
              glow={glow}
              height={1}
              left={0}
              top={bottomCenter - 0.5}
              width={connectorArm}
            />
            <Line
              color={color}
              glow={glow}
              height={Math.max(1, bottomCenter - topCenter)}
              left={connectorArm - 0.5}
              top={topCenter}
              width={1}
            />
            <Line
              color={color}
              glow={glow}
              height={1}
              left={connectorArm}
              top={forkCenter - 0.5}
              width={roundGap - connectorArm}
            />
            <View
              style={[
                styles.forkNode,
                {
                  borderColor: color,
                  backgroundColor: color,
                  left: connectorArm - 3,
                  top: forkCenter - 3,
                },
                glow && styles.forkNodeGlow,
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

function lineColor(isActive: boolean, isComplete: boolean) {
  if (isActive) return Netrunner.secondary;
  if (isComplete) return Netrunner.primary;
  return Netrunner.border;
}

function Line({
  top,
  left,
  width,
  height,
  color,
  glow,
}: {
  top: number;
  left: number;
  width: number;
  height: number;
  color: string;
  glow: boolean;
}) {
  return (
    <View
      style={[
        styles.line,
        {
          top,
          left,
          width,
          height,
          backgroundColor: color,
        },
        glow && Platform.select({
          ios: {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 4,
          },
          android: { elevation: 2 },
          default: {},
        }),
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  fork: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  line: {
    position: 'absolute',
  },
  forkNode: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderWidth: 1,
    borderRadius: 0,
  },
  forkNodeGlow: {
    shadowColor: Netrunner.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
});
