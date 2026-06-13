import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { HudText } from '@/components/bracket/HudText';
import { PlayerAvatar } from '@/components/bracket/PlayerAvatar';
import { formatPeso, getRoundWinPayout, getSlotKind } from '@/lib/bracket-engine';
import { Netrunner, neonGlow } from '@/constants/netrunner-theme';
import type { BracketMatch, BracketSlot } from '@/types/bracket';

const STATUS_AVATAR_SIZE = 42;

type TournamentStatusBarProps = {
  activeMatch: BracketMatch | null;
  totalMatches: number;
  completedMatches: number;
  showWinPayout?: boolean;
  roundPayouts?: Record<number, number>;
};

function StatusFighter({ slot, align }: { slot: BracketSlot; align: 'left' | 'right' }) {
  const variant = getSlotKind(slot);
  const isLeft = align === 'left';

  return (
    <View style={[styles.fighter, isLeft ? styles.fighterLeft : styles.fighterRight]}>
      {isLeft ? (
        <PlayerAvatar
          name={slot.name}
          participantId={slot.participantId}
          imageUri={slot.imageUri}
          variant={variant}
          size={STATUS_AVATAR_SIZE}
        />
      ) : null}
      <HudText
        variant="body"
        color={Netrunner.secondary}
        numberOfLines={2}
        style={[styles.fighterName, !isLeft && styles.fighterNameRight]}>
        {slot.name}
      </HudText>
      {!isLeft ? (
        <PlayerAvatar
          name={slot.name}
          participantId={slot.participantId}
          imageUri={slot.imageUri}
          variant={variant}
          size={STATUS_AVATAR_SIZE}
        />
      ) : null}
    </View>
  );
}

export function TournamentStatusBar({
  activeMatch,
  totalMatches,
  completedMatches,
  showWinPayout = false,
  roundPayouts,
}: TournamentStatusBarProps) {
  const progress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;
  const winPayout =
    activeMatch && showWinPayout
      ? getRoundWinPayout(activeMatch.roundIndex, roundPayouts)
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.indicator}>
          <View style={styles.pulseDot} />
          <HudText variant="label" color={Netrunner.secondary}>
            ACTIVE MATCH
          </HudText>
        </View>
        <View style={styles.meta}>
          {winPayout !== null ? (
            <HudText variant="mono" color={Netrunner.primary}>
              Win {formatPeso(winPayout)}
            </HudText>
          ) : null}
          <HudText variant="mono" color={Netrunner.textMuted}>
            {completedMatches}/{totalMatches}
          </HudText>
        </View>
      </View>

      {activeMatch ? (
        <View style={styles.matchup}>
          <StatusFighter slot={activeMatch.slotA} align="left" />
          <HudText variant="label" color={Netrunner.textMuted} style={styles.versus}>
            VS
          </HudText>
          <StatusFighter slot={activeMatch.slotB} align="right" />
        </View>
      ) : (
        <HudText variant="body" color={Netrunner.secondary}>
          Awaiting next pairing
        </HudText>
      )}

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
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    backgroundColor: Netrunner.secondary,
    ...neonGlow(Netrunner.secondary, 6),
  },
  matchup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fighter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  fighterLeft: {
    justifyContent: 'flex-start',
  },
  fighterRight: {
    justifyContent: 'flex-end',
  },
  fighterName: {
    flex: 1,
    minWidth: 0,
  },
  fighterNameRight: {
    textAlign: 'right',
  },
  versus: {
    letterSpacing: 2,
    flexShrink: 0,
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
