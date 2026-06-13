import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddPlayersModal } from '@/components/bracket/AddPlayersModal';
import { BracketCanvas } from '@/components/bracket/BracketCanvas';
import { HudButton } from '@/components/bracket/HudButton';
import { HudText } from '@/components/bracket/HudText';
import { ReassignControllerModal } from '@/components/bracket/ReassignControllerModal';
import { SetupPanel } from '@/components/bracket/SetupPanel';
import { ChampionBanner, TournamentStatusBar } from '@/components/bracket/TournamentStatusBar';
import { Netrunner } from '@/constants/netrunner-theme';
import { useTournament } from '@/hooks/use-tournament';

const ESTIMATED_HEADER_HEIGHT = 200;

export function TournamentScreen() {
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [reassignTargetId, setReassignTargetId] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(ESTIMATED_HEADER_HEIGHT);

  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

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
    confirmPlayers,
    reassignController,
  } = useTournament();

  const tournamentPlayers = tournament?.players ?? [];
  const controllerAssignments = tournament?.controllerAssignments ?? {};

  const bracketHeight = useMemo(() => {
    const available = windowHeight - insets.top - insets.bottom - headerHeight - 12;
    return Math.max(available, 280);
  }, [windowHeight, insets.top, insets.bottom, headerHeight]);

  const reassignTarget = useMemo(() => {
    if (!tournament || !reassignTargetId) return null;
    return tournament.participants.find((participant) => participant.id === reassignTargetId) ?? null;
  }, [tournament, reassignTargetId]);

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
      <View style={styles.screenBody}>
        <View
          style={styles.headerSection}
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            if (nextHeight > 0) setHeaderHeight(nextHeight);
          }}>
          <View style={styles.topBar}>
            <View style={styles.topBarCopy}>
              <HudText variant="label" color={Netrunner.primary} glow>
                TOURNAMENT LIVE
              </HudText>
              <HudText variant="caption">Pinch to zoom · drag to pan · tap a card to advance</HudText>
            </View>
            <View style={styles.topBarActions}>
              <HudButton
                label={tournamentPlayers.length > 0 ? 'Edit Players' : 'Add Players'}
                variant="ghost"
                onPress={() => setShowAddPlayers(true)}
                style={styles.actionButton}
              />
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
        </View>

        <View style={[styles.bracketArea, { height: bracketHeight }]}>
          <BracketCanvas
            tournament={tournament}
            onSelectWinner={pickWinner}
            onReassignController={
              tournamentPlayers.length > 0 ? setReassignTargetId : undefined
            }
          />
        </View>
      </View>

      <AddPlayersModal
        visible={showAddPlayers}
        initialNames={tournamentPlayers.map((player) => player.name)}
        onConfirm={confirmPlayers}
        onClose={() => setShowAddPlayers(false)}
      />

      {reassignTarget && (
        <ReassignControllerModal
          visible={Boolean(reassignTargetId)}
          participantName={reassignTarget.name}
          players={tournamentPlayers}
          currentPlayerId={controllerAssignments[reassignTarget.id]}
          onSelect={(playerId) => reassignController(reassignTarget.id, playerId)}
          onClose={() => setReassignTargetId(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Netrunner.background,
  },
  screenBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  headerSection: {
    gap: 14,
    marginBottom: 12,
  },
  bracketArea: {
    overflow: 'hidden',
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
    minWidth: 0,
  },
  topBarActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    maxWidth: '58%',
  },
  actionButton: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
  },
});
