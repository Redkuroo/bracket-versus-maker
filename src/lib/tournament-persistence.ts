import AsyncStorage from '@react-native-async-storage/async-storage';

import { createDefaultRoundPayouts } from '@/lib/bracket-engine';
import type { TournamentPhase, TournamentState } from '@/types/bracket';
import type { ParticipantInput } from '@/types/roster';

const LEGACY_STORAGE_KEY = '@bracket-versus/tournament-session';
const SAVES_STORAGE_KEY = '@bracket-versus/tournament-saves';
const SESSION_VERSION = 1;
const REGISTRY_VERSION = 2;

export type PersistedTournamentSession = {
  version: typeof SESSION_VERSION;
  savedAt: number;
  phase: TournamentPhase;
  setupPlayers: ParticipantInput[];
  tournament: TournamentState | null;
  history: TournamentState[];
};

export type SavedTournamentSlot = {
  id: string;
  label: string;
  summary: string;
  savedAt: number;
  phase: TournamentPhase;
  setupPlayers: ParticipantInput[];
  tournament: TournamentState | null;
  history: TournamentState[];
};

type TournamentSaveRegistry = {
  version: typeof REGISTRY_VERSION;
  slots: SavedTournamentSlot[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isParticipantInput(value: unknown): value is ParticipantInput {
  return isRecord(value) && typeof value.name === 'string';
}

export function normalizeTournamentState(value: TournamentState): TournamentState {
  const defaults = createDefaultRoundPayouts(value.rounds);
  const roundPayouts = { ...defaults };

  if (value.roundPayouts && typeof value.roundPayouts === 'object') {
    for (const [key, amount] of Object.entries(value.roundPayouts)) {
      const roundIndex = Number(key);
      if (!Number.isNaN(roundIndex) && typeof amount === 'number' && amount >= 0) {
        roundPayouts[roundIndex] = Math.floor(amount);
      }
    }
  }

  return {
    ...value,
    players: Array.isArray(value.players)
      ? value.players.map((player) => ({
          ...player,
          pocketMoney: typeof player.pocketMoney === 'number' ? player.pocketMoney : 0,
        }))
      : [],
    controllerAssignments:
      value.controllerAssignments && typeof value.controllerAssignments === 'object'
        ? value.controllerAssignments
        : {},
    roundPayouts,
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

function parseSlot(value: unknown): SavedTournamentSlot | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string') return null;
  if (typeof value.label !== 'string') return null;
  if (typeof value.summary !== 'string') return null;
  if (typeof value.savedAt !== 'number') return null;
  if (value.phase !== 'setup' && value.phase !== 'bracket') return null;
  if (!Array.isArray(value.setupPlayers) || !value.setupPlayers.every(isParticipantInput)) return null;
  if (value.tournament !== null && !isTournamentState(value.tournament)) return null;
  if (!Array.isArray(value.history) || !value.history.every(isTournamentState)) return null;

  return {
    id: value.id,
    label: value.label,
    summary: value.summary,
    savedAt: value.savedAt,
    phase: value.phase,
    setupPlayers: value.setupPlayers,
    tournament: value.tournament ? normalizeTournamentState(value.tournament) : null,
    history: value.history.map(normalizeTournamentState),
  };
}

function parseRegistry(raw: string): TournamentSaveRegistry | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.version !== REGISTRY_VERSION) return null;
    if (!Array.isArray(parsed.slots)) return null;

    const slots = parsed.slots.map(parseSlot).filter((slot): slot is SavedTournamentSlot => slot !== null);
    return { version: REGISTRY_VERSION, slots };
  } catch {
    return null;
  }
}

