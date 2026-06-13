import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { PRESET_ROSTER } from '@/data/preset-roster';
import {
  assignControllers,
  cloneTournamentState,
  createTournament,
  getRoundShuffleTarget,
  reassignParticipantController,
  selectMatchWinner,
  shuffleControllersForRound,
  updateRoundPayouts,
} from '@/lib/bracket-engine';
import {
  clearAllSavedTournaments,
  describeSavedSession,
  loadAllSavedTournaments,
  loadSavedTournamentById,
  normalizeTournamentState,
  renameSavedTournament as renameSavedTournamentSlot,
  upsertSavedTournament,
  type SavedTournamentSlot,
} from '@/lib/tournament-persistence';
import {
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  type TournamentPhase,
  type TournamentState,
} from '@/types/bracket';
import type { ParticipantInput } from '@/types/roster';

function clampParticipantCount(count: number): number {
  return Math.min(MAX_PARTICIPANTS, Math.max(MIN_PARTICIPANTS, count));
}

function emptyPlayer(): ParticipantInput {
  return { name: '', imageUri: null };
}

function createEmptyPlayers(count: number): ParticipantInput[] {
  return Array.from({ length: clampParticipantCount(count) }, () => emptyPlayer());
}

function resizePlayers(players: ParticipantInput[], count: number): ParticipantInput[] {
  const clamped = clampParticipantCount(count);
  if (players.length === clamped) return players;
  if (players.length < clamped) {
    return [...players, ...Array.from({ length: clamped - players.length }, () => emptyPlayer())];
  }
  return players.slice(0, clamped);
}

