import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { HudText } from '@/components/bracket/HudText';
import { Netrunner, NetrunnerFonts } from '@/constants/netrunner-theme';

type HudTextInputProps = TextInputProps & {
  label: string;
};

export function HudTextInput({ label, style, ...rest }: HudTextInputProps) {
  return (
    <View style={styles.wrapper}>
      <HudText variant="label" color={Netrunner.primary} style={styles.label}>
        {label}
      </HudText>
      <TextInput
        placeholderTextColor={Netrunner.textMuted}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: Netrunner.border,
    borderRadius: 0,
    backgroundColor: Netrunner.surface,
    color: Netrunner.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: NetrunnerFonts.mono,
    minHeight: 48,
  },
});
