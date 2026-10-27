import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY } from '../constants/phrases';
import { localDateStr, rollDayIfNeeded } from '../logic/counter';
import type { BackupValidation, DayCounts, ZikrBackup, ZikrState } from '../types';

/** Fresh empty state for a new install. */
export function emptyState(): ZikrState {
  return { today: localDateStr(), todayCounts: {}, history: {} };
}

/**
 * Coerce an unknown parsed value into a valid ZikrState, migrating older or
 * partial shapes. Anything unusable falls back to an empty state.
 */
export function migrateState(raw: unknown): ZikrState {
  const base = emptyState();
  if (typeof raw !== 'object' || raw === null) return base;
  const obj = raw as Record<string, unknown>;

  const today = typeof obj.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.today) ? obj.today : base.today;
  const todayCounts = sanitizeCounts(obj.todayCounts);
  const history = sanitizeHistory(obj.history);

  return rollDayIfNeeded({ today, todayCounts, history });
}

function sanitizeCounts(value: unknown): DayCounts {
  const out: DayCounts = {};
  if (typeof value !== 'object' || value === null) return out;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      out[k as keyof DayCounts] = Math.floor(v);
    }
  }
  return out;
}

function sanitizeHistory(value: unknown): ZikrState['history'] {
  const out: ZikrState['history'] = {};
  if (typeof value !== 'object' || value === null) return out;
  for (const [date, rec] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (typeof rec !== 'object' || rec === null) continue;
    const r = rec as Record<string, unknown>;
    const total = typeof r.total === 'number' && Number.isFinite(r.total) ? Math.floor(r.total) : 0;
    if (total <= 0) continue;
    out[date] = { total, breakdown: sanitizeCounts(r.breakdown) };
  }
  return out;
}

/** Load state from AsyncStorage, migrating as needed. */
export async function loadState(): Promise<ZikrState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return emptyState();
    return migrateState(JSON.parse(raw));
  } catch {
    // Corrupt or unreadable data: start fresh rather than crash.
    return emptyState();
  }
}

/** Persist state to AsyncStorage. */
export async function saveState(state: ZikrState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Build the backup payload from a state. */
export function makeBackup(state: ZikrState): ZikrBackup {
  return { app: 'zikr', version: 1, exportedAt: new Date().toISOString(), state };
}

/**
 * Validate an unknown parsed backup value. Accepts both the wrapped backup
 * shape ({app, version, state}) and a bare state object.
 */
export function validateBackup(raw: unknown): BackupValidation {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'الملف ليس بصيغة صحيحة' };
  }
  const obj = raw as Record<string, unknown>;
  const candidate = (obj as { state?: unknown }).state !== undefined ? obj.state : obj;
  if (typeof candidate !== 'object' || candidate === null) {
    return { ok: false, error: 'الملف ليس بصيغة صحيحة' };
  }
  const c = candidate as Record<string, unknown>;
  if (typeof c.today !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.today)) {
    return { ok: false, error: 'التاريخ في الملف غير صالح' };
  }
  if (typeof c.todayCounts !== 'object' || c.todayCounts === null || Array.isArray(c.todayCounts)) {
    return { ok: false, error: 'عدادات اليوم غير صالحة' };
  }
  if (typeof c.history !== 'object' || c.history === null || Array.isArray(c.history)) {
    return { ok: false, error: 'سجل الأيام غير صالح' };
  }
  return { ok: true, state: migrateState(candidate) };
}

/** Serialize a backup to a JSON string for export. */
export function serializeBackup(backup: ZikrBackup): string {
  return JSON.stringify(backup, null, 2);
}

/** Parse and validate a backup JSON string. */
export function parseBackup(json: string): BackupValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'تعذر قراءة الملف (JSON غير صالح)' };
  }
  return validateBackup(parsed);
}
