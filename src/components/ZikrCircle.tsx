import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { theme } from '../constants/theme';
import { lapsDone, ringProgress } from '../logic/counter';

const R = 47;
const CIRCUMFERENCE = 2 * Math.PI * R;

interface Props {
  phrase: string;
  count: number;
  onTap: () => void;
}

/** One zikr circle: SVG progress ring with count + phrase inside, lap note below. */
export default function ZikrCircle({ phrase, count, onTap }: Props) {
  const progress = ringProgress(count);
  const offset = count === 0 ? CIRCUMFERENCE : CIRCUMFERENCE * (1 - progress);
  const laps = lapsDone(count);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTap();
  }, [onTap]);

  return (
    <View style={styles.cell}>
      <View style={styles.circleWrap}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" style={styles.svg}>
          <Circle cx="50" cy="50" r={R} fill="none" stroke={theme.ringTrack} strokeWidth={7} />
          <Circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={theme.brassLight}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </Svg>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [styles.tapCircle, pressed && styles.tapCirclePressed]}
          accessibilityRole="button"
          accessibilityLabel={phrase}
        >
          <Text style={styles.count}>{count.toLocaleString('ar-EG')}</Text>
          <Text style={styles.label}>{phrase}</Text>
        </Pressable>
      </View>
      <Text style={styles.lapNote}>{laps > 0 ? `× ${laps.toLocaleString('ar-EG')} دورة` : ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
  },
  circleWrap: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 220,
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  tapCircle: {
    position: 'absolute',
    top: '8%',
    right: '8%',
    bottom: '8%',
    left: '8%',
    borderRadius: 999,
    backgroundColor: theme.ink2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  tapCirclePressed: {
    transform: [{ scale: 0.94 }],
    backgroundColor: theme.ink2Pressed,
  },
  count: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 36,
    color: theme.text,
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.brassLight,
    textAlign: 'center',
    lineHeight: 17,
  },
  lapNote: {
    fontSize: 11,
    color: theme.sage,
    marginTop: 6,
    minHeight: 14,
  },
});