function shufflePlayers(players: ParticipantInput[]): ParticipantInput[] {
  const shuffled = [...players];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function tournamentNeedsNormalization(state: TournamentState): boolean {
  return !Array.isArray(state.players) || !state.controllerAssignments || !state.roundPayouts;
}

function repairTournamentState(
  state: TournamentState | null,
  setupPlayers: ParticipantInput[],
): TournamentState | null {
  if (!state) return null;

  const normalized = normalizeTournamentState(state);
  if (normalized.rounds.length > 0) return normalized;

  const inputs =
    setupPlayers.length > 0
      ? setupPlayers
      : normalized.participants.map((participant) => ({
          name: participant.name,
          imageUri: participant.imageUri,
        }));

  if (inputs.length < MIN_PARTICIPANTS) return normalized;

  const rebuilt = normalizeTournamentState(createTournament(inputs));
  return {
    ...rebuilt,
    players: normalized.players,
    controllerAssignments: normalized.controllerAssignments,
    roundPayouts: normalized.roundPayouts,
  };
}

function applySavedSlot(slot: SavedTournamentSlot) {
  return {
    setupPlayers: slot.setupPlayers,
    tournament: slot.tournament
      ? repairTournamentState(normalizeTournamentState(slot.tournament), slot.setupPlayers)
      : null,
    history: slot.history.map(normalizeTournamentState),
    phase: slot.phase,
  };
}

export function useTournament() {
  const [phase, setPhase] = useState<TournamentPhase>('setup');
  const [setupPlayers, setSetupPlayers] = useState<ParticipantInput[]>(createEmptyPlayers(4));
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [history, setHistory] = useState<TournamentState[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [savedTournaments, setSavedTournaments] = useState<SavedTournamentSlot[]>([]);
  const [activeSaveId, setActiveSaveId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const skipPersistRef = useRef(true);

  const participantCount = setupPlayers.length;
  const participantNames = useMemo(() => setupPlayers.map((player) => player.name), [setupPlayers]);
  const participantImageUris = useMemo(
    () => setupPlayers.map((player) => player.imageUri ?? null),
    [setupPlayers],
  );

  const canContinueTournament = Boolean(tournament);
  const isBracketPhase = phase === 'bracket' && tournament !== null;

  const refreshSavedTournaments = useCallback(async () => {
    const slots = await loadAllSavedTournaments();
    setSavedTournaments(slots);
    return slots;
  }, []);

  useEffect(() => {
    let cancelled = false;

    refreshSavedTournaments().then(() => {
      if (cancelled) return;
      skipPersistRef.current = false;
      setIsHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [refreshSavedTournaments]);

  useEffect(() => {
    if (!isHydrated) return;

    setTournament((current) => {
      if (!current) return current;
      const repaired = repairTournamentState(current, setupPlayers);
      if (!repaired || !tournamentNeedsNormalization(repaired)) return repaired;
      return normalizeTournamentState(repaired);
    });
    setHistory((past) => {
      if (!past.some(tournamentNeedsNormalization)) return past;
      return past.map(normalizeTournamentState);
    });
  }, [isHydrated, setupPlayers]);

  const persistCurrentSession = useCallback(async () => {
    const result = await upsertSavedTournament(activeSaveId, {
      phase,
      setupPlayers,
      tournament,
      history,
    });
    setActiveSaveId(result.slotId);
    setLastSavedAt(result.savedAt);
    await refreshSavedTournaments();
    return result;
  }, [activeSaveId, phase, setupPlayers, tournament, history, refreshSavedTournaments]);

  useEffect(() => {
    if (!isHydrated || skipPersistRef.current || !activeSaveId) return;

    const timeoutId = setTimeout(() => {
      persistCurrentSession().catch(() => undefined);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [isHydrated, activeSaveId, phase, setupPlayers, tournament, history, persistCurrentSession]);

  const saveTournament = useCallback(async () => {
    try {
      const { slot } = await persistCurrentSession();
      Alert.alert('Saved', `${slot.summary}\n\nSaved to "${slot.label}".`);
    } catch {
      Alert.alert('Save failed', 'Could not save tournament progress. Try again.');
    }
  }, [persistCurrentSession]);

  const loadSavedTournament = useCallback(async (saveId: string) => {
    const slot = await loadSavedTournamentById(saveId);
    if (!slot) {
      Alert.alert('Load failed', 'That saved tournament could not be found.');
      await refreshSavedTournaments();
      return;
    }

    skipPersistRef.current = true;
    const next = applySavedSlot(slot);
    setSetupPlayers(next.setupPlayers);
    setTournament(next.tournament);
    setHistory(next.history);
    setPhase(next.phase);
    setActiveSaveId(slot.id);
    setLastSavedAt(slot.savedAt);
    await refreshSavedTournaments();
    skipPersistRef.current = false;
  }, [refreshSavedTournaments]);

  const renameSavedTournament = useCallback(
    async (saveId: string, label: string) => {
      const slot = await renameSavedTournamentSlot(saveId, label);
      if (!slot) {
        Alert.alert('Rename failed', 'Could not rename that save. Try a non-empty name.');
        return;
      }
      await refreshSavedTournaments();
    },
    [refreshSavedTournaments],
  );

  const continueTournament = useCallback(() => {
    if (!tournament) return;
    setPhase('bracket');
  }, [tournament]);

  const syncNameFields = useCallback((count: number) => {
    setSetupPlayers((current) => resizePlayers(current, count));
  }, []);

  const updateParticipantName = useCallback((index: number, name: string) => {
    setSetupPlayers((current) =>
      current.map((player, playerIndex) => (playerIndex === index ? { ...player, name } : player)),
    );
  }, []);

  const loadPresetRoster = useCallback(() => {
    setSetupPlayers(
      PRESET_ROSTER.players.map((player) => ({
        name: player.name,
        imageUri: player.imageUri ?? null,
      })),
    );
  }, []);

  const shuffleRoster = useCallback(() => {
    setSetupPlayers((current) => shufflePlayers(current));
  }, []);

  const startTournament = useCallback(() => {
    const inputs =
      setupPlayers.length > 0
        ? setupPlayers
        : [
            { name: 'Player 1', imageUri: null },
            { name: 'Player 2', imageUri: null },
          ];
    const next = normalizeTournamentState(createTournament(inputs));
    setTournament(next);
    setHistory([]);
    setPhase('bracket');
    setActiveSaveId(null);
    setLastSavedAt(null);
  }, [setupPlayers]);

  const goHome = useCallback(() => {
    setPhase('setup');
  }, []);

  const resetTournament = useCallback(async () => {
    setTournament(null);
    setHistory([]);
    setPhase('setup');
    setActiveSaveId(null);
    setLastSavedAt(null);
    setSetupPlayers(createEmptyPlayers(4));
    await clearAllSavedTournaments();
    setSavedTournaments([]);
  }, []);

  const pickWinner = useCallback((matchId: string, participantId: string) => {
    setTournament((current) => {
      if (!current) return current;

      const next = normalizeTournamentState(selectMatchWinner(current, matchId, participantId));
      if (next === current) return current;

      setHistory((past) => [...past, cloneTournamentState(current)]);
      return next;
    });
  }, []);

  const undoLastPick = useCallback(() => {
    setHistory((past) => {
      if (past.length === 0) return past;

      const previous = past[past.length - 1];
      setTournament(normalizeTournamentState(cloneTournamentState(previous)));
      return past.slice(0, -1);
    });
  }, []);

  const confirmPlayers = useCallback((names: string[]) => {
    setTournament((current) => {
      if (!current) return current;

      const result = assignControllers(current, names);
      if (!result.success) {
        Alert.alert(
          'Cannot assign players',
          'Each human player must control a different character than their own name, and opponents in the same match must have different players.',
        );
        return current;
      }

      return normalizeTournamentState(result.state);
    });
  }, []);

  const reassignController = useCallback((participantId: string, playerId: string) => {
    setTournament((current) => {
      if (!current) return current;
      return normalizeTournamentState(reassignParticipantController(current, participantId, playerId));
    });
  }, []);

  const reshuffleRoundControllers = useCallback(() => {
    setTournament((current) => {
      if (!current) return current;

      const target = getRoundShuffleTarget(current);
      if (!target) return current;

      const result = shuffleControllersForRound(current, target.roundIndex);
      if (!result.success) {
        Alert.alert(
          'Cannot shuffle players',
          `Could not assign different human players for ${target.roundLabel}. Try adding more players or reshuffle again.`,
        );
        return current;
      }

      return normalizeTournamentState(result.state);
    });
  }, []);

  const saveRoundPayouts = useCallback((roundPayouts: Record<number, number>) => {
    setTournament((current) => {
      if (!current) return current;
      return normalizeTournamentState(updateRoundPayouts(current, roundPayouts));
    });
  }, []);

  const roundShuffleTarget = useMemo(
    () => (tournament ? getRoundShuffleTarget(tournament) : null),
    [tournament],
  );

  const canUndo = history.length > 0;

  const champion = useMemo(() => {
    if (!tournament?.championId) return null;
    return tournament.participants.find((participant) => participant.id === tournament.championId) ?? null;
  }, [tournament]);

  return {
    phase,
    participantCount,
    participantNames,
    participantImageUris,
    tournament,
    champion,
    canUndo,
    isHydrated,
    savedTournaments,
    activeSaveId,
    lastSavedAt,
    canContinueTournament,
    isBracketPhase,
    syncNameFields,
    updateParticipantName,
    loadPresetRoster,
    shuffleRoster,
    saveTournament,
    loadSavedTournament,
    renameSavedTournament,
    continueTournament,
    startTournament,
    goHome,
    resetTournament,
    pickWinner,
    undoLastPick,
    confirmPlayers,
    reassignController,
    reshuffleRoundControllers,
    roundShuffleTarget,
    saveRoundPayouts,
  };
}
