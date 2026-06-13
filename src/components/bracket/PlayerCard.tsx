import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { HudText } from '@/components/bracket/HudText';
import { PlayerAvatar } from '@/components/bracket/PlayerAvatar';
import { activeBorder, Netrunner, neonGlow } from '@/constants/netrunner-theme';
import { BracketSlotLabels } from '@/types/bracket';
import type { BracketSlotKind } from '@/types/bracket';

type PlayerCardProps = {
  name: string;
  participantId?: string | null;
  imageUri?: string | null;
  variant?: BracketSlotKind;
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
  participantId,
  imageUri,
  variant = 'player',
  isWinner,
  isLoser,
  isActive,
  isBye,
  disabled,
  onPress,
}: PlayerCardProps) {
  const pulse = useSharedValue(1);
  const isPlaceholder = variant === 'bye' || variant === 'empty';
  const displayName =
    variant === 'bye' ? BracketSlotLabels.bye : variant === 'empty' ? BracketSlotLabels.empty : name;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const handlePress = () => {
    if (disabled || isBye || isPlaceholder || !onPress) return;
    pulse.value = withSequence(
      withTiming(1.04, { duration: 120 }),
      withTiming(1, { duration: 180 }),
    );
    onPress();
  };

  const cardStyle = [
    styles.card,
    isPlaceholder && styles.placeholder,
    variant === 'bye' && styles.byeCard,
    variant === 'empty' && styles.emptyCard,
    !isPlaceholder && activeBorder(isActive, isWinner),
    !isPlaceholder && isWinner && styles.winner,
    !isPlaceholder && isLoser && styles.loser,
  ];

  const content = (
    <View style={styles.content}>
      <PlayerAvatar
        name={name}
        participantId={participantId}
        imageUri={imageUri}
        variant={variant}
        size={34}
      />
      <View style={styles.copy}>
        <HudText
          variant="mono"
          numberOfLines={1}
          color={
            isPlaceholder
              ? Netrunner.textMuted
              : isWinner
                ? Netrunner.primary
                : isActive
                  ? Netrunner.secondary
                  : Netrunner.text
          }
          glow={isWinner}>
          {displayName}
        </HudText>
        {isWinner && !isPlaceholder && (
          <HudText variant="caption" color={Netrunner.primary}>
            WIN
          </HudText>
        )}
      </View>
    </View>
  );

  if (isPlaceholder || disabled) {
    return <View style={cardStyle}>{content}</View>;
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || isBye }}
      disabled={disabled || isBye}
      onPress={handlePress}
      style={[cardStyle, animatedStyle]}>
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 0,
    backgroundColor: Netrunner.surface,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  placeholder: {
    borderColor: Netrunner.border,
    backgroundColor: '#040E16',
  },
  byeCard: {
    borderStyle: 'dashed',
    opacity: 0.85,
  },
  emptyCard: {
    borderStyle: 'dotted',
    opacity: 0.7,
  },
  winner: {
    backgroundColor: '#0D2A22',
    ...neonGlow(Netrunner.primary, 8),
  },
  loser: {
    opacity: 0.45,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minWidth: 0,
  },
});
