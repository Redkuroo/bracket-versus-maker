import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type View as ViewType,
} from 'react-native';

import { HudButton } from '@/components/bracket/HudButton';
import { HudText } from '@/components/bracket/HudText';
import { HudTextInput } from '@/components/bracket/HudTextInput';
import { Netrunner } from '@/constants/netrunner-theme';
import { useKeyboardAwareScroll } from '@/hooks/use-keyboard-aware-scroll';
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
  const [keyboardPadding, setKeyboardPadding] = useState(0);
  const countInputRef = useRef<ViewType>(null);
  const nameInputRefs = useRef<(ViewType | null)[]>([]);
  const { scrollRef, contentRef, handleScroll, scrollInputIntoView } = useKeyboardAwareScroll();

  useEffect(() => {
    setCountDraft(String(participantCount));
  }, [participantCount]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardPadding(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardPadding(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const focusInput = (ref: ViewType | null) => {
    scrollInputIntoView(ref);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + keyboardPadding }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        onScroll={(event) => handleScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}>
        <View ref={contentRef} style={styles.contentInner}>
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
              ref={countInputRef}
              label={`Total count (${MIN_PARTICIPANTS}–${MAX_PARTICIPANTS})`}
              value={countDraft}
              onChangeText={applyCount}
              onBlur={commitCount}
              onFocus={() => focusInput(countInputRef.current)}
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
                  ref={(node) => {
                    nameInputRefs.current[index] = node;
                  }}
                  label={`Slot ${String(index + 1).padStart(2, '0')}`}
                  value={participantNames[index] ?? ''}
                  onChangeText={(text) => onChangeName(index, text)}
                  onFocus={() => focusInput(nameInputRefs.current[index])}
                  placeholder={`Player ${index + 1}`}
                  autoCapitalize="words"
                  returnKeyType={index === participantCount - 1 ? 'done' : 'next'}
                />
              ))}
            </View>
          </View>

          <HudButton label="Launch Bracket" variant="secondary" onPress={onStart} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function nextBracketSize(count: number): number {
  let size = 1;
  while (size < count) size *= 2;
  return size;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  contentInner: {
    gap: 24,
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
