import { Platform } from 'react-native';

/** Sub-Zero Netrunner cyberpunk design tokens */
export const Netrunner = {
  background: '#020B14',
  primary: '#10F49C',
  secondary: '#00E5FF',
  surface: '#0B192C',
  border: '#1A365D',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  danger: '#F43F5E',
  winnerGlow: '#10F49C',
  activeGlow: '#00E5FF',
} as const;

export const NetrunnerFonts = Platform.select({
  ios: { mono: 'Menlo', display: 'Menlo' },
  android: { mono: 'monospace', display: 'monospace' },
  default: { mono: 'monospace', display: 'monospace' },
  web: { mono: 'ui-monospace, monospace', display: 'ui-monospace, monospace' },
})!;

export const BracketLayout = {
  matchWidth: 168,
  matchNodeHeight: 128,
  slotHeight: 42,
  slotGap: 6,
  roundGap: 56,
  unitHeight: 112,
  canvasPadding: 24,
  connectorArm: 22,
  roundLabelHeight: 28,
} as const;

export function neonGlow(color: string, radius = 8) {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.85,
      shadowRadius: radius,
    },
    android: { elevation: 6 },
    default: {},
  });
}

export function activeBorder(isActive: boolean, isWinner: boolean) {
  if (isActive) {
    return {
      borderColor: Netrunner.secondary,
      ...neonGlow(Netrunner.secondary, 10),
    };
  }
  if (isWinner) {
    return {
      borderColor: Netrunner.primary,
      ...neonGlow(Netrunner.primary, 6),
    };
  }
  return { borderColor: Netrunner.border };
}
