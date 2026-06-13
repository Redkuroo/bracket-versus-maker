import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TournamentPhase, TournamentState } from '@/types/bracket';
import type { ParticipantInput } from '@/types/roster';

const STORAGE_KEY = '@bracket-versus/tournament-session';
const SESSION_VERSION = 1;

export type PersistedTournamentSession = {
  version: typeof SESSION_VERSION;
  savedAt: number;
  phase: TournamentPhase;
  setupPlayers: ParticipantInput[];
  tournament: TournamentState | null;
  history: TournamentState[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isParticipantInput(value: unknown): value is ParticipantInput {
  return isRecord(value) && typeof value.name === 'string';
}

export function normalizeTournamentState(value: TournamentState): TournamentState {
  return {
    ...value,
    players: Array.isArray(value.players) ? value.players : [],
    controllerAssignments:
      value.controllerAssignments && typeof value.controllerAssignments === 'object'
        ? value.controllerAssignments
        : {},
  };
}

function isTournamentState(value: unknown): value is TournamentState {
  if (!isRecord(value) || !Array.isArray(value.rounds) || !Array.isArray(value.participants)) {
    return false;
  }
  return true;
}

function parseSession(raw: string): PersistedTournamentSession | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.version !== SESSION_VERSION) return null;
    if (parsed.phase !== 'setup' && parsed.phase !== 'bracket') return null;
    if (!Array.isArray(parsed.setupPlayers) || !parsed.setupPlayers.every(isParticipantInput)) {
      return null;
    }
    if (parsed.tournament !== null && !isTournamentState(parsed.tournament)) return null;
    if (!Array.isArray(parsed.history) || !parsed.history.every(isTournamentState)) return null;

    return {
      version: SESSION_VERSION,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      phase: parsed.phase,
      setupPlayers: parsed.setupPlayers,
      tournament: parsed.tournament ? normalizeTournamentState(parsed.tournament) : null,
      history: parsed.history.map(normalizeTournamentState),
    };
  } catch {
    return null;
  }
}

export async function loadTournamentSession(): Promise<PersistedTournamentSession | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return parseSession(raw);
}

export async function saveTournamentSession(session: Omit<PersistedTournamentSession, 'version' | 'savedAt'>) {
  const payload: PersistedTournamentSession = {
    version: SESSION_VERSION,
    savedAt: Date.now(),
    ...session,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload.savedAt;
}

export async function clearTournamentSession() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function describeSavedSession(session: PersistedTournamentSession): string {
  const playerCount = session.setupPlayers.length;

  if (session.tournament) {
    const total = session.tournament.rounds.reduce((sum, round) => sum + round.matches.length, 0);
    const completed = session.tournament.rounds.reduce(
      (sum, round) => sum + round.matches.filter((match) => match.winnerId).length,
      0,
    );

    if (session.tournament.championId) {
      const champion = session.tournament.participants.find(
        (participant) => participant.id === session.tournament?.championId,
      );
      return champion
        ? `${playerCount} players · Champion: ${champion.name}`
        : `${playerCount} players · Tournament complete`;
    }

    return `${playerCount} players · ${completed}/${total} matches played`;
  }

  return `${playerCount} players configured`;
}
