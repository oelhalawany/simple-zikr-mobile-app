import {
  dayTotal,
  daysTracked,
  lapsDone,
  lastHistoryDays,
  lifetimeTotal,
  localDateStr,
  ringProgress,
  rollDayIfNeeded,
  tap,
  undoTap,
} from '../src/logic/counter';
import type { ZikrState } from '../src/types';

const state = (over: Partial<ZikrState> = {}): ZikrState => ({
  today: '2026-10-27',
  todayCounts: {},
  history: {},
  ...over,
});

describe('localDateStr', () => {
  it('formats from local year/month/day, not UTC', () => {
    // 2026-03-15 23:30 local time in a UTC+2 zone would be 2026-03-15 in UTC too,
    // so pick a time that differs: 00:30 local on the 15th in UTC+2 = 22:30 UTC on the 14th.
    const d = new Date(2026, 2, 15, 0, 30, 0);
    expect(localDateStr(d)).toBe('2026-03-15');
  });

  it('pads month and day', () => {
    expect(localDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('dayTotal', () => {
  it('sums counts', () => {
    expect(dayTotal({ subhanallah: 3, alhamdulillah: 4 })).toBe(7);
  });

  it('is zero for empty counts', () => {
    expect(dayTotal({})).toBe(0);
  });
});

describe('rollDayIfNeeded', () => {
  it('does nothing when the day is unchanged', () => {
    const s = state({ todayCounts: { subhanallah: 5 } });
    expect(rollDayIfNeeded(s, '2026-10-27')).toBe(s);
  });

  it('moves a day with taps into history and resets counts', () => {
    const s = state({
      today: '2026-10-26',
      todayCounts: { subhanallah: 10, allahuakbar: 5 },
    });
    const next = rollDayIfNeeded(s, '2026-10-27');
    expect(next.today).toBe('2026-10-27');
    expect(next.todayCounts).toEqual({});
    expect(next.history['2026-10-26']).toEqual({ total: 15, breakdown: { subhanallah: 10, allahuakbar: 5 } });
  });

  it('discards an empty day without creating history', () => {
    const s = state({ today: '2026-10-26', todayCounts: {} });
    const next = rollDayIfNeeded(s, '2026-10-27');
    expect(Object.keys(next.history)).toHaveLength(0);
  });
});

describe('tap and undoTap', () => {
  it('increments only the tapped phrase', () => {
    let s = state();
    s = tap(s, 'subhanallah', '2026-10-27');
    s = tap(s, 'subhanallah', '2026-10-27');
    s = tap(s, 'alhamdulillah', '2026-10-27');
    expect(s.todayCounts).toEqual({ subhanallah: 2, alhamdulillah: 1 });
  });

  it('rolls the day first when tapping after midnight', () => {
    const s = state({ today: '2026-10-26', todayCounts: { subhanallah: 3 } });
    const next = tap(s, 'allahuakbar', '2026-10-27');
    expect(next.today).toBe('2026-10-27');
    expect(next.todayCounts).toEqual({ allahuakbar: 1 });
    expect(next.history['2026-10-26'].total).toBe(3);
  });

  it('undo decrements the phrase', () => {
    let s = tap(state(), 'subhanallah', '2026-10-27');
    s = undoTap(s, 'subhanallah');
    expect(s.todayCounts.subhanallah).toBe(0);
  });

  it('undo never goes below zero', () => {
    const s = undoTap(state(), 'subhanallah');
    expect(s.todayCounts.subhanallah ?? 0).toBe(0);
  });
});

describe('totals and history', () => {
  it('lifetimeTotal sums today plus history', () => {
    const s = state({
      todayCounts: { subhanallah: 4 },
      history: {
        '2026-10-25': { total: 30, breakdown: {} },
        '2026-10-26': { total: 12, breakdown: {} },
      },
    });
    expect(lifetimeTotal(s)).toBe(46);
  });

  it('daysTracked counts history entries only', () => {
    const s = state({
      history: { '2026-10-25': { total: 30, breakdown: {} } },
    });
    expect(daysTracked(s)).toBe(1);
  });

  it('lastHistoryDays returns newest first, limited', () => {
    const s = state({
      history: {
        '2026-10-20': { total: 1, breakdown: {} },
        '2026-10-25': { total: 2, breakdown: {} },
        '2026-10-22': { total: 3, breakdown: {} },
      },
    });
    expect(lastHistoryDays(s, 2)).toEqual(['2026-10-25', '2026-10-22']);
  });
});

describe('ring helpers', () => {
  it('ringProgress wraps at LAP', () => {
    expect(ringProgress(0)).toBe(0);
    expect(ringProgress(16)).toBeCloseTo(16 / 33);
    expect(ringProgress(33)).toBe(0);
    expect(ringProgress(40)).toBeCloseTo(7 / 33);
  });

  it('lapsDone counts full laps', () => {
    expect(lapsDone(0)).toBe(0);
    expect(lapsDone(32)).toBe(0);
    expect(lapsDone(33)).toBe(1);
    expect(lapsDone(99)).toBe(3);
  });
});
