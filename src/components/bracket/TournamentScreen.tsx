import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BracketCanvas } from '@/components/bracket/BracketCanvas';
import { HudButton } from '@/components/bracket/HudButton';
import { HudText } from '@/components/bracket/HudText';
import { SetupPanel } from '@/components/bracket/SetupPanel';
import { ChampionBanner, TournamentStatusBar } from '@/components/bracket/TournamentStatusBar';
import { Netrunner } from '@/constants/netrunner-theme';
import { useTournament } from '@/hooks/use-tournament';

export function TournamentScreen() {
  const {
    phase,
    participantCount,
    participantNames,
    tournament,
    champion,
    syncNameFields,
    updateParticipantName,
    startTournament,
    resetTournament,
    pickWinner,
  } = useTournament();

  const activeMatch = useMemo(() => {
    if (!tournament?.activeMatchId) return null;
    for (const round of tournament.rounds) {
      const match = round.matches.find((item) => item.id === tournament.activeMatchId);
      if (match) return match;
    }
    return null;
  }, [tournament]);

  const matchStats = useMemo(() => {
    if (!tournament) return { total: 0, completed: 0 };
    const total = tournament.rounds.reduce((sum, round) => sum + round.matches.length, 0);
    const completed = tournament.rounds.reduce(
      (sum, round) => sum + round.matches.filter((match) => match.winnerId).length,
      0,
    );
    return { total, completed };
  }, [tournament]);

  if (phase === 'setup' || !tournament) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.setupShell}>
          <SetupPanel
            participantCount={participantCount}
            participantNames={participantNames}
            onChangeCount={syncNameFields}
            onChangeName={updateParticipantName}
            onStart={startTournament}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.bracketShell}>
        <View style={styles.topBar}>
          <View style={styles.topBarCopy}>
            <HudText variant="label" color={Netrunner.primary} glow>
              TOURNAMENT LIVE
            </HudText>
            <HudText variant="caption">Pinch to zoom · drag to pan · tap a card to advance</HudText>
          </View>
          <HudButton label="Reset" variant="ghost" onPress={resetTournament} style={styles.resetButton} />
        </View>

        {champion ? (
          <ChampionBanner championName={champion.name} />
        ) : (
          <TournamentStatusBar
            activeMatch={activeMatch}
            totalMatches={matchStats.total}
            completedMatches={matchStats.completed}
          />
        )}

        <BracketCanvas tournament={tournament} onSelectWinner={pickWinner} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Netrunner.background,
  },
  setupShell: {
    flex: 1,
  },
  bracketShell: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 8,
  },
  topBarCopy: {
    flex: 1,
    gap: 4,
  },
  resetButton: {
    minWidth: 88,
    paddingHorizontal: 12,
  },
});
