import { daysTracked } from '../src/logic/counter';
import {
  emptyState,
  makeBackup,
  migrateState,
  parseBackup,
  serializeBackup,
  validateBackup,
} from '../src/storage/storage';

describe('migrateState', () => {
  it('returns empty state for garbage input', () => {
    expect(migrateState(null)).toEqual(emptyState());
    expect(migrateState(42)).toEqual(emptyState());
    expect(migrateState('nope')).toEqual(emptyState());
  });

  it('keeps a valid state, rolling the day forward if stale', () => {
    const s = { today: '2026-10-26', todayCounts: { subhanallah: 2 }, history: {} };
    const m = migrateState(s);
    // 2026-10-26 is in the past, so migrateState rolls it into history.
    expect(m.today).not.toBe('2026-10-26');
    expect(m.history['2026-10-26']).toEqual({ total: 2, breakdown: { subhanallah: 2 } });
    expect(m.todayCounts).toEqual({});
  });

  it('keeps a valid state for today without changes', () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const s = { today: `${y}-${m}-${d}`, todayCounts: { subhanallah: 2 }, history: {} };
    expect(migrateState(s)).toEqual(s);
  });

  it('drops invalid counts and history entries', () => {
    const today = new Date();
    const y = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const s = {
      today: `${y}-${mm}-${dd}`,
      todayCounts: { subhanallah: 2, bogus: 'x', alhamdulillah: -5 },
      history: {
        '2026-10-25': { total: 10, breakdown: {} },
        'bad-date': { total: 5, breakdown: {} },
        '2026-10-24': { total: 0, breakdown: {} },
      },
    };
    const migrated = migrateState(s);
    expect(migrated.todayCounts).toEqual({ subhanallah: 2 });
    expect(Object.keys(migrated.history)).toEqual(['2026-10-25']);
  });

  it('rolls an old day forward on load', () => {
    const s = { today: '2026-10-20', todayCounts: { subhanallah: 7 }, history: {} };
    const m = migrateState(s);
    expect(m.todayCounts).toEqual({});
    expect(m.history['2026-10-20'].total).toBe(7);
  });
});

describe('backup validation', () => {
  it('accepts a wrapped backup', () => {
    const b = makeBackup({
      today: '2026-10-27',
      todayCounts: { subhanallah: 3 },
      history: { '2026-10-26': { total: 9, breakdown: { subhanallah: 9 } } },
    });
    const v = parseBackup(serializeBackup(b));
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.state.todayCounts.subhanallah).toBe(3);
      expect(daysTracked(v.state)).toBe(1);
    }
  });

  it('accepts a bare state object', () => {
    const v = validateBackup({ today: '2026-10-27', todayCounts: {}, history: {} });
    expect(v.ok).toBe(true);
  });

  it('rejects non-JSON', () => {
    const v = parseBackup('not json at all');
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.error).toContain('JSON');
    }
  });

  it('rejects wrong shapes', () => {
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup('string').ok).toBe(false);
    expect(validateBackup({}).ok).toBe(false);
    expect(validateBackup({ today: '2026-10-27' }).ok).toBe(false);
    expect(validateBackup({ today: '2026-10-27', todayCounts: {} }).ok).toBe(false);
    expect(validateBackup({ today: 'not-a-date', todayCounts: {}, history: {} }).ok).toBe(false);
    expect(validateBackup({ today: '2026-10-27', todayCounts: 5, history: {} }).ok).toBe(false);
    expect(validateBackup({ today: '2026-10-27', todayCounts: {}, history: [] }).ok).toBe(false);
  });

  it('migrates dates forward when importing an old backup', () => {
    const v = validateBackup({
      today: '2026-10-01',
      todayCounts: { subhanallah: 5 },
      history: {},
    });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.state.todayCounts).toEqual({});
      expect(v.state.history['2026-10-01'].total).toBe(5);
    }
  });
});
