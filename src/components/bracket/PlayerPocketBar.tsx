import { StyleSheet, View } from 'react-native';

import { HudText } from '@/components/bracket/HudText';
import { formatPeso } from '@/lib/bracket-engine';
import { Netrunner } from '@/constants/netrunner-theme';
import type { TournamentPlayer } from '@/types/bracket';

type PlayerPocketBarProps = {
  players: TournamentPlayer[];
};

export function PlayerPocketBar({ players }: PlayerPocketBarProps) {
  if (players.length === 0) return null;

  return (
    <View style={styles.container}>
      <HudText variant="label" color={Netrunner.textMuted}>
        POCKET
      </HudText>
      <View style={styles.chips}>
        {players.map((player) => (
          <View key={player.id} style={styles.chip}>
            <HudText variant="caption" color={Netrunner.text} numberOfLines={1}>
              {player.name}
            </HudText>
            <HudText variant="mono" color={Netrunner.secondary}>
              {formatPeso(player.pocketMoney ?? 0)}
            </HudText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Netrunner.border,
    backgroundColor: Netrunner.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Netrunner.border,
    backgroundColor: '#040E16',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
