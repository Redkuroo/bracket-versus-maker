import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Netrunner } from '@/constants/netrunner-theme';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={Netrunner.background}
      indicatorColor={Netrunner.surface}
      labelStyle={{ selected: { color: Netrunner.primary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Tournament</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
