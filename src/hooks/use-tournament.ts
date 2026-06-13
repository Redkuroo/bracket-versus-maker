import { useCallback, useMemo, useState } from 'react';

import { PRESET_ROSTER } from '@/data/preset-roster';
import { cloneTournamentState, createTournament, selectMatchWinner } from '@/lib/bracket-engine';
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

export function useTournament() {
  const [phase, setPhase] = useState<TournamentPhase>('setup');
  const [setupPlayers, setSetupPlayers] = useState<ParticipantInput[]>(createEmptyPlayers(4));
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [history, setHistory] = useState<TournamentState[]>([]);

  const participantCount = setupPlayers.length;
  const participantNames = useMemo(() => setupPlayers.map((player) => player.name), [setupPlayers]);
  const participantImageUris = useMemo(
    () => setupPlayers.map((player) => player.imageUri ?? null),
    [setupPlayers],
  );

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

  const startTournament = useCallback(() => {
    const inputs =
      setupPlayers.length > 0
        ? setupPlayers
        : [
            { name: 'Player 1', imageUri: null },
            { name: 'Player 2', imageUri: null },
          ];
    const next = createTournament(inputs);
    setTournament(next);
    setHistory([]);
    setPhase('bracket');
  }, [setupPlayers]);

  const goHome = useCallback(() => {
    setTournament(null);
    setHistory([]);
    setPhase('setup');
  }, []);

  const resetTournament = goHome;

  const pickWinner = useCallback((matchId: string, participantId: string) => {
    setTournament((current) => {
      if (!current) return current;

      const next = selectMatchWinner(current, matchId, participantId);
      if (next === current) return current;

      setHistory((past) => [...past, cloneTournamentState(current)]);
      return next;
    });
  }, []);

  const undoLastPick = useCallback(() => {
    setHistory((past) => {
      if (past.length === 0) return past;

      const previous = past[past.length - 1];
      setTournament(cloneTournamentState(previous));
      return past.slice(0, -1);
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
    syncNameFields,
    updateParticipantName,
    loadPresetRoster,
    startTournament,
    goHome,
    resetTournament,
    pickWinner,
    undoLastPick,
  };
}
