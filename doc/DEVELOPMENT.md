# Development Guide — الذكر (Zikr Counter)

How to run, test, and build the app. For how the code is organized, see
[ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1. Prerequisites

| Tool | Version | Check with |
|---|---|---|
| Node.js | 20+ (24 used in dev) | `node --version` |
| npm | 10+ | `npm --version` |
| Expo Go app | latest | App Store / Google Play |

One-time setup:

```bash
npm install          # install all dependencies
npx expo login       # free account at https://expo.dev/signup — needed for tunnel mode
```

---

## 2. Run on your phone (Expo Go)

```bash
npx expo start
```

A QR code appears in the terminal. Scan it:

- **iPhone** — scan with the Camera app, it opens in Expo Go.
- **Android** — press "Scan QR code" inside the Expo Go app.

The app hot-reloads: save a file and the phone updates in ~1 second.

### LAN vs tunnel

| Mode | Command | When to use |
|---|---|---|
| LAN (default) | `npx expo start` | Phone and PC on the **same** Wi-Fi |
| Tunnel | `npx expo start --tunnel` | Phone on a **different** network (or Wi-Fi blocks it) |

Tunnel mode routes through the internet via ngrok (`@expo/ngrok` is already a
devDependency) and **requires being logged in** (`npx expo login`). Expo Go on
iOS also requires you to be signed in to the same Expo account to open tunnel
URLs — that's an Expo security rule, not a bug.

Useful keys while the server runs:

- `r` — reload the app
- `c` — open the dev menu
- `Ctrl+C` — stop the server

If the phone shows a stale/crashing bundle, restart with a clean cache:

```bash
npx expo start --clear
```

---

## 3. Tests

Unit tests cover the pure logic (`src/logic`) and storage (`src/storage`).
They run in Node — no phone or emulator needed.

```bash
npm test             # run once
npx jest --watch     # re-run on every file change
```

- Tests live in `__tests__/` (`counter.test.ts`, `storage.test.ts`).
- AsyncStorage is replaced by an in-memory mock in
  `__mocks__/@react-native-async-storage/async-storage.ts`.
- Config: `jest.config.js` (preset `jest-expo`).

---

## 4. Lint & typecheck

```bash
npm run lint         # ESLint (flat config, eslint-config-expo)
npm run typecheck    # tsc --noEmit (strict mode)
```

Both must pass before committing. Formatting is handled by Prettier
(`.prettierrc`); most editors format on save.

---

## 5. Building installable apps (EAS)

Expo Go is great for development, but to install the app like a real app
(own icon on the home screen, no Expo Go needed) you build with
[EAS Build](https://docs.expo.dev/build/introduction/).

### One-time setup

```bash
npm install --global eas-cli    # or: npx eas-cli
eas login                       # same Expo account as before
eas build:configure             # creates eas.json
```

### Development build (for testing, includes dev tools)

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

You get a download link — install it on the phone. iOS development builds
require the device to be registered (EAS asks and handles it).

### Production build (for the stores / sharing)

```bash
eas build --profile production --platform android   # .aab for Google Play
eas build --profile production --platform ios       # .ipa (needs Apple Developer account, $99/yr)
```

Notes:

- Android production builds can be shared directly as APKs by adding an
  `apk` profile to `eas.json` — no store needed.
- iOS always needs an Apple Developer account ($99/year) for device installs.
- Builds run on Expo's cloud (free tier includes a monthly quota).

---

## 6. Regenerating icons

Icons are generated from `reference/icon-source.png` (1024×1024):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1
```

Writes `assets/icon.png`, `assets/android-icon-foreground.png`,
`assets/splash-icon.png`, `assets/favicon.png`. Restart the dev server after
regenerating so the change is picked up.

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| Phone can't connect in LAN mode | Phone and PC must be on the same Wi-Fi; use `--tunnel` otherwise |
| "Not logged in" error with `--tunnel` | Run `npx expo login` |
| App crashes / stale bundle on phone | `npx expo start --clear`, then rescan |
| Tests fail with "Must use import to load ES Module" | Make sure `jest.config.js` uses the `jest-expo` preset |
| Port 8081 already in use | Close the other terminal running `expo start`, or `npx expo start --port 8082` |
