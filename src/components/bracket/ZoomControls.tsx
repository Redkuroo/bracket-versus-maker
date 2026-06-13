import { Pressable, StyleSheet, View } from 'react-native';

import { HudText } from '@/components/bracket/HudText';
import { Netrunner, neonGlow } from '@/constants/netrunner-theme';

export const BracketZoom = {
  min: 0.5,
  max: 2.5,
  step: 0.25,
  default: 1,
} as const;

type ZoomControlsProps = {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export function ZoomControls({ scale, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  const atMin = scale <= BracketZoom.min;
  const atMax = scale >= BracketZoom.max;
  const isDefault = scale === BracketZoom.default;

  return (
    <View style={styles.container}>
      <HudText variant="label" color={Netrunner.primary}>
        ZOOM
      </HudText>
      <View style={styles.controls}>
        <ZoomButton label="−" disabled={atMin} onPress={onZoomOut} accessibilityLabel="Zoom out" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset zoom"
          disabled={isDefault}
          onPress={onReset}
          style={({ pressed }) => [
            styles.readout,
            !isDefault && styles.readoutActive,
            pressed && !isDefault && styles.pressed,
          ]}>
          <HudText variant="mono" color={Netrunner.secondary}>
            {Math.round(scale * 100)}%
          </HudText>
        </Pressable>
        <ZoomButton label="+" disabled={atMax} onPress={onZoomIn} accessibilityLabel="Zoom in" />
      </View>
    </View>
  );
}

function ZoomButton({
  label,
  disabled,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <HudText variant="title" color={disabled ? Netrunner.textMuted : Netrunner.primary}>
        {label}
      </HudText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderColor: Netrunner.border,
    borderRadius: 0,
    backgroundColor: Netrunner.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...neonGlow(Netrunner.primary, 3),
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: Netrunner.primary,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#061018',
  },
  buttonDisabled: {
    borderColor: Netrunner.border,
    opacity: 0.45,
  },
  readout: {
    minWidth: 72,
    height: 44,
    borderWidth: 1,
    borderColor: Netrunner.border,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#061018',
  },
  readoutActive: {
    borderColor: Netrunner.secondary,
    ...neonGlow(Netrunner.secondary, 4),
  },
  pressed: {
    opacity: 0.8,
  },
});
