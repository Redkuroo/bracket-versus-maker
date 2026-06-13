import type {
  BracketMatch,
  BracketRound,
  BracketSlot,
  Participant,
  TournamentPlayer,
  TournamentState,
} from '@/types/bracket';
import { BracketSlotLabels, MIN_PARTICIPANTS, type BracketSlotKind } from '@/types/bracket';
import type { ParticipantInput } from '@/types/roster';

type MatchKey = `${number}:${number}`;
type AdvanceTarget = {
  roundIndex: number;
  matchIndex: number;
  slot: 'slotA' | 'slotB';
};

function byeSlot(): BracketSlot {
  return { participantId: null, name: BracketSlotLabels.bye, imageUri: null, isBye: true };
}

function emptySlot(): BracketSlot {
  return { participantId: null, name: BracketSlotLabels.empty, imageUri: null, isBye: false };
}

function slotFromParticipant(participant: Participant): BracketSlot {
  return {
    participantId: participant.id,
    name: participant.name,
    imageUri: participant.imageUri,
    isBye: participant.isBye,
  };
}

/** How many matches per round, and whether a round starts with one auto-advanced entrant. */
export function computeRoundStructure(playerCount: number) {
  let teams = Math.max(playerCount, MIN_PARTICIPANTS);
  const matchCounts: number[] = [];
  const incomingBye: boolean[] = [];

  while (teams > 1) {
    const roundBye = teams % 2 === 1;
    incomingBye.push(roundBye);
    const playingTeams = roundBye ? teams - 1 : teams;
    const matches = Math.floor(playingTeams / 2);
    matchCounts.push(matches);

    const roundIndex = matchCounts.length - 1;
    // Round 1 embeds the bye walkover in matchCounts[0]; later rounds add a separate bye match.
    teams = roundIndex === 0 && roundBye ? matches + 1 : matches + (roundBye ? 1 : 0);
  }

  return { matchCounts, incomingBye };
}

