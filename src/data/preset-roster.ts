import type { PresetRoster } from '@/types/roster';

/**
 * Hardcode tournament participants here.
 * - `players.length` sets how many bracket slots are created.
 * - `name` is shown on cards and in setup.
 * - `imageUri` is a remote URL string, or null to use the initials placeholder.
 */
export const PRESET_ROSTER: PresetRoster = {
  label: 'Preset roster',
  players: [
    { name: 'Player 1', imageUri: null },
    { name: 'Player 2', imageUri: null },
    { name: 'Player 3', imageUri: null },
    { name: 'Player 4', imageUri: null },
    { name: 'Player 5', imageUri: null },
    { name: 'Player 6', imageUri: null },
    { name: 'Player 7', imageUri: null },
    { name: 'Player 8', imageUri: null },
  ],
};
