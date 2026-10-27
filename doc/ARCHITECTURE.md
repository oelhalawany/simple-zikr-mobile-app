# Architecture — الذكر (Zikr Counter)

A complete map of how this app is built, why each piece exists, and how data flows.
Read this top-to-bottom once and you'll understand every file in the repo.

> For day-to-day commands (run on phone, tests, EAS builds), see
> [DEVELOPMENT.md](./DEVELOPMENT.md).

---

## 1. What this app is

A **zikr (dhikr) counter** — a tasbih-style tally app. The user taps one of six
circles to count repetitions of a phrase (سبحان الله, الحمد لله, …). Counts are
kept per day, old days move into a history log, and lifetime stats are shown.

It is a **React Native port of a single-file HTML app** that lives in
`reference/zikr-counter.html`. The port must match the original's behavior and
look exactly — that file is the specification. `reference/` is never modified
and never shipped; it's documentation, not code.

**One deliberate fix:** the original used `toISOString()` for dates, which is
UTC — so the day rolled over at the wrong hour for anyone not in UTC. This app
uses the device's **local** date instead (see §6).

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Expo SDK 58, blank TypeScript template | Runs in Expo Go on iOS/Android for instant testing; no Xcode/Android Studio needed |
| Language | TypeScript, `strict: true` | Catches shape errors at compile time |
| UI | React Native core components only | No navigation, no UI library — one screen |
| Persistence | `@react-native-async-storage/async-storage` | Simple key-value JSON store, matches the original's localStorage |
| Graphics | `react-native-svg` | Draws the progress ring around each circle |
| Haptics | `expo-haptics` | Vibration feedback on tap/undo |
| Files | `expo-file-system`, `expo-sharing`, `expo-document-picker` | Backup export/import |
| Tests | Jest + `jest-expo` | Unit tests for pure logic and storage |
| Lint/Format | ESLint 9 (flat config, `eslint-config-expo`) + Prettier | Code quality |

**Not used on purpose:** navigation libraries, state management libraries
(Redux/Zustand), UI kits. The app is one screen with one state object — plain
`useState` is the right tool.

---

## 3. Folder structure

```
simple-zikr-mobile-app/
├── App.tsx                  # Root component: StatusBar + HomeScreen
├── index.ts                 # Expo entry point (registerRootComponent)
├── app.json                 # Expo config: name الذكر, slug zikr, icons, splash
├── assets/                  # Generated icons/splash (from scripts/make-icons.ps1)
├── reference/               # ORIGINAL HTML app + icon source — read-only spec
├── scripts/
│   └── make-icons.ps1       # Regenerates assets/*.png from reference/icon-source.png
├── src/
│   ├── components/          # Reusable, presentational pieces
│   │   ├── ZikrCircle.tsx   #   One circle: SVG ring + count + phrase + lap note
│   │   ├── StatCard.tsx     #   Big number + label card (lifetime total, days)
│   │   └── HistoryList.tsx  #   Past-days list, newest first
│   ├── screens/
│   │   └── HomeScreen.tsx   # The ONLY screen: owns all app state
│   ├── logic/
│   │   └── counter.ts       # PURE functions: tap, undo, rollover, totals, dates
│   ├── storage/
│   │   └── storage.ts       # AsyncStorage load/save + backup validate/serialize
│   ├── constants/
│   │   ├── phrases.ts       # The 6 phrases, LAP=33, storage key, header text
│   │   └── theme.ts         # Every color used in the app
│   └── types/
│       └── index.ts         # PhraseId, DayCounts, ZikrState, ZikrBackup
├── __tests__/               # Jest tests for src/logic and src/storage
│   ├── counter.test.ts
│   └── storage.test.ts
├── __mocks__/
│   └── @react-native-async-storage/async-storage.ts   # In-memory mock for tests
├── jest.config.js           # preset: jest-expo
├── eslint.config.js         # flat config wrapping eslint-config-expo/flat
├── .prettierrc
└── tsconfig.json            # extends expo/tsconfig.base, strict
```

### The layering rule

Dependencies point **one way only**:

```
screens → components → logic ← storage
                ↑            ↑
           constants/types (leaf, imported by everyone)
```

- `logic/` is **pure**: no React, no AsyncStorage, no side effects. It takes
  state in, returns new state out. This is what makes it trivially testable.
- `storage/` is the **only** file that touches AsyncStorage.
- `components/` never import from `screens/`; they receive props and fire
  callbacks upward.

---

## 4. Data model (`src/types/index.ts`)

```ts
type PhraseId = 'subhanallah' | 'alhamdulillah' | 'lailaha'
              | 'allahuakbar' | 'astaghfirullah' | 'lahawla';

type DayCounts = Partial<Record<PhraseId, number>>;   // today's tallies

interface DayRecord { total: number; breakdown: DayCounts; }  // one finished day

interface ZikrState {
  today: string;                        // "YYYY-MM-DD" in LOCAL time
  todayCounts: DayCounts;               // live counters for today
  history: Record<string, DayRecord>;   // finished days, keyed by date
}

interface ZikrBackup { app: 'zikr'; version: 1; exportedAt: string; state: ZikrState; }
```