function byeMatchIndex(roundIndex: number, matchCounts: number[], incomingBye: boolean[]): number | null {
  if (!incomingBye[roundIndex]) return null;
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

export function cloneTournamentState(state: TournamentState): TournamentState {
  return {
    ...state,
    participants: state.participants.map((participant) => ({ ...participant })),
    players: (state.players ?? []).map((player) => ({ ...player })),
    controllerAssignments: { ...(state.controllerAssignments ?? {}) },
    rounds: cloneRounds(state.rounds),
  };
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

function placeWinner(rounds: BracketRound[], match: BracketMatch, winnerSlot: BracketSlot): void {
  if (!match.advanceTo || !winnerSlot.participantId) return;

  const { roundIndex, matchIndex, slot } = match.advanceTo;
  const targetMatch = rounds[roundIndex]?.matches[matchIndex];
  if (!targetMatch) return;

  targetMatch[slot] = {
    participantId: winnerSlot.participantId,
    name: winnerSlot.name,
    imageUri: winnerSlot.imageUri,
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

function finalizeState(rounds: BracketRound[]): Omit<TournamentState, 'participants' | 'players' | 'controllerAssignments'> {
  refreshAllMatchStatuses(rounds);
  const activeMatchId = applyActiveMatch(rounds, findActiveMatchId(rounds));
  return {
    rounds,
    activeMatchId,
    championId: findChampionId(rounds),
  };
}

export function createParticipants(inputs: ParticipantInput[]): Participant[] {
  return inputs.map((input, index) => ({
    id: `p-${index}`,
    name: input.name.trim() || `Player ${index + 1}`,
    imageUri: input.imageUri ?? null,
    isBye: false,
  }));
}

export function createTournament(participantInputs: ParticipantInput[]): TournamentState {
  const participants = createParticipants(participantInputs);
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
      const byeMatchIndex = firstRound.matches.length - 1;
      for (let matchIndex = 0; matchIndex < byeMatchIndex; matchIndex += 1) {
        const match = firstRound.matches[matchIndex];
        match.slotA = slotFromParticipant(participants[matchIndex * 2]);
        match.slotB = slotFromParticipant(participants[matchIndex * 2 + 1]);
      }
      const byeMatch = firstRound.matches[byeMatchIndex];
      if (byeMatch) {
        byeMatch.slotA = slotFromParticipant(participants[participants.length - 1]);
        byeMatch.slotB = byeSlot();
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
  return {
    ...state,
    participants,
    players: [],
    controllerAssignments: {},
  };
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
  placeWinner(rounds, targetMatch, winnerSlot);

  const nextState = finalizeState(rounds);
  return {
    ...nextState,
    participants: state.participants,
    players: state.players,
    controllerAssignments: state.controllerAssignments,
  };
}

export function getRound1ParticipantIds(rounds: BracketRound[]): string[] {
  const firstRound = rounds[0];
  if (!firstRound) return [];

  const ids: string[] = [];
  for (const match of firstRound.matches) {
    if (match.slotA.participantId && !match.slotA.isBye) {
      ids.push(match.slotA.participantId);
    }
    if (match.slotB.participantId && !match.slotB.isBye) {
      ids.push(match.slotB.participantId);
    }
  }
  return ids;
}

export function createTournamentPlayers(names: string[]): TournamentPlayer[] {
  return names
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .map((name, index) => ({ id: `ctrl-${index}`, name }));
}

function normalizeControllerName(name: string): string {
  return name.trim().toLowerCase();
}

export function controllerConflictsWithParticipant(
  playerName: string,
  participantName: string,
): boolean {
  return normalizeControllerName(playerName) === normalizeControllerName(participantName);
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = items[index];
    items[index] = items[swapIndex];
    items[swapIndex] = current;
  }
  return items;
}

function buildBalancedPlayerPool(participantCount: number, players: TournamentPlayer[]): string[] {
  const base = Math.floor(participantCount / players.length);
  const extras = participantCount % players.length;
  const pool: string[] = [];

  players.forEach((player, index) => {
    const slots = base + (index < extras ? 1 : 0);
    for (let slot = 0; slot < slots; slot += 1) {
      pool.push(player.id);
    }
  });

  return pool;
}

function poolCounts(pool: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  pool.forEach((playerId) => {
    counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
  });
  return counts;
}

function takeFromPool(pool: Map<string, number>, playerId: string): Map<string, number> | null {
  const remaining = (pool.get(playerId) ?? 0) - 1;
  if (remaining < 0) return null;

  const next = new Map(pool);
  if (remaining === 0) {
    next.delete(playerId);
  } else {
    next.set(playerId, remaining);
  }
  return next;
}

function poolIsEmpty(pool: Map<string, number>): boolean {
  return [...pool.values()].every((count) => count <= 0);
}

type AssignmentParticipant = { id: string; name: string };

type AssignmentMatch = {
  participants: AssignmentParticipant[];
};

function getRound1AssignmentMatches(rounds: BracketRound[]): AssignmentMatch[] {
  const firstRound = rounds[0];
  if (!firstRound) return [];

  return firstRound.matches
    .map((match) => {
      const participants: AssignmentParticipant[] = [];
      if (match.slotA.participantId && !match.slotA.isBye) {
        participants.push({ id: match.slotA.participantId, name: match.slotA.name });
      }
      if (match.slotB.participantId && !match.slotB.isBye) {
        participants.push({ id: match.slotB.participantId, name: match.slotB.name });
      }
      return { participants };
    })
    .filter((match) => match.participants.length > 0);
}

function canAssignPlayerToParticipant(
  player: TournamentPlayer,
  participant: AssignmentParticipant,
): boolean {
  return !controllerConflictsWithParticipant(player.name, participant.name);
}

function solveMatchAssignments(
  matches: AssignmentMatch[],
  matchIndex: number,
  remainingPool: Map<string, number>,
  playersById: Map<string, TournamentPlayer>,
  assignments: Record<string, string>,
): Record<string, string> | null {
  if (matchIndex >= matches.length) {
    return poolIsEmpty(remainingPool) ? assignments : null;
  }

  const match = matches[matchIndex];

  if (match.participants.length === 1) {
    const participant = match.participants[0];
    const candidates = shuffleInPlace(
      [...remainingPool.entries()].flatMap(([playerId, count]) =>
        Array.from({ length: count }, () => playerId),
      ),
    );

    for (const playerId of candidates) {
      const player = playersById.get(playerId);
      if (!player || !canAssignPlayerToParticipant(player, participant)) continue;

      const nextPool = takeFromPool(remainingPool, playerId);
      if (!nextPool) continue;

      const result = solveMatchAssignments(
        matches,
        matchIndex + 1,
        nextPool,
        playersById,
        { ...assignments, [participant.id]: playerId },
      );
      if (result) return result;
    }

    return null;
  }

  const [participantA, participantB] = match.participants;
  const uniquePlayerIds = shuffleInPlace([...remainingPool.keys()]);

  for (const playerAId of uniquePlayerIds) {
    const playerA = playersById.get(playerAId);
    if (!playerA || !canAssignPlayerToParticipant(playerA, participantA)) continue;

    const poolAfterA = takeFromPool(remainingPool, playerAId);
    if (!poolAfterA) continue;

    for (const playerBId of uniquePlayerIds) {
      if (playerBId === playerAId) continue;

      const playerB = playersById.get(playerBId);
      if (!playerB || !canAssignPlayerToParticipant(playerB, participantB)) continue;

      const poolAfterB = takeFromPool(poolAfterA, playerBId);
      if (!poolAfterB) continue;

      const result = solveMatchAssignments(
        matches,
        matchIndex + 1,
        poolAfterB,
        playersById,
        {
          ...assignments,
          [participantA.id]: playerAId,
          [participantB.id]: playerBId,
        },
      );
      if (result) return result;
    }
  }

  return null;
}

/** Even split across players, randomly placed with no same-name or same-match duplicates. */
export function distributeControllersRandomly(
  rounds: BracketRound[],
  players: TournamentPlayer[],
): Record<string, string> | null {
  const matches = getRound1AssignmentMatches(rounds);
  const participantIds = matches.flatMap((match) => match.participants.map((participant) => participant.id));
  if (players.length === 0 || participantIds.length === 0) return {};

  const pool = buildBalancedPlayerPool(participantIds.length, players);
  const playersById = new Map(players.map((player) => [player.id, player]));
  const shuffledMatches = shuffleInPlace([...matches]);

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const result = solveMatchAssignments(
      shuffledMatches,
      0,
      poolCounts(pool),
      playersById,
      {},
    );
    if (result) return result;
    shuffleInPlace(shuffledMatches);
  }

  return solveMatchAssignments(shuffledMatches, 0, poolCounts(pool), playersById, {});
}

export function findMatchOpponentParticipantId(
  rounds: BracketRound[],
  participantId: string,
): string | null {
  for (const round of rounds) {
    for (const match of round.matches) {
      const inSlotA = match.slotA.participantId === participantId;
      const inSlotB = match.slotB.participantId === participantId;
      if (inSlotA && match.slotB.participantId && !match.slotB.isBye) {
        return match.slotB.participantId;
      }
      if (inSlotB && match.slotA.participantId && !match.slotA.isBye) {
        return match.slotA.participantId;
      }
    }
  }
  return null;
}

export function getEligibleControllersForParticipant(
  state: TournamentState,
  participantId: string,
): TournamentPlayer[] {
  const participant = state.participants.find((item) => item.id === participantId);
  if (!participant) return [];

  const opponentId = findMatchOpponentParticipantId(state.rounds, participantId);
  const opponentPlayerId = opponentId ? state.controllerAssignments[opponentId] : null;

  return state.players.filter((player) => {
    if (controllerConflictsWithParticipant(player.name, participant.name)) return false;
    if (opponentPlayerId && player.id === opponentPlayerId) return false;
    return true;
  });
}

export type AssignControllersResult = {
  state: TournamentState;
  success: boolean;
};

export function assignControllers(
  state: TournamentState,
  playerNames: string[],
): AssignControllersResult {
  const players = createTournamentPlayers(playerNames);
  if (players.length === 0) {
    return { state, success: false };
  }

  const controllerAssignments = distributeControllersRandomly(state.rounds, players);
  if (!controllerAssignments) {
    return { state, success: false };
  }

  return {
    state: {
      ...cloneTournamentState(state),
      players,
      controllerAssignments,
    },
    success: true,
  };
}

export function reassignParticipantController(
  state: TournamentState,
  participantId: string,
  playerId: string,
): TournamentState {
  const participant = state.participants.find((item) => item.id === participantId);
  const player = state.players.find((item) => item.id === playerId);
  if (!participant || !player) return state;
  if (controllerConflictsWithParticipant(player.name, participant.name)) return state;

  const opponentId = findMatchOpponentParticipantId(state.rounds, participantId);
  if (opponentId && state.controllerAssignments[opponentId] === playerId) {
    return state;
  }

  const next = cloneTournamentState(state);
  next.controllerAssignments = { ...next.controllerAssignments, [participantId]: playerId };
  return next;
}

export function getControllerName(
  participantId: string | null | undefined,
  players: TournamentPlayer[] | undefined,
  assignments: Record<string, string> | undefined,
): string | null {
  if (!participantId || !players?.length || !assignments) return null;
  const playerId = assignments[participantId];
  if (!playerId) return null;
  return players.find((player) => player.id === playerId)?.name ?? null;
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
export type BracketVisualBounds = {
  top: number;
  height: number;
  width: number;
  treeHeight: number;
};

/** Tight bounds around placed matches — excludes empty vertical padding used for tree alignment. */
export function getBracketVisualBounds(
  rounds: BracketRound[],
  unitHeight: number,
  matchNodeHeight: number,
  roundLabelHeight: number,
  matchWidth: number,
  roundGap: number,
  matchNodeOverflow = 0,
): BracketVisualBounds {
  if (rounds.length === 0) {
    return { top: 0, height: unitHeight, width: 0, treeHeight: unitHeight + roundLabelHeight };
  }

  const firstRoundMatchCount = rounds[0].matches.length;
  const verticalOffset = getBracketVerticalOffset(rounds, unitHeight, matchNodeHeight);
  const canvasHeight = getCanvasHeight(rounds, unitHeight);
  const treeHeight = canvasHeight + roundLabelHeight;
  const width = rounds.length * (matchWidth + roundGap) - roundGap;

  let maxMatchBottom = 0;

  for (const round of rounds) {
    for (let matchIndex = 0; matchIndex < round.matches.length; matchIndex += 1) {
      const top =
        getMatchTop(
          round.index,
          matchIndex,
          unitHeight,
          firstRoundMatchCount,
          round.matches.length,
          matchNodeHeight,
        ) + verticalOffset;
      maxMatchBottom = Math.max(maxMatchBottom, top + matchNodeHeight + matchNodeOverflow);
    }
  }

  const top = 0;
  const bottom = roundLabelHeight + maxMatchBottom;

  return {
    top,
    height: bottom - top,
    width,
    treeHeight,
  };
}

