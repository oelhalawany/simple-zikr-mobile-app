import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { HEADER_TITLE, HISTORY_LIMIT, PHRASES } from '../constants/phrases';
import { theme } from '../constants/theme';
import {
  daysTracked,
  lastHistoryDays,
  lifetimeTotal,
  rollDayIfNeeded,
  tap as tapPhrase,
  undoTap,
} from '../logic/counter';
import { loadState, saveState } from '../storage/storage';
import type { PhraseId, ZikrState } from '../types';
import ZikrCircle from '../components/ZikrCircle';
import StatCard from '../components/StatCard';
import HistoryList, { type HistoryEntry } from '../components/HistoryList';

export default function HomeScreen() {
  const [state, setState] = useState<ZikrState | null>(null);
  const [tapStack, setTapStack] = useState<PhraseId[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted state once, rolling the day forward if the app was closed overnight.
  useEffect(() => {
    loadState().then((loaded) => setState(rollDayIfNeeded(loaded)));
  }, []);

  // Debounced save, mirroring the original 300ms scheduleSave.
  useEffect(() => {
    if (!state) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveState(state).catch(() => undefined);
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  const onTap = useCallback((id: PhraseId) => {
    setState((s) => (s ? tapPhrase(s, id) : s));
    setTapStack((stack) => [...stack, id]);
  }, []);

  const onUndo = useCallback(() => {
    setTapStack((stack) => {
      if (stack.length === 0) return stack;
      const id = stack[stack.length - 1];
      setState((s) => (s ? undoTap(s, id) : s));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return stack.slice(0, -1);
    });
  }, []);

  // While the app stays open past midnight, roll the day like the HTML's interval check.
  useEffect(() => {
    const iv = setInterval(() => {
      setState((s) => (s ? rollDayIfNeeded(s) : s));
    }, 30_000);
    return () => clearInterval(iv);
  }, []);

  if (!state) {
    return (
      <View style={[styles.wrap, styles.loading]}>
        <Text style={styles.loadingText}>...</Text>
      </View>
    );
  }

  const dateLabel = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const historyEntries: HistoryEntry[] = lastHistoryDays(state, HISTORY_LIMIT).map((d) => ({
    date: d,
    total: state.history[d].total,
    dateLabel: new Date(`${d}T00:00:00`).toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.wrap}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.title}>{HEADER_TITLE}</Text>
      </View>

      <View style={styles.grid}>
        {PHRASES.map((p) => (
          <View key={p.id} style={styles.gridCell}>
            <ZikrCircle
              phrase={p.label}
              count={state.todayCounts[p.id] ?? 0}
              onTap={() => onTap(p.id)}
            />
          </View>
        ))}
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          onPress={onUndo}
          disabled={tapStack.length === 0}
          style={({ pressed }) => [
            styles.ctrlBtn,
            tapStack.length === 0 && styles.ctrlBtnDisabled,
            pressed && styles.ctrlBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="تراجع"
        >
          <Text style={styles.ctrlBtnText}>تراجع</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.stats}>
        <StatCard num={lifetimeTotal(state).toLocaleString('ar-EG')} lbl="الإجمالي الكلي" />
        <StatCard num={daysTracked(state).toLocaleString('ar-EG')} lbl="عدد الأيام" />
      </View>

      <View style={styles.history}>
        <Text style={styles.historyTitle}>الأيام السابقة</Text>
        <HistoryList entries={historyEntries} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.ink,
  },
  wrap: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 26,
    paddingBottom: 50,
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.text,
    fontSize: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 22,
  },
  date: {
    fontSize: 13,
    color: theme.sage,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    marginHorizontal: -7,
    marginBottom: 24,
  },
  gridCell: {
    width: '50%',
    paddingHorizontal: 7,
    marginBottom: 14,
  },
  controlsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    marginBottom: 24,
  },
  ctrlBtn: {
    borderWidth: 2,
    borderColor: theme.buttonBorder,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  ctrlBtnPressed: {
    backgroundColor: theme.buttonPressed,
  },
  ctrlBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.text,
  },
  ctrlBtnDisabled: {
    opacity: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.divider,
    marginBottom: 20,
  },
  stats: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 22,
  },
  history: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.sage,
    marginBottom: 10,
    textAlign: 'right',
  },
});
