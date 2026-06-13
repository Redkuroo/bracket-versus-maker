export type MatchStatus = 'pending' | 'ready' | 'active' | 'complete';

export type BracketSlot = {
  participantId: string | null;
  name: string;
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
};

export type BracketRound = {
  index: number;
  label: string;
  matches: BracketMatch[];
};

export type Participant = {
  id: string;
  name: string;
  isBye: boolean;
};

export type TournamentState = {
  rounds: BracketRound[];
  participants: Participant[];
  activeMatchId: string | null;
  championId: string | null;
};

export type TournamentPhase = 'setup' | 'bracket';

export const MIN_PARTICIPANTS = 2;
export const MAX_PARTICIPANTS = 99;
