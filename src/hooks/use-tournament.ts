import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { PRESET_ROSTER } from '@/data/preset-roster';
import {
  assignControllers,
  cloneTournamentState,
  createTournament,
  reassignParticipantController,
  selectMatchWinner,
} from '@/lib/bracket-engine';
import {
  clearTournamentSession,
  describeSavedSession,
  loadTournamentSession,
  normalizeTournamentState,
  saveTournamentSession,
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
  return !Array.isArray(state.players) || !state.controllerAssignments;
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
  };
}

export function useTournament() {
  const [phase, setPhase] = useState<TournamentPhase>('setup');
  const [setupPlayers, setSetupPlayers] = useState<ParticipantInput[]>(createEmptyPlayers(4));
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [history, setHistory] = useState<TournamentState[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [savedSessionSummary, setSavedSessionSummary] = useState<string | null>(null);
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

  useEffect(() => {
    let cancelled = false;

    loadTournamentSession().then((session) => {
      if (cancelled) return;

      if (session) {
        setSetupPlayers(session.setupPlayers);
        setTournament(
          repairTournamentState(
            session.tournament ? normalizeTournamentState(session.tournament) : null,
            session.setupPlayers,
          ),
        );
        setHistory(session.history.map(normalizeTournamentState));
        setPhase(session.phase);
        setHasSavedSession(true);
        setSavedSessionSummary(describeSavedSession(session));
        setLastSavedAt(session.savedAt);
      }

      skipPersistRef.current = false;
      setIsHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
    const savedAt = await saveTournamentSession({
      phase,
      setupPlayers,
      tournament,
      history,
    });
    const summary = describeSavedSession({
      version: 1,
      savedAt,
      phase,
      setupPlayers,
      tournament,
      history,
    });
    setHasSavedSession(true);
    setLastSavedAt(savedAt);
    setSavedSessionSummary(summary);
    return { savedAt, summary };
  }, [phase, setupPlayers, tournament, history]);

  useEffect(() => {
    if (!isHydrated || skipPersistRef.current) return;

    const timeoutId = setTimeout(() => {
      persistCurrentSession().catch(() => undefined);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [isHydrated, phase, setupPlayers, tournament, history, persistCurrentSession]);

  const saveTournament = useCallback(async () => {
    try {
      const { summary } = await persistCurrentSession();
      Alert.alert('Saved', `${summary}\n\nProgress will remain after you close the app.`);
    } catch {
      Alert.alert('Save failed', 'Could not save tournament progress. Try again.');
    }
  }, [persistCurrentSession]);

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
  }, [setupPlayers]);

  const goHome = useCallback(() => {
    setPhase('setup');
  }, []);

  const resetTournament = useCallback(async () => {
    setTournament(null);
    setHistory([]);
    setPhase('setup');
    await clearTournamentSession();
    setHasSavedSession(false);
    setSavedSessionSummary(null);
    setLastSavedAt(null);
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
    hasSavedSession,
    savedSessionSummary,
    lastSavedAt,
    canContinueTournament,
    isBracketPhase,
    syncNameFields,
    updateParticipantName,
    loadPresetRoster,
    shuffleRoster,
    saveTournament,
    continueTournament,
    startTournament,
    goHome,
    resetTournament,
    pickWinner,
    undoLastPick,
    confirmPlayers,
    reassignController,
  };
}
