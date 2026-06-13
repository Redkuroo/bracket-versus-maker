/** One player entry for preset / setup rosters. Edit imageUri with a URL or null for initials. */
export type PresetPlayer = {
  name: string;
  imageUri: string | null;
};

/** Hardcode your roster in src/data/preset-roster.ts */
export type PresetRoster = {
  label: string;
  players: PresetPlayer[];
};

export type ParticipantInput = {
  name: string;
  imageUri?: string | null;
};
