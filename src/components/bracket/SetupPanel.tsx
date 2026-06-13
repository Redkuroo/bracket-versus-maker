import { ScrollView, StyleSheet, View } from 'react-native';

import { HudButton } from '@/components/bracket/HudButton';
import { HudText } from '@/components/bracket/HudText';
import { HudTextInput } from '@/components/bracket/HudTextInput';
import { Netrunner } from '@/constants/netrunner-theme';

type SetupPanelProps = {
  participantCount: number;
  participantNames: string[];
  onChangeCount: (count: number) => void;
  onChangeName: (index: number, name: string) => void;
  onStart: () => void;
};

const COUNT_OPTIONS = [2, 4, 8, 16] as const;

export function SetupPanel({
  participantCount,
  participantNames,
  onChangeCount,
  onChangeName,
  onStart,
}: SetupPanelProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <HudText variant="label" color={Netrunner.primary} glow>
          BRACKET VERSUS
        </HudText>
        <HudText variant="title">Initialize Tournament</HudText>
        <HudText variant="caption">
          Configure participants, seed the bracket, and enter the neon arena.
        </HudText>
      </View>

      <View style={styles.section}>
        <HudText variant="label" color={Netrunner.primary}>
          Participants
        </HudText>
        <View style={styles.countRow}>
          {COUNT_OPTIONS.map((count) => {
            const selected = participantCount === count;
            return (
              <HudButton
                key={count}
                label={String(count)}
                variant={selected ? 'secondary' : 'ghost'}
                onPress={() => onChangeCount(count)}
                style={[styles.countButton, selected && styles.countButtonSelected]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <HudText variant="label" color={Netrunner.primary}>
          Player / Team Names
        </HudText>
        <View style={styles.nameGrid}>
          {Array.from({ length: participantCount }, (_, index) => (
            <HudTextInput
              key={`participant-${index}`}
              label={`Slot ${String(index + 1).padStart(2, '0')}`}
              value={participantNames[index] ?? ''}
              onChangeText={(text) => onChangeName(index, text)}
              placeholder={`Player ${index + 1}`}
              autoCapitalize="words"
              returnKeyType={index === participantCount - 1 ? 'done' : 'next'}
            />
          ))}
        </View>
      </View>

      <HudButton label="Launch Bracket" variant="secondary" onPress={onStart} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 24,
    paddingBottom: 40,
  },
  header: {
    gap: 10,
  },
  section: {
    gap: 14,
  },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  countButton: {
    minWidth: 64,
    paddingHorizontal: 12,
  },
  countButtonSelected: {
    borderColor: Netrunner.secondary,
  },
  nameGrid: {
    gap: 14,
  },
});
