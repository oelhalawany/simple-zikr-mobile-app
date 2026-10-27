import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

export interface HistoryEntry {
  date: string; // YYYY-MM-DD
  total: number;
  dateLabel: string; // pre-formatted ar-EG label
}

interface Props {
  entries: HistoryEntry[];
}

/** List of past days with their totals, newest first. */
export default function HistoryList({ entries }: Props) {
  if (entries.length === 0) {
    return <Text style={styles.empty}>ستظهر هنا أيامك المكتملة</Text>;
  }
  return (
    <View>
      {entries.map((e) => (
        <View key={e.date} style={styles.row}>
          <Text style={styles.date}>{e.dateLabel}</Text>
          <Text style={styles.total}>{e.total.toLocaleString('ar-EG')}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.historyRowBorder,
  },
  date: {
    fontSize: 15,
    color: theme.textDim,
  },
  total: {
    fontSize: 15,
    color: theme.text,
  },
  empty: {
    fontSize: 14,
    color: theme.textFaint,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
