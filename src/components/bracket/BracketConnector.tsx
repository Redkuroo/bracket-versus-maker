import { StyleSheet, View } from 'react-native';

import { BracketLayout, Netrunner } from '@/constants/netrunner-theme';

type BracketConnectorProps = {
  isComplete: boolean;
  isActivePath: boolean;
};

export function BracketConnector({ isComplete, isActivePath }: BracketConnectorProps) {
  const lineColor = isActivePath ? Netrunner.secondary : isComplete ? Netrunner.primary : Netrunner.border;

  return (
    <View
      style={[
        styles.connector,
        (isActivePath || isComplete) && {
          shadowColor: lineColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.85,
          shadowRadius: 6,
        },
      ]}>
      <View style={[styles.line, { backgroundColor: lineColor }]} />
      <View style={[styles.node, { borderColor: lineColor, backgroundColor: lineColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  connector: {
    position: 'absolute',
    right: -BracketLayout.roundGap + 8,
    top: '50%',
    width: BracketLayout.roundGap - 8,
    height: 12,
    justifyContent: 'center',
  },
  line: {
    height: 1,
    width: '100%',
  },
  node: {
    position: 'absolute',
    right: 0,
    width: 6,
    height: 6,
    borderWidth: 1,
    borderRadius: 0,
    top: 3,
  },
});
