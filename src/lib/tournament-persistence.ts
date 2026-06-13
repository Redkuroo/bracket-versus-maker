import AsyncStorage from '@react-native-async-storage/async-storage';

import { createDefaultRoundPayouts } from '@/lib/bracket-engine';
import type { TournamentPhase, TournamentState } from '@/types/bracket';
import type { ParticipantInput } from '@/types/roster';

const LEGACY_STORAGE_KEY = '@bracket-versus/tournament-session';
const MONOLITHIC_SAVES_KEY = '@bracket-versus/tournament-saves';
const SAVE_INDEX_KEY = '@bracket-versus/tournament-save-index';
const SAVE_SLOT_PREFIX = '@bracket-versus/tournament-save/';
const SESSION_VERSION = 1;
const INDEX_VERSION = 3;
const MONOLITHIC_REGISTRY_VERSION = 2;

export type PersistedTournamentSession = {
  version: typeof SESSION_VERSION;
  savedAt: number;
  phase: TournamentPhase;
  setupPlayers: ParticipantInput[];
  tournament: TournamentState | null;
  history: TournamentState[];
};

export type SavedTournamentSummary = {
  id: string;
  label: string;
  summary: string;
  savedAt: number;
  phase: TournamentPhase;
};

export type SavedTournamentSlot = SavedTournamentSummary & {
  setupPlayers: ParticipantInput[];
  tournament: TournamentState | null;
  history: TournamentState[];
};

type SaveSlotIndex = {
  version: typeof INDEX_VERSION;
  slots: SavedTournamentSummary[];
};

type MonolithicSaveRegistry = {
  version: typeof MONOLITHIC_REGISTRY_VERSION;
  slots: SavedTournamentSlot[];
};

const MAX_SAVE_BYTES = 1_900_000;

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
    if (!Array.isArray(parsed.history)) return null;

    return {
      version: SESSION_VERSION,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      phase: parsed.phase,
      setupPlayers: parsed.setupPlayers,
      tournament: parsed.tournament ? normalizeTournamentState(parsed.tournament) : null,
      history: parsed.history.filter(isTournamentState).map(normalizeTournamentState),
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
  if (!Array.isArray(value.history)) return null;

  return {
    id: value.id,
    label: value.label,
    summary: value.summary,
    savedAt: value.savedAt,
    phase: value.phase,
    setupPlayers: value.setupPlayers,
    tournament: value.tournament ? normalizeTournamentState(value.tournament) : null,
    history: value.history.filter(isTournamentState).map(normalizeTournamentState),
  };
}

function parseMonolithicRegistry(raw: string): MonolithicSaveRegistry | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.version !== MONOLITHIC_REGISTRY_VERSION) return null;
    if (!Array.isArray(parsed.slots)) return null;

    const slots = parsed.slots.map(parseSlot).filter((slot): slot is SavedTournamentSlot => slot !== null);
    return { version: MONOLITHIC_REGISTRY_VERSION, slots };
  } catch {
    return null;
  }
}

function parseIndex(raw: string): SaveSlotIndex | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.version !== INDEX_VERSION) return null;
    if (!Array.isArray(parsed.slots)) return null;

    const slots = parsed.slots
      .map((entry) => {
        if (!isRecord(entry)) return null;
        if (typeof entry.id !== 'string') return null;
        if (typeof entry.label !== 'string') return null;
        if (typeof entry.summary !== 'string') return null;
        if (typeof entry.savedAt !== 'number') return null;
        if (entry.phase !== 'setup' && entry.phase !== 'bracket') return null;
        return entry as SavedTournamentSummary;
      })
      .filter((entry): entry is SavedTournamentSummary => entry !== null);

    return { version: INDEX_VERSION, slots };
  } catch {
    return null;
  }
}

