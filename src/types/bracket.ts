export type MatchStatus = 'pending' | 'ready' | 'active' | 'complete';

export type BracketSlot = {
  participantId: string | null;
  name: string;
  imageUri: string | null;
  isBye: boolean;
};

export type BracketMatch = {
  id: string;
  roundIndex: number;
  matchIndex: number;
  slotA: BracketSlot;
  slotB: BracketSlot;
  winnerId: string | null;
  status: MatchStatus;
  advanceTo?: {
    roundIndex: number;
    matchIndex: number;
    slot: 'slotA' | 'slotB';
  };
};

export type BracketRound = {
  index: number;
  label: string;
  matches: BracketMatch[];
};

export type Participant = {
  id: string;
  name: string;
  imageUri: string | null;
  isBye: boolean;
};

/** A human player who controls one or more tournament participants. */
export type TournamentPlayer = {
  id: string;
  name: string;
  /** Accumulated match-win earnings in pesos. */
  pocketMoney: number;
};

export type TournamentState = {
  rounds: BracketRound[];
  participants: Participant[];
  activeMatchId: string | null;
  championId: string | null;
  /** Human players added via the Add Players flow. */
  players: TournamentPlayer[];
  /** Maps participant id → controlling player id (Round 1 assignments persist by participant). */
  controllerAssignments: Record<string, string>;
  /** Peso reward per bracket round index when a match is won. */
  roundPayouts: Record<number, number>;
};

export type TournamentPhase = 'setup' | 'bracket';

export const MIN_PARTICIPANTS = 2;
export const MAX_PARTICIPANTS = 128;

export const BracketSlotLabels = {
  bye: '[ BYE ]',
  empty: '[ EMPTY / ADVANCED ]',
} as const;

export type BracketSlotKind = 'player' | 'bye' | 'empty';
