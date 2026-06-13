import { DarkTheme, ThemeProvider } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
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

export default function TabLayout() {
  return (
    <ThemeProvider value={NetrunnerTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
