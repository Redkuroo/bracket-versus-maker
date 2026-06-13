import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { HudButton } from '@/components/bracket/HudButton';
import { HudText } from '@/components/bracket/HudText';
import { HudTextInput } from '@/components/bracket/HudTextInput';
import { Netrunner } from '@/constants/netrunner-theme';
import { MAX_PARTICIPANTS, MIN_PARTICIPANTS } from '@/types/bracket';

type SetupPanelProps = {
  participantCount: number;
  participantNames: string[];
  onChangeCount: (count: number) => void;
  onChangeName: (index: number, name: string) => void;
  onStart: () => void;
};

const QUICK_COUNTS = [2, 4, 8, 16, 32, 64] as const;

export function SetupPanel({
  participantCount,
  participantNames,
  onChangeCount,
  onChangeName,
  onStart,
}: SetupPanelProps) {
  const [countDraft, setCountDraft] = useState(String(participantCount));

  useEffect(() => {
    setCountDraft(String(participantCount));
  }, [participantCount]);

  const applyCount = (raw: string) => {
    setCountDraft(raw.replace(/\D/g, '').slice(0, 2));
  };

  const commitCount = () => {
    const parsed = Number.parseInt(countDraft, 10);
    const clamped = Number.isNaN(parsed)
      ? MIN_PARTICIPANTS
      : Math.min(MAX_PARTICIPANTS, Math.max(MIN_PARTICIPANTS, parsed));
    setCountDraft(String(clamped));
    onChangeCount(clamped);
  };

  const selectQuickCount = (count: number) => {
    setCountDraft(String(count));
    onChangeCount(count);
  };

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
        <HudTextInput
          label={`Total count (${MIN_PARTICIPANTS}–${MAX_PARTICIPANTS})`}
          value={countDraft}
          onChangeText={applyCount}
          onBlur={commitCount}
          keyboardType="number-pad"
          maxLength={2}
          returnKeyType="done"
          onSubmitEditing={commitCount}
        />
        <View style={styles.countRow}>
          {QUICK_COUNTS.map((count) => {
            const selected = participantCount === count;
            return (
              <HudButton
                key={count}
                label={String(count)}
                variant={selected ? 'secondary' : 'ghost'}
                onPress={() => selectQuickCount(count)}
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
        <HudText variant="caption">
          {participantCount} slot{participantCount === 1 ? '' : 's'} · Bracket size{' '}
          {nextBracketSize(participantCount)}
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

function nextBracketSize(count: number): number {
  let size = 1;
  while (size < count) size *= 2;
  return size;
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
