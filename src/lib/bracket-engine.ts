import type {
  BracketMatch,
  BracketRound,
  BracketSlot,
  Participant,
  TournamentState,
} from '@/types/bracket';
import { MIN_PARTICIPANTS, BracketSlotLabels, type BracketSlotKind } from '@/types/bracket';

type MatchKey = `${number}:${number}`;
type AdvanceTarget = {
  roundIndex: number;
  matchIndex: number;
  slot: 'slotA' | 'slotB';
};

function byeSlot(): BracketSlot {
  return { participantId: null, name: BracketSlotLabels.bye, isBye: true };
}

function emptySlot(): BracketSlot {
  return { participantId: null, name: BracketSlotLabels.empty, isBye: false };
}

function slotFromParticipant(participant: Participant): BracketSlot {
  return {
    participantId: participant.id,
    name: participant.name,
    isBye: participant.isBye,
  };
}

/** How many matches per round, and whether a round starts with one auto-advanced entrant. */
export function computeRoundStructure(playerCount: number) {
  let count = Math.max(playerCount, MIN_PARTICIPANTS);
  const matchCounts: number[] = [];
  const incomingBye: boolean[] = [];

  while (count > 1) {
    const roundBye = count % 2 === 1;
    incomingBye.push(roundBye);
    if (roundBye) count -= 1;
    matchCounts.push(count / 2);
    count = count / 2 + (roundBye ? 1 : 0);
  }

  return { matchCounts, incomingBye };
}

function byeMatchIndex(roundIndex: number, matchCounts: number[], incomingBye: boolean[]): number | null {
  if (roundIndex <= 0 || !incomingBye[roundIndex]) return null;
  return matchCounts[roundIndex];
}

function roundMatchTotal(roundIndex: number, matchCounts: number[], incomingBye: boolean[]): number {
  const byeIndex = byeMatchIndex(roundIndex, matchCounts, incomingBye);
  return matchCounts[roundIndex] + (byeIndex !== null ? 1 : 0);
}

function standardFeeder(roundIndex: number, matchIndex: number): AdvanceTarget {
  return {
    roundIndex: roundIndex + 1,
    matchIndex: Math.floor(matchIndex / 2),
    slot: matchIndex % 2 === 0 ? 'slotA' : 'slotB',
  };
}

function buildAdvanceLinks(matchCounts: number[], incomingBye: boolean[]) {
  const links = new Map<MatchKey, AdvanceTarget>();
  const roundCount = matchCounts.length;

  // Winners from round r enter round r+1 playing matches in standard pairs.
  for (let roundIndex = 0; roundIndex < roundCount - 1; roundIndex += 1) {
    const nextPlaying = matchCounts[roundIndex + 1];

    for (let matchIndex = 0; matchIndex < nextPlaying; matchIndex += 1) {
      links.set(`${roundIndex}:${matchIndex * 2}` as MatchKey, {
        roundIndex: roundIndex + 1,
        matchIndex,
        slot: 'slotA',
      });
      links.set(`${roundIndex}:${matchIndex * 2 + 1}` as MatchKey, {
        roundIndex: roundIndex + 1,
        matchIndex,
        slot: 'slotB',
      });
    }

    // Odd winner count: last winner enters a bye walkover at the bottom of the next round.
    if (incomingBye[roundIndex + 1]) {
      links.set(`${roundIndex}:${nextPlaying * 2}` as MatchKey, {
        roundIndex: roundIndex + 1,
        matchIndex: nextPlaying,
        slot: 'slotA',
      });
    }
  }

  // Where each match's winner goes next.
  for (let roundIndex = 0; roundIndex < roundCount - 1; roundIndex += 1) {
    const playing = matchCounts[roundIndex];
    const roundByeIndex = byeMatchIndex(roundIndex, matchCounts, incomingBye);

    for (let matchIndex = 0; matchIndex < playing; matchIndex += 1) {
      const key = `${roundIndex}:${matchIndex}` as MatchKey;
      if (links.has(key)) continue;

      const target = standardFeeder(roundIndex, matchIndex);
      if (target.matchIndex < matchCounts[roundIndex + 1]) {
        links.set(key, target);
      }
    }

    if (roundByeIndex !== null && roundIndex + 1 < roundCount) {
      const key = `${roundIndex}:${roundByeIndex}` as MatchKey;
      if (incomingBye[roundIndex + 1]) {
        links.set(key, {
          roundIndex: roundIndex + 1,
          matchIndex: matchCounts[roundIndex + 1],
          slot: 'slotA',
        });
      } else {
        links.set(key, standardFeeder(roundIndex, roundByeIndex));
      }
    }
  }

  return links;
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
      advanceTo: match.advanceTo ? { ...match.advanceTo } : undefined,
    })),
  }));
}

function isByeWalkover(match: BracketMatch): boolean {
  const { slotA, slotB } = match;
  if (slotA.isBye && slotB.isBye) return false;
  if (!slotA.isBye && !slotB.isBye) return false;
  const playerSlot = slotA.isBye ? slotB : slotA;
  return Boolean(playerSlot.participantId);
}

function refreshMatchStatus(match: BracketMatch): void {
  if (match.winnerId) {
    match.status = 'complete';
    return;
  }

  const { slotA, slotB } = match;

  if (slotA.isBye && slotB.isBye) {
    match.status = 'complete';
    return;
  }

  if (isByeWalkover(match)) {
    match.status = 'ready';
    return;
  }

  const hasA = Boolean(slotA.participantId);
  const hasB = Boolean(slotB.participantId);

  if (hasA && hasB) {
    match.status = 'ready';
    return;
  }

  match.status = 'pending';
}

