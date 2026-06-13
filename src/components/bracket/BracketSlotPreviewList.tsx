import { StyleSheet, View } from 'react-native';

import { PlayerCard } from '@/components/bracket/PlayerCard';
import { HudText } from '@/components/bracket/HudText';
import { Netrunner } from '@/constants/netrunner-theme';
import type { BracketSlotPreview } from '@/lib/bracket-engine';

type BracketSlotPreviewListProps = {
  slots: BracketSlotPreview[];
};

export function BracketSlotPreviewList({ slots }: BracketSlotPreviewListProps) {
  return (
    <View style={styles.container}>
      <HudText variant="label" color={Netrunner.primary}>
        BRACKET SLOT PREVIEW
      </HudText>
      <HudText variant="caption" color={Netrunner.textMuted}>
        Round 1 layout after launch — empty slots use muted labels.
      </HudText>
      <View style={styles.grid}>
        {slots.map((slot) => (
          <View key={`slot-preview-${slot.slotNumber}`} style={styles.item}>
            <HudText variant="caption" color={Netrunner.textMuted}>
              SLOT {String(slot.slotNumber).padStart(2, '0')}
            </HudText>
            <PlayerCard
              name={slot.label}
              variant={slot.kind}
              isActive={false}
              isBye={slot.kind === 'bye'}
              isLoser={false}
              isWinner={false}
              disabled
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  grid: {
    gap: 10,
  },
  item: {
    gap: 6,
  },
});
