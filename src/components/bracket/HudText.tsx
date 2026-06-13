import { StyleSheet, Text, type TextProps } from 'react-native';

import { Netrunner, NetrunnerFonts } from '@/constants/netrunner-theme';

type HudTextProps = TextProps & {
  variant?: 'label' | 'body' | 'title' | 'mono' | 'caption';
  color?: string;
  glow?: boolean;
};

export function HudText({
  variant = 'body',
  color = Netrunner.text,
  glow = false,
  style,
  ...rest
}: HudTextProps) {
  return (
    <Text
      style={[
        styles.base,
        variant === 'label' && styles.label,
        variant === 'body' && styles.body,
        variant === 'title' && styles.title,
        variant === 'mono' && styles.mono,
        variant === 'caption' && styles.caption,
        { color },
        glow && styles.glow,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: Netrunner.text,
  },
  label: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: NetrunnerFonts.mono,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: NetrunnerFonts.display,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: NetrunnerFonts.display,
  },
  mono: {
    fontSize: 13,
    fontFamily: NetrunnerFonts.mono,
  },
  caption: {
    fontSize: 12,
    color: Netrunner.textMuted,
    fontFamily: NetrunnerFonts.mono,
  },
  glow: {
    textShadowColor: Netrunner.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