function placeWinner(
  rounds: BracketRound[],
  match: BracketMatch,
  winnerId: string,
  winnerName: string,
): void {
  if (!match.advanceTo) return;

  const { roundIndex, matchIndex, slot } = match.advanceTo;
  const targetMatch = rounds[roundIndex]?.matches[matchIndex];
  if (!targetMatch) return;

  targetMatch[slot] = {
    participantId: winnerId,
    name: winnerName,
    isBye: false,
  };
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
  return finalRound?.matches[0]?.winnerId ?? null;
}

function refreshAllMatchStatuses(rounds: BracketRound[]): void {
  for (const round of rounds) {
    for (const match of round.matches) {
      refreshMatchStatus(match);
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
  refreshAllMatchStatuses(rounds);
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
  const playerCount = Math.max(participants.length, MIN_PARTICIPANTS);
  const { matchCounts, incomingBye } = computeRoundStructure(playerCount);
  const advanceLinks = buildAdvanceLinks(matchCounts, incomingBye);
  const rounds: BracketRound[] = [];

  for (let roundIndex = 0; roundIndex < matchCounts.length; roundIndex += 1) {
    const totalMatches = roundMatchTotal(roundIndex, matchCounts, incomingBye);
    const roundByeIndex = byeMatchIndex(roundIndex, matchCounts, incomingBye);
    const matches: BracketMatch[] = [];

    for (let matchIndex = 0; matchIndex < totalMatches; matchIndex += 1) {
      const isByeWalkover = roundByeIndex !== null && matchIndex === roundByeIndex;
      const key: MatchKey = `${roundIndex}:${matchIndex}`;

      matches.push({
        id: `r${roundIndex}-m${matchIndex}`,
        roundIndex,
        matchIndex,
        slotA: emptySlot(),
        slotB: isByeWalkover ? byeSlot() : emptySlot(),
        winnerId: null,
        status: 'pending',
        advanceTo: advanceLinks.get(key),
      });
    }

    rounds.push({
      index: roundIndex,
      label: getRoundLabel(roundIndex, matchCounts.length),
      matches,
    });
  }

  const firstRound = rounds[0];
  if (firstRound) {
    if (incomingBye[0]) {
      const byeCarrier = slotFromParticipant(participants[participants.length - 1]);
      const waitingMatch = firstRound.matches[firstRound.matches.length - 1];
      if (waitingMatch) {
        waitingMatch.slotA = byeCarrier;
        waitingMatch.slotB = byeSlot();
      }
      for (let matchIndex = 0; matchIndex < firstRound.matches.length - 1; matchIndex += 1) {
        const match = firstRound.matches[matchIndex];
        match.slotA = slotFromParticipant(participants[matchIndex * 2]);
        match.slotB = slotFromParticipant(participants[matchIndex * 2 + 1]);
      }
    } else {
      for (let matchIndex = 0; matchIndex < firstRound.matches.length; matchIndex += 1) {
        const match = firstRound.matches[matchIndex];
        match.slotA = slotFromParticipant(participants[matchIndex * 2]);
        match.slotB = slotFromParticipant(participants[matchIndex * 2 + 1]);
      }
    }
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
  placeWinner(rounds, targetMatch, winnerParticipantId, winnerSlot.name);

  const nextState = finalizeState(rounds);
  return { ...nextState, participants: state.participants };
}

export function getMatchTop(
  roundIndex: number,
  matchIndex: number,
  unitHeight: number,
  firstRoundMatchCount: number,
  roundMatchCount: number,
  matchNodeHeight: number,
): number {
  const canvasHeight = firstRoundMatchCount * unitHeight * 2;

  if (roundIndex === 0) {
    return matchIndex * unitHeight * 2;
  }

  const spacing = canvasHeight / Math.max(roundMatchCount, 1);
  return matchIndex * spacing + Math.max(0, (spacing - matchNodeHeight) / 2);
}

export function getMatchCenterY(
  roundIndex: number,
  matchIndex: number,
  unitHeight: number,
  matchNodeHeight: number,
  firstRoundMatchCount: number,
  roundMatchCount: number,
): number {
  return (
    getMatchTop(roundIndex, matchIndex, unitHeight, firstRoundMatchCount, roundMatchCount, matchNodeHeight) +
    matchNodeHeight / 2
  );
}

export function getBracketVerticalOffset(
  rounds: BracketRound[],
  unitHeight: number,
  matchNodeHeight: number,
): number {
  if (rounds.length === 0) return 0;

  const firstRoundMatchCount = rounds[0].matches.length;
  const canvasHeight = firstRoundMatchCount * unitHeight * 2;
  const finalRound = rounds[rounds.length - 1];
  const finalCenter = getMatchCenterY(
    finalRound.index,
    0,
    unitHeight,
    matchNodeHeight,
    firstRoundMatchCount,
    finalRound.matches.length,
  );

  return canvasHeight / 2 - finalCenter;
}

export function getCanvasHeight(rounds: BracketRound[], unitHeight: number): number {
  if (rounds.length === 0) return unitHeight;
  return rounds[0].matches.length * unitHeight * 2;
}
