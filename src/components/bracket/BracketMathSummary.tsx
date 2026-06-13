import { StyleSheet, View } from 'react-native';

import { HudText } from '@/components/bracket/HudText';
import { Netrunner, neonGlow } from '@/constants/netrunner-theme';
import type { BracketInfo } from '@/lib/bracket-engine';

type BracketMathSummaryProps = {
  info: BracketInfo;
};

export function BracketMathSummary({ info }: BracketMathSummaryProps) {
  return (
    <View style={styles.container}>
      <HudText variant="label" color={Netrunner.secondary}>
        BRACKET MATH
      </HudText>

      <View style={styles.row}>
        <HudText variant="caption">Round 1 matches</HudText>
        <HudText variant="mono" color={Netrunner.text}>
          {info.round1Matches}
        </HudText>
      </View>

      <View style={styles.row}>
        <HudText variant="caption">Round 1 byes</HudText>
        <HudText variant="mono" color={Netrunner.text}>
          {info.round1Byes}
        </HudText>
      </View>

      <View style={styles.row}>
        <HudText variant="caption">Players entered</HudText>
        <HudText variant="mono" color={Netrunner.text}>
          {info.playerCount}
        </HudText>
      </View>

      <View style={styles.formulaBox}>
        <HudText variant="mono" color={Netrunner.primary}>
          {info.formula}
        </HudText>
      </View>

      <HudText variant="caption" color={Netrunner.textMuted}>
        {info.isPerfectBracket
          ? 'Perfect power-of-2 count — every round pairs evenly.'
          : info.byeSummary}
        {info.laterRoundByes > 0
          ? ' Empty opponent slots show [ BYE ]; waiting slots show [ EMPTY / ADVANCED ].'
          : ''}
      </HudText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    borderWidth: 1,
    borderColor: Netrunner.border,
    borderRadius: 0,
    backgroundColor: Netrunner.surface,
    padding: 14,
    ...neonGlow(Netrunner.secondary, 3),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  formulaBox: {
    borderWidth: 1,
    borderColor: Netrunner.primary,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#061018',
  },
});
