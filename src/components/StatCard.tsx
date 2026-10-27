import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

interface Props {
  num: string;
  lbl: string;
}

/** Stat card showing a big number and a label. */
export default function StatCard({ num, lbl }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.num}>{num}</Text>
      <Text style={styles.lbl}>{lbl}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.ink2,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  num: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.brassLight,
  },
  lbl: {
    fontSize: 13,
    color: theme.sage,
    marginTop: 4,
    textAlign: 'center',
  },
});