Everything the app knows lives in **one `ZikrState` object**, persisted as one
JSON blob under the AsyncStorage key `zikr-data-ar-v2` (same key as the
original HTML app, so a web user's data concept maps 1:1).

---

## 5. The core loop (runtime behavior)

### 5.1 Startup

```
App.tsx → HomeScreen
  useEffect: loadState() → migrateState() → rollDayIfNeeded() → setState
  (state === null until loaded → renders "..." loading screen)
```

### 5.2 Tapping a circle

```
ZikrCircle (Pressable)
  → Haptics.impactAsync(Light)          // vibration
  → onTap(id)  in HomeScreen
      → setState(tap(state, id))        // pure increment, rolls day if needed
      → setTapStack([...stack, id])     // push onto undo stack
  → debounced saveState (300 ms)        // mirrors the original's scheduleSave
```

`tap()` never mutates state — it builds a new object. React re-renders only the
circles whose props changed.

### 5.3 Undo

The undo button pops the **last tap** off `tapStack` and decrements that
phrase's count (never below 0). It is repeatable until the stack is empty, then
the button disables. This matches the original exactly: undo reverses the most
recent tap, not "reset the circle".

> Note: `tapStack` is session-only (in memory). After an app restart, undo
> starts empty — same as the original HTML app.

### 5.4 Day rollover (the midnight rule)

Three places call `rollDayIfNeeded(state, todayStr)`:

1. **On load** — app was closed overnight → yesterday moves to history.
2. **Every 30 s while open** — app stays open past midnight → same.
3. **Inside `tap()`** — belt-and-braces so a tap can never land on yesterday.

Rollover logic: if `state.today !== todayStr`, and yesterday had ≥ 1 tap, move
`{ total, breakdown }` into `history[state.today]`, then reset `todayCounts`
and set `today` to the new date. Days with zero taps are **not** recorded.

### 5.5 Derived numbers (computed on render, never stored)

| Value | Function |
|---|---|
| Lifetime total | `lifetimeTotal` = today's counts + Σ history totals |
| Days tracked | `daysTracked` = `Object.keys(history).length` |
| Ring progress | `ringProgress(count)` = `(count % 33) / 33` |
| Laps done | `lapsDone(count)` = `⌊count / 33⌋` → shown as "× N دورة" |

The ring wraps: tap 33 fills it, tap 34 starts lap 2. The lap note appears
under the circle once `laps > 0`.

---

## 6. The local-date fix (known bug from the original)

```ts
// counter.ts — the whole fix
export function localDateStr(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

The original did `new Date().toISOString().slice(0, 10)` — that's UTC, so in
Germany the day flipped at 01:00 (or 02:00 in summer), not midnight. Every date
in this app goes through `localDateStr()` instead. All logic functions accept
an optional `now` parameter so tests can inject fixed dates.

---

## 7. Persistence & migration (`src/storage/storage.ts`)

`loadState()` never trusts what it reads:

1. `AsyncStorage.getItem` → `null` means fresh install → `emptyState()`.
2. `JSON.parse` inside try/catch → corrupt data → `emptyState()` (no crash).
3. `migrateState()` sanitizes every field:
   - `today` must match `/^\d{4}-\d{2}-\d{2}$/`, else today's local date.
   - `todayCounts`: only known phrase ids with finite positive integers survive.
   - `history`: only valid date keys with `total > 0` survive.
4. `rollDayIfNeeded` runs last, so stale data from a previous day is archived
   on first load.

This means **any garbage in storage degrades to a clean empty state** instead
of crashing the app.

Saves are **debounced 300 ms** (one `setTimeout`, cleared on each state change)
— rapid tapping writes to disk once, not 30 times.

---

## 8. Backup (export/import)

`storage.ts` already contains the pure parts; the UI wiring is the next step:

| Function | Role |
|---|---|
| `makeBackup(state)` | Wraps state as `{ app: 'zikr', version: 1, exportedAt, state }` |
| `serializeBackup(backup)` | Pretty-printed JSON string |
| `parseBackup(json)` | JSON.parse + `validateBackup`, Arabic error messages |
| `validateBackup(raw)` | Accepts the wrapped shape **or** a bare state; checks `today` format, `todayCounts`/`history` are objects (not arrays); runs `migrateState` on success |

Planned UI flow (Step 4):
- **Export**: `makeBackup` → write `zikr-backup.json` via `expo-file-system` →
  share sheet via `expo-sharing`.
- **Import**: pick file via `expo-document-picker` → read text → `parseBackup`
  → invalid → show the Arabic error; valid → **confirm dialog** ("this
  replaces your current data") → `saveState(validated)`.

---

## 9. UI layer

### 9.1 RTL — handled manually

The app is Arabic but we do **not** force app-wide RTL (`I18nManager`). Instead:

- Grid and rows use `flexDirection: 'row-reverse'` → first item renders
  rightmost.
- Text is `textAlign: 'right'` where the original right-aligns.
- Numbers use `toLocaleString('ar-EG')` → ٣٤ instead of 34.
- Date labels use `toLocaleDateString('ar-EG', …)`.

Why manual: forcing RTL flips *everything* (including SVGs and absolute
positions) and is hard to undo; the original HTML achieved the look with
`direction: rtl` on specific elements, and we mirror that per-element.

### 9.2 Components

**`ZikrCircle`** — the heart of the UI.
- An SVG `viewBox="0 0 100 100"` with two circles: a faint track ring and a
  gold progress arc (`strokeDasharray`/`strokeDashoffset` trick, rotated -90°
  so it starts at 12 o'clock).
- A `Pressable` circle sits **on top** (absolute, inset 8%) — that's the tap
  target, showing count + phrase. Press scales it to 0.94 and lightens the
  fill.
- Lap note below: `× N دورة` once a lap is complete.

**`StatCard`** — dumb card: big gold number + sage label.

**`HistoryList`** — rows of `dateLabel … total`, newest first, or an empty-state
message. Receives pre-formatted `ar-EG` date labels (formatting stays in the
screen, the list stays dumb).

### 9.3 HomeScreen composition

```
ScrollView (maxWidth 520, centered)
├── header: date (ar-EG) + ألا بذكر الله تطمئن القلوب
├── grid: 2×3 row-reverse of ZikrCircle
├── undo button (تراجع), disabled when tapStack empty
├── divider
├── stats: StatCard × 2 (الإجمالي الكلي، عدد الأيام)
└── history: الأيام السابقة + HistoryList (last 10)
```

### 9.4 Theme

Every color lives in `src/constants/theme.ts` (`ink` #0F3B39 background,
`ink2` #14504C fills, `brassLight` #E4C98A gold, `sage` #7FA893, `text`
#EDE7D6). Components never hardcode hex values.

---

## 10. Testing

`jest.config.js` uses the `jest-expo` preset; tests live in `__tests__/` and
only cover the **pure layers**:

- `counter.test.ts` — localDateStr, tap, undoTap, rollDayIfNeeded, totals,
  laps/ring math, history ordering.
- `storage.test.ts` — migrateState sanitization, validateBackup accept/reject
  cases, parseBackup on bad JSON. AsyncStorage is replaced by an in-memory
  mock (`__mocks__/@react-native-async-storage/async-storage.ts`).

Run: `npm test`. The UI layer is intentionally untested (visual behavior,
covered by manual testing in Expo Go).

---

## 11. Tooling & config

| File | Purpose |
|---|---|
| `tsconfig.json` | extends `expo/tsconfig.base`, `strict: true`, includes all ts/tsx |
| `eslint.config.js` | Flat config: `eslint-config-expo/flat` + ignores (`reference/`, configs) + allow `_`-prefixed unused vars |
| `.prettierrc` | 100 cols, single quotes, trailing commas, LF |
| `app.json` | name الذكر, slug `zikr`, portrait, splash bg #0F3B39, iOS bundle `com.example.zikr`, Android package `com.example.zikr`, `expo-sharing` plugin |
| `scripts/make-icons.ps1` | Resizes `reference/icon-source.png` (1024²) into `assets/icon.png`, adaptive-icon foreground, splash icon, favicon |

Commands: `npm start` (dev server), `npm test`, `npm run lint`,
`npm run typecheck`.

---

## 12. Development workflow (phone testing)

```
npx expo start            # LAN mode — QR works if phone + PC share a Wi-Fi
npx expo start --tunnel   # ngrok tunnel — works across networks
                          #   requires: npx expo login (free Expo account)
```

- Scan the QR with the **Expo Go** app (iOS camera or Android Expo Go scanner).
- Tunnel mode is needed when phone and PC are on different networks (e.g. PC on
  ethernet, phone on guest Wi-Fi) — Expo Go on iOS additionally requires being
  signed in to an Expo account to open tunnel URLs.
- `@expo/ngrok` is a devDependency used by `--tunnel`; it never ships in the app.

---

## 13. Project status / roadmap

| Step | Scope | Status |
|---|---|---|
| 1 | Scaffold, deps, configs, icons | ✅ committed |
| 2 | types, constants, logic, storage + tests | ✅ committed |
| 3 | ZikrCircle, StatCard, HistoryList, HomeScreen | ✅ committed |
| 4 | Backup export/import UI | ⬜ next (pure functions already in storage.ts) |
| 5 | README + final lint/typecheck/test pass | ⬜ |

Explicitly **excluded** from the port (per spec): the refresh button, web
manifest, and corner star decorations of the original HTML app.
