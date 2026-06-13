import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { HudText } from '@/components/bracket/HudText';
import { Netrunner } from '@/constants/netrunner-theme';
import { resolveRosterImageSource } from '@/data/roster-images';
import type { BracketSlotKind } from '@/types/bracket';

const ACCENTS = [Netrunner.primary, Netrunner.secondary, '#7C3AED', '#F59E0B', '#F43F5E'] as const;

export function getParticipantInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function accentForId(participantId: string | null | undefined): string {
  if (!participantId) return Netrunner.border;
  let hash = 0;
  for (let index = 0; index < participantId.length; index += 1) {
    hash = (hash + participantId.charCodeAt(index)) % ACCENTS.length;
  }
  return ACCENTS[hash] ?? Netrunner.primary;
}

type PlayerAvatarProps = {
  name: string;
  participantId?: string | null;
  imageUri?: string | null;
  variant?: BracketSlotKind;
  size?: number;
};

export const PlayerAvatar = memo(function PlayerAvatar({
  name,
  participantId,
  imageUri,
  variant = 'player',
  size = 36,
}: PlayerAvatarProps) {
  const frameSize = { width: size, height: size };

  if (variant !== 'player') {
    return (
      <View style={[styles.frame, styles.mutedFrame, frameSize]}>
        <HudText variant="caption" color={Netrunner.textMuted} style={styles.placeholderGlyph}>
          {variant === 'bye' ? '—' : '·'}
        </HudText>
      </View>
    );
  }

  const accent = accentForId(participantId);
  const imageSource = resolveRosterImageSource(imageUri ?? null);

  if (imageSource) {
    return (
      <View style={[styles.frame, frameSize, { borderColor: accent }]}>
        <Image
          source={imageSource}
          style={styles.image}
          contentFit="contain"
          contentPosition="top"
          recyclingKey={imageUri ?? undefined}
          cachePolicy="memory-disk"
          transition={null}
        />
      </View>
    );
  }

  return (
    <View style={[styles.frame, styles.placeholderFrame, frameSize, { borderColor: accent }]}>
      <HudText variant="caption" color={accent} style={[styles.initials, { fontSize: Math.max(10, size * 0.28) }]}>
        {getParticipantInitials(name)}
      </HudText>
      <HudText variant="caption" color={Netrunner.textMuted} style={styles.imgLabel}>
        IMG
      </HudText>
      <View style={[styles.corner, styles.cornerTopLeft, { borderColor: accent }]} />
      <View style={[styles.corner, styles.cornerBottomRight, { borderColor: accent }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderRadius: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#061018',
  },
  mutedFrame: {
    borderColor: Netrunner.border,
    borderStyle: 'dashed',
    backgroundColor: '#040E16',
  },
  placeholderFrame: {
    backgroundColor: '#061018',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    letterSpacing: 1,
    fontWeight: '700',
  },
  imgLabel: {
    position: 'absolute',
    bottom: 2,
    right: 3,
    fontSize: 7,
    letterSpacing: 1,
    opacity: 0.7,
  },
  placeholderGlyph: {
    fontSize: 16,
    opacity: 0.6,
  },
  corner: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderColor: Netrunner.primary,
  },
  cornerTopLeft: {
    top: 2,
    left: 2,
    borderTopWidth: 1,
    borderLeftWidth: 1,
  },
  cornerBottomRight: {
    right: 2,
    bottom: 2,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
});
