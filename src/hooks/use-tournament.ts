import { useCallback, useMemo, useState } from 'react';

import { createTournament, selectMatchWinner } from '@/lib/bracket-engine';
import {
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  type TournamentPhase,
  type TournamentState,
} from '@/types/bracket';

function clampParticipantCount(count: number): number {
  return Math.min(MAX_PARTICIPANTS, Math.max(MIN_PARTICIPANTS, count));
}

export function useTournament() {
  const [phase, setPhase] = useState<TournamentPhase>('setup');
  const [participantCount, setParticipantCount] = useState(4);
  const [participantNames, setParticipantNames] = useState<string[]>(['', '', '', '']);
  const [tournament, setTournament] = useState<TournamentState | null>(null);

  const syncNameFields = useCallback((count: number) => {
    const clamped = clampParticipantCount(count);
    setParticipantCount(clamped);
    setParticipantNames((current) => {
      if (current.length === clamped) return current;
      if (current.length < clamped) {
        return [...current, ...Array.from({ length: clamped - current.length }, () => '')];
      }
      return current.slice(0, clamped);
    });
  }, []);

  const updateParticipantName = useCallback((index: number, name: string) => {
    setParticipantNames((current) => {
      const next = [...current];
      next[index] = name;
      return next;
    });
  }, []);

  const startTournament = useCallback(() => {
    const names = participantNames.filter((name, index) => index < participantCount);
    const next = createTournament(names.length > 0 ? names : ['Player 1', 'Player 2']);
    setTournament(next);
    setPhase('bracket');
  }, [participantCount, participantNames]);

  const resetTournament = useCallback(() => {
    setTournament(null);
    setPhase('setup');
  }, []);

  const pickWinner = useCallback((matchId: string, participantId: string) => {
    setTournament((current) => {
      if (!current) return current;
      return selectMatchWinner(current, matchId, participantId);
    });
  }, []);

  const champion = useMemo(() => {
    if (!tournament?.championId) return null;
    return tournament.participants.find((participant) => participant.id === tournament.championId) ?? null;
  }, [tournament]);

  return {
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
  };
}
