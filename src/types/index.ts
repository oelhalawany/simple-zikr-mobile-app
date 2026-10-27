/** Identifiers for the six zikr phrases, matching the original HTML app. */
export type PhraseId =
  | 'subhanallah'
  | 'alhamdulillah'
  | 'lailaha'
  | 'allahuakbar'
  | 'astaghfirullah'
  | 'lahawla';

/** Counts for one day, keyed by phrase id. */
export type DayCounts = Partial<Record<PhraseId, number>>;

/** A completed day stored in history. */
export interface DayRecord {
  total: number;
  breakdown: DayCounts;
}

/** Persisted app state. */
export interface ZikrState {
  today: string; // YYYY-MM-DD (local)
  todayCounts: DayCounts;
  history: Record<string, DayRecord>;
}

/** Shape of the exported/imported backup file. */
export interface ZikrBackup {
  app: 'zikr';
  version: 1;
  exportedAt: string;
  state: ZikrState;
}

/** Result of validating a backup file. */
export type BackupValidation =
  | { ok: true; state: ZikrState }
  | { ok: false; error: string };