function createSlotId(): string {
  return `save-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sessionToSlot(
  slotId: string,
  session: PersistedTournamentSession,
  label?: string,
): SavedTournamentSlot {
  const summary = describeSavedSession(session);
  return {
    id: slotId,
    label: label ?? buildSlotLabel(session),
    summary,
    savedAt: session.savedAt,
    phase: session.phase,
    setupPlayers: session.setupPlayers,
    tournament: session.tournament,
    history: session.history,
  };
}

function buildSlotLabel(session: PersistedTournamentSession): string {
  const named = session.setupPlayers
    .map((player) => player.name.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (named.length > 0) {
    const suffix = session.setupPlayers.length > named.length ? ` +${session.setupPlayers.length - named.length}` : '';
    return `${named.join(' vs ')}${suffix}`;
  }

  return `${session.setupPlayers.length} players`;
}

async function writeRegistry(slots: SavedTournamentSlot[]): Promise<void> {
  const payload: TournamentSaveRegistry = {
    version: REGISTRY_VERSION,
    slots: slots.sort((a, b) => b.savedAt - a.savedAt),
  };
  await AsyncStorage.setItem(SAVES_STORAGE_KEY, JSON.stringify(payload));
}

async function migrateLegacySession(): Promise<SavedTournamentSlot | null> {
  const raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return null;

  const session = parseSession(raw);
  if (!session) {
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    return null;
  }

  const slot = sessionToSlot(createSlotId(), session);
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  return slot;
}

export async function loadAllSavedTournaments(): Promise<SavedTournamentSlot[]> {
  const raw = await AsyncStorage.getItem(SAVES_STORAGE_KEY);
  let registry = raw ? parseRegistry(raw) : null;

  if (!registry) {
    const migrated = await migrateLegacySession();
    registry = { version: REGISTRY_VERSION, slots: migrated ? [migrated] : [] };
    await writeRegistry(registry.slots);
    return registry.slots;
  }

  if (registry.slots.length === 0) {
    const migrated = await migrateLegacySession();
    if (migrated) {
      registry.slots = [migrated];
      await writeRegistry(registry.slots);
    }
  }

  return registry.slots.sort((a, b) => b.savedAt - a.savedAt);
}

export async function loadSavedTournamentById(id: string): Promise<SavedTournamentSlot | null> {
  const slots = await loadAllSavedTournaments();
  return slots.find((slot) => slot.id === id) ?? null;
}

export async function upsertSavedTournament(
  slotId: string | null,
  session: Omit<PersistedTournamentSession, 'version' | 'savedAt'>,
  label?: string,
): Promise<{ slotId: string; savedAt: number; slot: SavedTournamentSlot }> {
  const savedAt = Date.now();
  const persisted: PersistedTournamentSession = {
    version: SESSION_VERSION,
    savedAt,
    ...session,
  };

  const slots = await loadAllSavedTournaments();
  const existing = slotId ? slots.find((slot) => slot.id === slotId) : null;
  const nextId = existing?.id ?? createSlotId();
  const nextSlot = sessionToSlot(nextId, persisted, label ?? existing?.label);

  const nextSlots = existing
    ? slots.map((slot) => (slot.id === nextId ? nextSlot : slot))
    : [nextSlot, ...slots];

  await writeRegistry(nextSlots);
  return { slotId: nextId, savedAt, slot: nextSlot };
}

export async function deleteSavedTournament(id: string): Promise<void> {
  const slots = await loadAllSavedTournaments();
  await writeRegistry(slots.filter((slot) => slot.id !== id));
}

export async function renameSavedTournament(
  id: string,
  label: string,
): Promise<SavedTournamentSlot | null> {
  const trimmed = label.trim();
  if (!trimmed) return null;

  const slots = await loadAllSavedTournaments();
  const existing = slots.find((slot) => slot.id === id);
  if (!existing) return null;

  const nextSlot = { ...existing, label: trimmed };
  await writeRegistry(slots.map((slot) => (slot.id === id ? nextSlot : slot)));
  return nextSlot;
}

export async function clearAllSavedTournaments(): Promise<void> {
  await AsyncStorage.multiRemove([SAVES_STORAGE_KEY, LEGACY_STORAGE_KEY]);
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

export function formatSaveTimestamp(savedAt: number): string {
  return new Date(savedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
