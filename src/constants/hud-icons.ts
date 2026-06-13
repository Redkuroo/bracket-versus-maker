export type HudIconName = {
  ios: string;
  android: string;
  web: string;
};

export const HudIcons = {
  shuffle: { ios: 'arrow.up.arrow.down', android: 'swap_vert', web: 'swap_vert' },
  payouts: { ios: 'dollarsign.circle', android: 'payments', web: 'payments' },
  addPlayers: { ios: 'person.badge.plus', android: 'person_add', web: 'person_add' },
  editPlayers: { ios: 'person.2.fill', android: 'group', web: 'group' },
  save: { ios: 'square.and.arrow.down', android: 'save', web: 'save' },
  undo: { ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' },
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  rename: { ios: 'pencil', android: 'edit', web: 'edit' },
} as const satisfies Record<string, HudIconName>;
