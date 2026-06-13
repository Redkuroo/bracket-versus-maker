import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { HudText } from '@/components/bracket/HudText';
import { Netrunner, neonGlow } from '@/constants/netrunner-theme';

type HudButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function HudButton({ label, variant = 'primary', disabled, style, ...rest }: HudButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => {
        const resolved = typeof style === 'function' ? style(state) : style;
        return [
          styles.base,
          variant === 'primary' && styles.primary,
          variant === 'secondary' && styles.secondary,
          variant === 'ghost' && styles.ghost,
          disabled && styles.disabled,
          state.pressed && !disabled && styles.pressed,
          resolved,
        ];
      }}
      {...rest}>
      <HudText
        variant="label"
        color={
          variant === 'ghost'
            ? Netrunner.text
            : variant === 'secondary'
              ? Netrunner.background
              : Netrunner.background
        }
        style={styles.label}>
        {label}
      </HudText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: Netrunner.primary,
    borderColor: Netrunner.primary,
    ...neonGlow(Netrunner.primary, 6),
  },
  secondary: {
    backgroundColor: Netrunner.secondary,
    borderColor: Netrunner.secondary,
    ...neonGlow(Netrunner.secondary, 6),
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: Netrunner.border,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    letterSpacing: 1.5,
  },
});
