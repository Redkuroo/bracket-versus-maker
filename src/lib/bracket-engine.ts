import type {
  BracketMatch,
  BracketRound,
  BracketSlot,
  Participant,
  TournamentState,
} from '@/types/bracket';
import { MIN_PARTICIPANTS, BracketSlotLabels, type BracketSlotKind } from '@/types/bracket';

function nextPowerOfTwo(value: number): number {
  let size = 1;
  while (size < value) size *= 2;
  return size;
}

function byeSlot(): BracketSlot {
  return { participantId: null, name: BracketSlotLabels.bye, isBye: true };
}

/** Bracket slot order for seed 1..bracketSize (standard single-elimination layout). */
export function generateSeedOrder(bracketSize: number): number[] {
  if (bracketSize <= 2) return bracketSize === 2 ? [1, 2] : [1];

  const half = bracketSize / 2;
  const previous = generateSeedOrder(half);
  const order: number[] = [];

  for (const seed of previous) {
    order.push(seed);
    order.push(bracketSize + 1 - seed);
  }

  return order;
}

export function getBracketInfo(playerCount: number) {
  const safeCount = Math.max(playerCount, MIN_PARTICIPANTS);
  const bracketSize = nextPowerOfTwo(safeCount);
  const byeCount = bracketSize - safeCount;

  return {
    playerCount: safeCount,
    bracketSize,
    byeCount,
    isPerfectBracket: safeCount === bracketSize,
    formula: `${bracketSize} slots − ${safeCount} players = ${byeCount} bye${byeCount === 1 ? '' : 's'}`,
  };
}

export type BracketInfo = ReturnType<typeof getBracketInfo>;

export function getBracketSlotPreview(participantNames: string[], playerCount: number) {
  const safeCount = Math.max(playerCount, MIN_PARTICIPANTS);
  const { bracketSize } = getBracketInfo(safeCount);
  const names = Array.from({ length: safeCount }, (_, index) => participantNames[index] ?? '');
  const participants = createParticipants(names);
  const slots = seedBracketSlots(participants, bracketSize);

  return slots.map((slot, index) => ({
    slotNumber: index + 1,
    label: getSlotDisplayLabel(slot),
    kind: getSlotKind(slot),
  }));
}

export type BracketSlotPreview = ReturnType<typeof getBracketSlotPreview>[number];

function seedBracketSlots(participants: Participant[], bracketSize: number): BracketSlot[] {
  const slots: BracketSlot[] = Array.from({ length: bracketSize }, () => byeSlot());
  const seedOrder = generateSeedOrder(bracketSize);

  for (let slotIndex = 0; slotIndex < bracketSize; slotIndex += 1) {
    const seed = seedOrder[slotIndex];
    if (seed <= participants.length) {
      slots[slotIndex] = slotFromParticipant(participants[seed - 1]);
    }
  }

  return slots;
}

function emptySlot(): BracketSlot {
  return { participantId: null, name: BracketSlotLabels.empty, isBye: false };
}

export function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

export function getSlotKind(slot: BracketSlot): BracketSlotKind {
  if (slot.participantId) return 'player';
  if (slot.isBye) return 'bye';
  return 'empty';
}

export function getSlotDisplayLabel(slot: BracketSlot): string {
  if (slot.participantId) return slot.name;
  if (slot.isBye) return BracketSlotLabels.bye;
  return BracketSlotLabels.empty;
}

function slotFromParticipant(participant: Participant): BracketSlot {
  return {
    participantId: participant.id,
    name: participant.name,
    isBye: participant.isBye,
  };
}

function getRoundLabel(roundIndex: number, totalRounds: number): string {
  const roundsFromFinal = totalRounds - roundIndex - 1;
  if (roundsFromFinal === 0) return 'FINAL';
  if (roundsFromFinal === 1) return 'SEMIFINALS';
  if (roundsFromFinal === 2) return 'QUARTERFINALS';
  return `ROUND ${roundIndex + 1}`;
}

function cloneRounds(rounds: BracketRound[]): BracketRound[] {
  return rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => ({
      ...match,
      slotA: { ...match.slotA },
      slotB: { ...match.slotB },
    })),
  }));
}

function getMatch(rounds: BracketRound[], roundIndex: number, matchIndex: number): BracketMatch | null {
  return rounds[roundIndex]?.matches[matchIndex] ?? null;
}

function advanceWinner(
  rounds: BracketRound[],
  match: BracketMatch,
  winnerId: string,
  winnerName: string,
): void {
  const nextRound = match.roundIndex + 1;
  const nextMatchIndex = Math.floor(match.matchIndex / 2);
  const nextMatch = getMatch(rounds, nextRound, nextMatchIndex);
  if (!nextMatch) return;

  const slot = match.matchIndex % 2 === 0 ? 'slotA' : 'slotB';
  nextMatch[slot] = {
    participantId: winnerId,
    name: winnerName,
    isBye: false,
  };
}

function resolveByeMatch(rounds: BracketRound[], match: BracketMatch): boolean {
  const { slotA, slotB } = match;
  const aBye = slotA.isBye;
  const bBye = slotB.isBye;

  if (!aBye && !bBye) return false;
  if (aBye && bBye) {
    match.status = 'complete';
    return true;
  }

  const winnerSlot = aBye ? slotB : slotA;
  if (!winnerSlot.participantId) return false;

  match.winnerId = winnerSlot.participantId;
  match.status = 'complete';
  advanceWinner(rounds, match, winnerSlot.participantId, winnerSlot.name);
  return true;
}

