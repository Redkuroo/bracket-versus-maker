import { DarkTheme, ThemeProvider, Stack } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Netrunner } from '@/constants/netrunner-theme';

const NetrunnerTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Netrunner.background,
    card: Netrunner.surface,
    text: Netrunner.text,
    border: Netrunner.border,
    primary: Netrunner.primary,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={NetrunnerTheme}>
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Netrunner.background },
        }}
      />
    </ThemeProvider>
  );
}
