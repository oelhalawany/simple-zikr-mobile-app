import type { PhraseId } from '../types';

export interface Phrase {
  id: PhraseId;
  label: string;
}

/** The six zikr phrases, in the same order as the original HTML app. */
export const PHRASES: Phrase[] = [
  { id: 'subhanallah', label: 'سبحان الله' },
  { id: 'alhamdulillah', label: 'الحمد لله' },
  { id: 'lailaha', label: 'لا إله إلا الله' },
  { id: 'allahuakbar', label: 'الله أكبر' },
  { id: 'astaghfirullah', label: 'أستغفر الله' },
  { id: 'lahawla', label: 'لا حول ولا قوة إلا بالله' },
];

/** Taps needed for one full lap of the progress ring. */
export const LAP = 33;

/** AsyncStorage key, same as the original HTML app. */
export const STORAGE_KEY = 'zikr-data-ar-v2';

/** Header title. */
export const HEADER_TITLE = 'ألا بذكر الله تطمئن القلوب';

/** History list shows at most this many past days. */
export const HISTORY_LIMIT = 10;
