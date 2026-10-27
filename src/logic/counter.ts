import { LAP } from '../constants/phrases';
import type { DayCounts, PhraseId, ZikrState } from '../types';

/**
 * Local date string YYYY-MM-DD built from the device's local year/month/day.
 * Fixes the original app's bug where toISOString() (UTC) rolled the day over
 * at the wrong hour for users away from UTC.
 */
export function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Sum of all counts in a day. */
export function dayTotal(counts: DayCounts): number {
  let total = 0;
  for (const v of Object.values(counts)) {
    total += v ?? 0;
  }
  return total;
}

/**
 * If the stored day differs from today's local date, move the old day into
 * history (only if it had taps) and reset today's counts. Returns a new state;
 * the input is not mutated.
 */
export function rollDayIfNeeded(state: ZikrState, now: string = localDateStr()): ZikrState {
  if (state.today === now) return state;
  const history = { ...state.history };
  const total = dayTotal(state.todayCounts);
  if (state.today && total > 0) {
    history[state.today] = { total, breakdown: state.todayCounts };
  }
  return { today: now, todayCounts: {}, history };
}

/** Increment one phrase's count for today. Returns a new state. */
export function tap(state: ZikrState, id: PhraseId, now: string = localDateStr()): ZikrState {
  const s = rollDayIfNeeded(state, now);
  const counts = { ...s.todayCounts };
  counts[id] = (counts[id] ?? 0) + 1;
  return { ...s, todayCounts: counts };
}

/** Decrement one phrase's count for today (never below zero). Returns a new state. */
export function undoTap(state: ZikrState, id: PhraseId): ZikrState {
  const current = state.todayCounts[id] ?? 0;
  if (current <= 0) return state;
  const counts = { ...state.todayCounts };
  counts[id] = current - 1;
  return { ...state, todayCounts: counts };
}

/**
 * Clear today's counters but keep history untouched.
 * Returns a new state; the input is not mutated.
 */
export function resetToday(state: ZikrState): ZikrState {
  return { ...state, todayCounts: {} };
}

/**
 * Wipe today's counts, history and therefore the lifetime total.
 * Returns a fresh state anchored on the given day.
 */
export function resetEverything(now: string = localDateStr()): ZikrState {
  return { today: now, todayCounts: {}, history: {} };
}

/** Lifetime total: today's counts plus every day in history. */
export function lifetimeTotal(state: ZikrState): number {
  let total = dayTotal(state.todayCounts);
  for (const day of Object.values(state.history)) {
    total += day.total;
  }
  return total;
}

/** Number of completed days in history. */
export function daysTracked(state: ZikrState): number {
  return Object.keys(state.history).length;
}

/** The most recent N history days, newest first. */
export function lastHistoryDays(state: ZikrState, limit: number): string[] {
  return Object.keys(state.history)
    .sort()
    .reverse()
    .slice(0, limit);
}

/** Ring progress for a count: fraction of the current lap (0..1). */
export function ringProgress(count: number): number {
  return (count % LAP) / LAP;
}

/** Number of completed laps for a count. */
export function lapsDone(count: number): number {
  return Math.floor(count / LAP);
}
