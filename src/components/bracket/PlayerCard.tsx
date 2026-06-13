import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { HudText } from '@/components/bracket/HudText';
import { activeBorder, Netrunner, neonGlow } from '@/constants/netrunner-theme';

type PlayerCardProps = {
  name: string;
  isWinner: boolean;
  isLoser: boolean;
  isActive: boolean;
  isBye: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PlayerCard({
  name,
  isWinner,
  isLoser,
  isActive,
  isBye,
  disabled,
  onPress,
}: PlayerCardProps) {
  const pulse = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const handlePress = () => {
    if (disabled || isBye || !onPress) return;
    pulse.value = withSequence(
      withTiming(1.04, { duration: 120 }),
      withTiming(1, { duration: 180 }),
    );
    onPress();
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || isBye }}
      disabled={disabled || isBye}
      onPress={handlePress}
      style={[
        styles.card,
        activeBorder(isActive, isWinner),
        isWinner && styles.winner,
        isLoser && styles.loser,
        isBye && styles.bye,
        animatedStyle,
      ]}>
      <View style={styles.content}>
        <HudText
          variant="mono"
          numberOfLines={1}
          color={isWinner ? Netrunner.primary : isActive ? Netrunner.secondary : Netrunner.text}
          glow={isWinner}>
          {name}
        </HudText>
        {isWinner && (
          <HudText variant="caption" color={Netrunner.primary}>
            WIN
          </HudText>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 0,
    backgroundColor: Netrunner.surface,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  winner: {
    backgroundColor: '#0D2A22',
    ...neonGlow(Netrunner.primary, 8),
  },
  loser: {
    opacity: 0.45,
  },
  bye: {
    opacity: 0.35,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
