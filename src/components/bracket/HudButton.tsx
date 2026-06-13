import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { HudText } from '@/components/bracket/HudText';
import { Netrunner, neonGlow } from '@/constants/netrunner-theme';
import type { HudIconName } from '@/constants/hud-icons';

type HudButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: HudIconName;
};

function getLabelColor(variant: NonNullable<HudButtonProps['variant']>): string {
  if (variant === 'ghost') return Netrunner.text;
  return Netrunner.background;
}

export function HudButton({
  label,
  variant = 'primary',
  icon,
  disabled,
  style,
  ...rest
}: HudButtonProps) {
  const labelColor = getLabelColor(variant);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
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
      <View style={styles.content}>
        {icon ? (
          <SymbolView name={icon} size={14} weight="medium" tintColor={labelColor} />
        ) : null}
        <HudText variant="label" color={labelColor} style={styles.label}>
          {label}
        </HudText>
      </View>
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: {
    letterSpacing: 1.5,
  },
});
