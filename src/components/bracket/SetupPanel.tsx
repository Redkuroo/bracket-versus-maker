import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type ListRenderItemInfo,
  type View as ViewType,
} from 'react-native';

import { HudButton } from '@/components/bracket/HudButton';
import { HudText } from '@/components/bracket/HudText';
import { HudTextInput } from '@/components/bracket/HudTextInput';
import { PlayerAvatar } from '@/components/bracket/PlayerAvatar';
import { PRESET_ROSTER } from '@/data/preset-roster';
import { Netrunner } from '@/constants/netrunner-theme';
import { useKeyboardAwareScroll } from '@/hooks/use-keyboard-aware-scroll';
import { MAX_PARTICIPANTS, MIN_PARTICIPANTS } from '@/types/bracket';

type SetupPanelProps = {
  participantCount: number;
  participantNames: string[];
  participantImageUris: (string | null)[];
  onChangeCount: (count: number) => void;
  onChangeName: (index: number, name: string) => void;
  onLoadPreset: () => void;
  onShuffle: () => void;
  onStart: () => void;
};

const QUICK_COUNTS = [2, 4, 8, 16, 32, 64, 128] as const;
const PARTICIPANT_ROW_HEIGHT = 96;

type ParticipantRowProps = {
  index: number;
  displayName: string;
  imageUri: string | null;
  name: string;
  isLast: boolean;
  onChangeName: (index: number, name: string) => void;
  onFocusField: (index: number) => void;
  registerRef: (index: number, node: ViewType | null) => void;
};

const ParticipantRow = memo(function ParticipantRow({
  index,
  displayName,
  imageUri,
  name,
  isLast,
  onChangeName,
  onFocusField,
  registerRef,
}: ParticipantRowProps) {
  return (
    <View style={styles.participantRow}>
      <PlayerAvatar
        name={displayName}
        participantId={`p-${index}`}
        imageUri={imageUri}
        size={48}
      />
      <View style={styles.participantInput}>
        <HudTextInput
          ref={(node) => registerRef(index, node)}
          label={`Slot ${String(index + 1).padStart(2, '0')}`}
          value={name}
          onChangeText={(text) => onChangeName(index, text)}
          onFocus={() => onFocusField(index)}
          placeholder={`Player ${index + 1}`}
          autoCapitalize="words"
          returnKeyType={isLast ? 'done' : 'next'}
        />
      </View>
    </View>
  );
});

export function SetupPanel({
  participantCount,
  participantNames,
  participantImageUris,
  onChangeCount,
  onChangeName,
  onLoadPreset,
  onShuffle,
  onStart,
}: SetupPanelProps) {
  const [countDraft, setCountDraft] = useState(String(participantCount));
  const [keyboardPadding, setKeyboardPadding] = useState(0);
  const countInputRef = useRef<ViewType>(null);
  const nameInputRefs = useRef<(ViewType | null)[]>([]);
  const { scrollRef, contentRef, handleScroll, scrollInputIntoView } = useKeyboardAwareScroll();

  const participantIndices = useMemo(
    () => Array.from({ length: participantCount }, (_, index) => index),
    [participantCount],
  );

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
    setCountDraft(raw.replace(/\D/g, '').slice(0, 3));
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

  const focusInput = useCallback(
    (ref: ViewType | null) => {
      scrollInputIntoView(ref);
    },
    [scrollInputIntoView],
  );

  const registerNameInputRef = useCallback((index: number, node: ViewType | null) => {
    nameInputRefs.current[index] = node;
  }, []);

  const focusNameField = useCallback(
    (index: number) => {
      focusInput(nameInputRefs.current[index]);
    },
    [focusInput],
  );

  const renderParticipant = useCallback(
    ({ item: index }: ListRenderItemInfo<number>) => {
      const displayName = participantNames[index]?.trim() || `Player ${index + 1}`;

      return (
        <ParticipantRow
          index={index}
          displayName={displayName}
          imageUri={participantImageUris[index] ?? null}
          name={participantNames[index] ?? ''}
          isLast={index === participantCount - 1}
          onChangeName={onChangeName}
          onFocusField={focusNameField}
          registerRef={registerNameInputRef}
        />
      );
    },
    [
      participantCount,
      participantNames,
      participantImageUris,
      onChangeName,
      focusNameField,
      registerNameInputRef,
    ],
  );

  const listHeader = (
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
          maxLength={3}
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
          Preset roster
        </HudText>
        <HudButton
          label={`Load "${PRESET_ROSTER.label}"`}
          variant="ghost"
          onPress={onLoadPreset}
        />
      </View>

      <View style={styles.section}>
        <HudText variant="label" color={Netrunner.primary}>
          Player / Team Names
        </HudText>
        <HudText variant="caption" color={Netrunner.textMuted}>
          Leave blank for default names. Round 1 pairs players in order.
        </HudText>
      </View>
    </View>
  );

  const listFooter = (
    <View style={styles.actions}>
      <HudButton label="Launch Bracket" variant="secondary" onPress={onStart} />
      <HudButton label="Shuffle Roster" variant="ghost" onPress={onShuffle} />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
      <FlatList
        ref={scrollRef}
        data={participantIndices}
        keyExtractor={(index) => `participant-${index}`}
        renderItem={renderParticipant}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + keyboardPadding }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        onScroll={(event) => handleScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        initialNumToRender={12}
        maxToRenderPerBatch={16}
        windowSize={7}
        removeClippedSubviews
        getItemLayout={(_, index) => ({
          length: PARTICIPANT_ROW_HEIGHT,
          offset: PARTICIPANT_ROW_HEIGHT * index,
          index,
        })}
      />
    </KeyboardAvoidingView>
  );
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
  participantRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 14,
  },
  participantInput: {
    flex: 1,
  },
  actions: {
    gap: 10,
    marginTop: 10,
  },
});