function refreshMatchStatus(match: BracketMatch): void {
  if (match.winnerId) {
    match.status = 'complete';
    return;
  }

  const hasA = Boolean(match.slotA.participantId);
  const hasB = Boolean(match.slotB.participantId);

  if (hasA && hasB) {
    match.status = 'ready';
    return;
  }

  match.status = 'pending';
}

function findActiveMatchId(rounds: BracketRound[]): string | null {
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.status === 'ready') return match.id;
    }
  }
  return null;
}

function findChampionId(rounds: BracketRound[]): string | null {
  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound?.matches[0];
  return finalMatch?.winnerId ?? null;
}

function processAutoAdvances(rounds: BracketRound[]): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const round of rounds) {
      for (const match of round.matches) {
        refreshMatchStatus(match);
        if (match.status === 'ready' && resolveByeMatch(rounds, match)) {
          changed = true;
        }
      }
    }
  }
}

function applyActiveMatch(rounds: BracketRound[], activeMatchId: string | null): string | null {
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.status === 'active') {
        match.status = match.winnerId ? 'complete' : 'ready';
      }
    }
  }

  const nextActive = activeMatchId ?? findActiveMatchId(rounds);
  if (!nextActive) return null;

  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.id === nextActive && match.status === 'ready') {
        match.status = 'active';
        return nextActive;
      }
    }
  }

  return nextActive;
}

function finalizeState(rounds: BracketRound[]): TournamentState {
  processAutoAdvances(rounds);
  const activeMatchId = applyActiveMatch(rounds, findActiveMatchId(rounds));
  return {
    rounds,
    participants: [],
    activeMatchId,
    championId: findChampionId(rounds),
  };
}

export function createParticipants(names: string[]): Participant[] {
  const trimmed = names.map((name, index) => name.trim() || `Player ${index + 1}`);

  return trimmed.map((name, index) => ({
    id: `p-${index}`,
    name,
    isBye: false,
  }));
}

export function createTournament(participantNames: string[]): TournamentState {
  const participants = createParticipants(participantNames);
  const bracketSize = nextPowerOfTwo(Math.max(participants.length, MIN_PARTICIPANTS));
  const roundCount = Math.log2(bracketSize);
  const seededSlots = seedBracketSlots(participants, bracketSize);
  const rounds: BracketRound[] = [];

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const matchCount = bracketSize / 2 ** (roundIndex + 1);
    const matches: BracketMatch[] = [];

    for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
      matches.push({
        id: `r${roundIndex}-m${matchIndex}`,
        roundIndex,
        matchIndex,
        slotA: emptySlot(),
        slotB: emptySlot(),
        winnerId: null,
        status: 'pending',
      });
    }

    rounds.push({
      index: roundIndex,
      label: getRoundLabel(roundIndex, roundCount),
      matches,
    });
  }

  for (let matchIndex = 0; matchIndex < rounds[0].matches.length; matchIndex += 1) {
    const match = rounds[0].matches[matchIndex];
    match.slotA = seededSlots[matchIndex * 2];
    match.slotB = seededSlots[matchIndex * 2 + 1];
  }

  const state = finalizeState(rounds);
  return { ...state, participants };
}

export function selectMatchWinner(
  state: TournamentState,
  matchId: string,
  winnerParticipantId: string,
): TournamentState {
  const rounds = cloneRounds(state.rounds);
  let targetMatch: BracketMatch | null = null;

  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.id === matchId) targetMatch = match;
    }
  }

  if (!targetMatch || targetMatch.winnerId) return state;
  if (targetMatch.status !== 'active' && targetMatch.status !== 'ready') return state;

  const winnerSlot =
    targetMatch.slotA.participantId === winnerParticipantId
      ? targetMatch.slotA
      : targetMatch.slotB.participantId === winnerParticipantId
        ? targetMatch.slotB
        : null;

  if (!winnerSlot?.participantId || winnerSlot.isBye) return state;

  targetMatch.winnerId = winnerParticipantId;
  targetMatch.status = 'complete';
  advanceWinner(rounds, targetMatch, winnerParticipantId, winnerSlot.name);

  const nextState = finalizeState(rounds);
  return { ...nextState, participants: state.participants };
}

export function getMatchTop(roundIndex: number, matchIndex: number, unitHeight: number): number {
  if (roundIndex === 0) {
    return matchIndex * unitHeight * 2;
  }

  return matchIndex * unitHeight * 2 ** (roundIndex + 1) + unitHeight * (2 ** roundIndex - 1);
}

export function getMatchCenterY(
  roundIndex: number,
  matchIndex: number,
  unitHeight: number,
  matchNodeHeight: number,
): number {
  return getMatchTop(roundIndex, matchIndex, unitHeight) + matchNodeHeight / 2;
}

export function getBracketVerticalOffset(
  roundCount: number,
  firstRoundMatchCount: number,
  unitHeight: number,
  matchNodeHeight: number,
): number {
  if (roundCount === 0) return 0;

  const canvasHeight = firstRoundMatchCount * unitHeight * 2;
  const finalRoundIndex = roundCount - 1;
  const finalCenter = getMatchCenterY(finalRoundIndex, 0, unitHeight, matchNodeHeight);

  return canvasHeight / 2 - finalCenter;
}

export function getMatchHeight(roundIndex: number, unitHeight: number): number {
  return unitHeight * 2 ** roundIndex;
}

export function getCanvasHeight(rounds: BracketRound[], unitHeight: number): number {
  if (rounds.length === 0) return unitHeight;
  const firstRoundMatches = rounds[0].matches.length;
  return firstRoundMatches * unitHeight * 2;
}
