import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { HudText } from '@/components/bracket/HudText';
import { HudButton } from '@/components/bracket/HudButton';
import { Netrunner, neonGlow } from '@/constants/netrunner-theme';
import type { BracketMatch } from '@/types/bracket';

type TournamentStatusBarProps = {
  activeMatch: BracketMatch | null;
  totalMatches: number;
  completedMatches: number;
  roundShuffleTarget?: {
    roundLabel: string;
    hasConflicts: boolean;
  } | null;
  onShuffleRoundControllers?: () => void;
};

export function TournamentStatusBar({
  activeMatch,
  totalMatches,
  completedMatches,
  roundShuffleTarget,
  onShuffleRoundControllers,
}: TournamentStatusBarProps) {
  const progress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.indicator}>
          <View style={styles.pulseDot} />
          <HudText variant="label" color={Netrunner.secondary}>
            ACTIVE MATCH
          </HudText>
        </View>
        <HudText variant="mono" color={Netrunner.textMuted}>
          {completedMatches}/{totalMatches}
        </HudText>
      </View>

      <HudText variant="body" color={Netrunner.secondary}>
        {activeMatch
          ? `${activeMatch.slotA.name} vs ${activeMatch.slotB.name}`
          : 'Awaiting next pairing'}
      </HudText>

      {roundShuffleTarget && onShuffleRoundControllers ? (
        <View style={styles.shuffleRow}>
          <View style={styles.shuffleCopy}>
            <HudText variant="caption" color={Netrunner.textMuted}>
              {roundShuffleTarget.hasConflicts
                ? `${roundShuffleTarget.roundLabel} has the same human on both sides of a match.`
                : `${roundShuffleTarget.roundLabel} is ready — reshuffle who controls each character.`}
            </HudText>
          </View>
          <HudButton
            label={`Shuffle ${roundShuffleTarget.roundLabel}`}
            variant="secondary"
            onPress={onShuffleRoundControllers}
            style={styles.shuffleButton}
          />
        </View>
      ) : null}

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

export function ChampionBanner({ championName }: { championName: string }) {
  return (
    <View style={styles.championBanner}>
      <SymbolView
        name={{ ios: 'crown.fill', android: 'star', web: 'star' }}
        size={22}
        tintColor={Netrunner.secondary}
      />
      <View style={styles.championCopy}>
        <HudText variant="label" color={Netrunner.secondary}>
          CHAMPION
        </HudText>
        <HudText variant="title" color={Netrunner.secondary} glow>
          {championName}
        </HudText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: Netrunner.border,
    borderRadius: 0,
    backgroundColor: Netrunner.surface,
    padding: 14,
    gap: 10,
    ...neonGlow(Netrunner.secondary, 4),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    backgroundColor: Netrunner.secondary,
    ...neonGlow(Netrunner.secondary, 6),
  },
  progressTrack: {
    height: 4,
    backgroundColor: Netrunner.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Netrunner.secondary,
    ...neonGlow(Netrunner.secondary, 4),
  },
  shuffleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  shuffleCopy: {
    flex: 1,
    minWidth: 0,
  },
  shuffleButton: {
    minWidth: 120,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 36,
  },
  championBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Netrunner.secondary,
    borderRadius: 0,
    backgroundColor: '#082634',
    padding: 16,
    ...neonGlow(Netrunner.secondary, 10),
  },
  championCopy: {
    gap: 4,
    flex: 1,
  },
});
