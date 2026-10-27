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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_TITLE, HISTORY_LIMIT, PHRASES } from '../constants/phrases';
import { theme } from '../constants/theme';
import {
  dayTotal,
  daysTracked,
  lastHistoryDays,
  lifetimeTotal,
  resetEverything,
  resetToday,
  rollDayIfNeeded,
  tap as tapPhrase,
  undoTap,
} from '../logic/counter';
import { loadState, saveState } from '../storage/storage';
import type { PhraseId, ZikrState } from '../types';
import ZikrCircle from '../components/ZikrCircle';
import StatCard from '../components/StatCard';
import type { HistoryEntry } from '../components/HistoryList';
import HistoryModal from '../components/HistoryModal';
import SettingsModal from '../components/SettingsModal';
import GearIcon from '../components/GearIcon';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ZikrState | null>(null);
  const [tapStack, setTapStack] = useState<PhraseId[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
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

  // --- Settings actions -----------------------------------------------------
  // Both are called only after the user confirms in the modal's Alerts.
  const onResetToday = useCallback(() => {
    setState((s) => (s ? resetToday(s) : s));
    setTapStack([]); // undo history no longer matches the counters
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const onResetEverything = useCallback(() => {
    setState(() => resetEverything());
    setTapStack([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
      <View style={[styles.screen, styles.loading, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>...</Text>
      </View>
    );
  }

  // Derived numbers: recomputed on every render, so taps and undo update them.
  const todayTotal = dayTotal(state.todayCounts);
  const grandTotal = lifetimeTotal(state);
  const trackedDays = daysTracked(state);

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
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.wrap,
          { paddingTop: insets.top + 26, paddingBottom: insets.bottom + 50 },
        ]}
      >
        <StatusBar style="light" />
        <View style={styles.header}>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={({ pressed }) => [styles.settingsBtn, pressed && styles.settingsBtnPressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="الإعدادات"
          >
            <GearIcon color={theme.sage} />
          </Pressable>
          <Text style={styles.date}>{dateLabel}</Text>
          <Text style={styles.title}>{HEADER_TITLE}</Text>
        </View>

        <Text style={styles.todayTotal}>إجمالي اليوم {todayTotal.toLocaleString('ar-EG')}</Text>

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
          <StatCard num={grandTotal.toLocaleString('ar-EG')} lbl="الإجمالي الكلي" />
          <StatCard num={trackedDays.toLocaleString('ar-EG')} lbl="عدد الأيام" />
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => setHistoryOpen(true)}
            style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="الأيام السابقة"
          >
            <Text style={styles.ctrlBtnText}>الأيام السابقة</Text>
          </Pressable>
        </View>
      </ScrollView>

      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onResetToday={onResetToday}
        onResetEverything={onResetEverything}
      />

      <HistoryModal
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entries={historyEntries}
      />
    </>
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
    marginBottom: 10,
  },
  settingsBtn: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  settingsBtnPressed: {
    backgroundColor: theme.buttonPressed,
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
  todayTotal: {
    fontSize: 13,
    color: theme.sage,
    textAlign: 'center',
    marginBottom: 18,
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
});
