import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
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
    participantImageUris,
    tournament,
    champion,
    canUndo,
    isHydrated,
    savedSessionSummary,
    canContinueTournament,
    syncNameFields,
    updateParticipantName,
    loadPresetRoster,
    shuffleRoster,
    saveTournament,
    continueTournament,
    startTournament,
    goHome,
    pickWinner,
    undoLastPick,
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

  if (!isHydrated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.loadingShell}>
          <ActivityIndicator color={Netrunner.primary} />
          <HudText variant="caption" color={Netrunner.textMuted}>
            Loading saved tournament...
          </HudText>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'setup' || !tournament) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.setupShell}>
          <SetupPanel
            participantCount={participantCount}
            participantNames={participantNames}
            participantImageUris={participantImageUris}
            onChangeCount={syncNameFields}
            onChangeName={updateParticipantName}
            onLoadPreset={loadPresetRoster}
            onShuffle={shuffleRoster}
            onSave={saveTournament}
            onContinue={continueTournament}
            canContinueTournament={canContinueTournament}
            savedSessionSummary={savedSessionSummary}
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
          <View style={styles.topBarActions}>
            <HudButton
              label="Save"
              variant="ghost"
              onPress={saveTournament}
              style={styles.actionButton}
            />
            <HudButton
              label="Undo"
              variant="ghost"
              onPress={undoLastPick}
              disabled={!canUndo}
              style={styles.actionButton}
            />
            <HudButton label="Home" variant="ghost" onPress={goHome} style={styles.actionButton} />
          </View>
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
  loadingShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
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
  topBarActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
  },
});