function createSlotId(): string {
  return `save-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function slotStorageKey(id: string): string {
  return `${SAVE_SLOT_PREFIX}${id}`;
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
    history: [],
  };
}

function toSummary(slot: SavedTournamentSlot): SavedTournamentSummary {
  return {
    id: slot.id,
    label: slot.label,
    summary: slot.summary,
    savedAt: slot.savedAt,
    phase: slot.phase,
  };
}

/** Undo history is session-only — storing it blows past AsyncStorage size limits. */
export function trimSessionForPersistence(
  session: Omit<PersistedTournamentSession, 'version' | 'savedAt'>,
): Omit<PersistedTournamentSession, 'version' | 'savedAt'> {
  return {
    phase: session.phase,
    setupPlayers: session.setupPlayers,
    tournament: session.tournament,
    history: [],
  };
}

async function safeGetItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    await AsyncStorage.removeItem(key).catch(() => undefined);
    return null;
  }
}

async function safeRemoveItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function serializeForStorage(value: unknown, tooLargeMessage: string): string {
  let serialized = '';
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error('Could not serialize tournament data.');
  }

  if (serialized.length > MAX_SAVE_BYTES) {
    throw new Error(tooLargeMessage);
  }

  return serialized;
}

async function writeIndex(slots: SavedTournamentSummary[]): Promise<void> {
  const payload: SaveSlotIndex = {
    version: INDEX_VERSION,
    slots: [...slots].sort((a, b) => b.savedAt - a.savedAt),
  };
  const serialized = serializeForStorage(payload, 'Save index is too large. Delete an older saved tournament.');
  try {
    await AsyncStorage.setItem(SAVE_INDEX_KEY, serialized);
  } catch {
    throw new Error('Device storage could not write the save index.');
  }
}

async function writeSlot(slot: SavedTournamentSlot): Promise<void> {
  const trimmed: SavedTournamentSlot = { ...slot, history: [] };
  const serialized = serializeForStorage(
    trimmed,
    'This tournament is too large to save on this device. Try a smaller roster.',
  );

  try {
    await AsyncStorage.setItem(slotStorageKey(slot.id), serialized);
  } catch {
    throw new Error('Device storage could not write this tournament save.');
  }
}

async function readIndex(): Promise<SaveSlotIndex> {
  const raw = await safeGetItem(SAVE_INDEX_KEY);
  if (raw) {
    const parsed = parseIndex(raw);
    if (parsed) return parsed;
    await safeRemoveItem(SAVE_INDEX_KEY);
  }

  return { version: INDEX_VERSION, slots: [] };
}

async function readSlot(id: string): Promise<SavedTournamentSlot | null> {
  const raw = await safeGetItem(slotStorageKey(id));
  if (!raw) return null;

  try {
    return parseSlot(JSON.parse(raw));
  } catch {
    await safeRemoveItem(slotStorageKey(id));
    return null;
  }
}

async function migrateLegacySession(): Promise<SavedTournamentSlot | null> {
  const raw = await safeGetItem(LEGACY_STORAGE_KEY);
  if (!raw) return null;

  const session = parseSession(raw);
  await safeRemoveItem(LEGACY_STORAGE_KEY);
  if (!session) return null;

  return sessionToSlot(createSlotId(), {
    ...session,
    ...trimSessionForPersistence(session),
  });
}

async function migrateMonolithicRegistry(): Promise<SavedTournamentSlot[]> {
  const raw = await safeGetItem(MONOLITHIC_SAVES_KEY);
  await safeRemoveItem(MONOLITHIC_SAVES_KEY);
  if (!raw) return [];

  const registry = parseMonolithicRegistry(raw);
  if (!registry) return [];

  return registry.slots.map((slot) => ({ ...slot, history: [] }));
}

async function ensureMigratedIndex(): Promise<SaveSlotIndex> {
  let index = await readIndex();
  if (index.slots.length > 0) return index;

  const monolithicSlots = await migrateMonolithicRegistry();
  if (monolithicSlots.length > 0) {
    for (const slot of monolithicSlots) {
      await writeSlot(slot);
    }
    index = {
      version: INDEX_VERSION,
      slots: monolithicSlots.map(toSummary).sort((a, b) => b.savedAt - a.savedAt),
    };
    await writeIndex(index.slots);
    return index;
  }

  const legacySlot = await migrateLegacySession();
  if (legacySlot) {
    await writeSlot(legacySlot);
    index = { version: INDEX_VERSION, slots: [toSummary(legacySlot)] };
    await writeIndex(index.slots);
  }

  return index;
}

export async function loadAllSavedTournaments(): Promise<SavedTournamentSummary[]> {
  const index = await ensureMigratedIndex();
  return index.slots;
}

export async function loadSavedTournamentById(id: string): Promise<SavedTournamentSlot | null> {
  await ensureMigratedIndex();
  return readSlot(id);
}

export async function upsertSavedTournament(
  slotId: string | null,
  session: Omit<PersistedTournamentSession, 'version' | 'savedAt'>,
  label?: string,
): Promise<{ slotId: string; savedAt: number; slot: SavedTournamentSlot }> {
  const trimmed = trimSessionForPersistence(session);
  const savedAt = Date.now();
  const persisted: PersistedTournamentSession = {
    version: SESSION_VERSION,
    savedAt,
    ...trimmed,
  };

  const index = await ensureMigratedIndex();
  const existing = slotId ? index.slots.find((slot) => slot.id === slotId) : null;
  const nextId = existing?.id ?? createSlotId();
  const nextSlot = sessionToSlot(nextId, persisted, label ?? existing?.label);

  await writeSlot(nextSlot);

  const nextIndex = existing
    ? index.slots.map((slot) => (slot.id === nextId ? toSummary(nextSlot) : slot))
    : [toSummary(nextSlot), ...index.slots];

  await writeIndex(nextIndex);
  return { slotId: nextId, savedAt, slot: nextSlot };
}

export async function deleteSavedTournament(id: string): Promise<void> {
  const index = await ensureMigratedIndex();
  await safeRemoveItem(slotStorageKey(id));
  await writeIndex(index.slots.filter((slot) => slot.id !== id));
}

export async function renameSavedTournament(
  id: string,
  label: string,
): Promise<SavedTournamentSummary | null> {
  const trimmed = label.trim();
  if (!trimmed) return null;

  const index = await ensureMigratedIndex();
  const existingSummary = index.slots.find((slot) => slot.id === id);
  if (!existingSummary) return null;

  const existingSlot = await readSlot(id);
  if (existingSlot) {
    await writeSlot({ ...existingSlot, label: trimmed });
  }

  const nextSummary = { ...existingSummary, label: trimmed };
  await writeIndex(index.slots.map((slot) => (slot.id === id ? nextSummary : slot)));
  return nextSummary;
}

export async function clearAllSavedTournaments(): Promise<void> {
  const index = await readIndex();
  await Promise.all(index.slots.map((slot) => safeRemoveItem(slotStorageKey(slot.id))));
  await safeRemoveItem(SAVE_INDEX_KEY);
  await safeRemoveItem(MONOLITHIC_SAVES_KEY);
  await safeRemoveItem(LEGACY_STORAGE_KEY);
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
