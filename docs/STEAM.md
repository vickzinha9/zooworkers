# Steam Preparation Guide

The game is **prepared for Steam without requiring Steam to run**. All Steam
touchpoints sit behind adapters that fail safe when Steam is absent, so local
development and the browser demo work unchanged. **No real Steam App ID or secret
is needed for development or testing.**

## Integration boundaries

| Concern              | Where (status today)                                                                                                              | Fallback                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Achievements         | `src/platform/achievements.ts` (`SteamAchievements`). Not wired: `createAchievementAdapter()` returns `LocalAchievements`.        | `LocalAchievements` (no-op mirror; game unlocks locally regardless) |
| Stats                | Not built. No stats adapter exists yet; it would follow the achievements pattern.                                                 | Local `stats` in the save                                           |
| Rich Presence        | Not built. Would be wired in Electron main via a Steamworks binding and exposed over IPC.                                         | Omitted                                                             |
| Cloud saves          | Not ready: the save is in the renderer's Local Storage, not a file (see the save paths below).                                    | Local Storage in the userData folder                                |
| Steam Deck detection | `electron/main.ts` (`SteamDeck`/`SteamOS` env) + `getPlatformInfo()`. Reported only: nothing in the game reads `isSteamDeck` yet. | `isSteamDeck: false`                                                |
| Overlay awareness    | Not built.                                                                                                                        | No-op                                                               |
| Shutdown callbacks   | `app.on('will-quit')` (logs, unregisters the global shortcut), `beforeunload` save hook (`src/state/store.ts`)                    | Autosave every 20 s of play, when the window is hidden, on unload   |

To enable real Steamworks: add a native binding (e.g. `steamworks.js`) in the
**main process only**, construct `new SteamAchievements(backend)` where `backend`
forwards `setAchievement` over IPC, and select it in
`createAchievementAdapter()`. Keep it optional so builds without the binding still
run. Until then, the store page must not claim Steam Achievements, Steam Cloud or Steam Deck
support (see [`STORE_PAGE.md`](STORE_PAGE.md), "Do not claim yet").

## Achievement API id mapping

Every one of the game's 44 achievements maps to a Steamworks API name in
`STEAM_ACHIEVEMENT_IDS` (`src/platform/achievements.ts`): `ACH_` plus its id in capitals, except
six named by hand earlier (`ACH_FIRST_DAY`, `ACH_GOING_COMPLETELY_NUTS`, ...). The full table, with
each name and description in English and Brazilian Portuguese, is generated into
[`STEAM_ACHIEVEMENTS.md`](STEAM_ACHIEVEMENTS.md) for entering on the partner site.

## Where the desktop app keeps its files (and Steam Cloud)

Electron's `app.getPath('userData')` folder is named after `productName`, so it is `ZooWorkers`
(`package.json`; nothing calls `app.setName` in `electron/main.ts`):

- Windows: `%APPDATA%\ZooWorkers\`
- macOS: `~/Library/Application Support/ZooWorkers/`
- Linux: `~/.config/ZooWorkers/` (case-sensitive: not `zooworkers`)

What is in it:

| Item                                                                                                                                                   | Where                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| The save (`wmno.save.v1`), three rotating backups (`wmno.save.bak.0` to `.2`), a copy of the settings (`wmno.settings.v1`), the language (`wmno.lang`) | `Local Storage\leveldb\` (Chromium's Local Storage)     |
| Window position, size, corner, scale and shell toggles                                                                                                 | `window-settings.json`                                  |
| Startup and crash log                                                                                                                                  | `startup.log` (falls back to `%TEMP%\wmno-startup.log`) |
| Manual GPU safe-mode marker, only if someone created it                                                                                                | `gpu-safe-mode`                                         |

Sources: `src/save/saveManager.ts` (keys, three backups, browser `localStorage`),
`electron/main.ts` (`logFile`, `settingsPath`, `gpuFlagPath`). The staged diagnostics in
`electron/diagnostic-main.ts` and `electron/minimal-main.ts` set their own app names, so their
files go to `%APPDATA%\wmno-diagnostic\` and `%APPDATA%\wmno-minimal-test\`.

**Steam Cloud is not ready.** The save is not a `.json` file: it lives inside Chromium's Local
Storage database. Auto-Cloud set to `*.json` would sync only `window-settings.json`, which is
specific to one machine's monitors and should not sync at all. Syncing the `Local Storage\leveldb\`
folder means syncing a live database (with a lock file) that Chromium writes while the game runs.
Reliable Cloud saves would need the desktop build to write the save to a file in userData, which
is a code change nobody has made. **OWNER DECISION:** ship without Steam Cloud, or schedule that
change first. Until then the store page must not claim Cloud saves.

## Store page — feature summary

The full store text, in English and Brazilian Portuguese, with every number checked against the
code and the owner's open decisions marked, is in [`STORE_PAGE.md`](STORE_PAGE.md). In short:

- A cozy idle and clicker game in a small, resizable desktop window, made to stay open in a
  corner: time counts in full while it is open, and the team keeps working at 60% for up to
  8 hours while it is closed.
- 23 animal employees, each with a three-part story, gifts and a keepsake; 21 rooms with their
  own stations and routines; at most four people to a room.
- Office incidents whose choices come back later, 55 curiosities and an observation report.
- 67 decorations, three minigames (Coffee Rescue, Bug Squash, Cable Untangle Desk), collections,
  44 achievements and a restructure with five branches.
- Optional Focus Harvest companion; Moment Cards and Photo Mode saved as PNG. No ads, no
  microtransactions, fully offline. English and Brazilian Portuguese.

## Suggested system requirements

**To confirm with the Phase 3 measurements** (see `STORE_PAGE.md` for the store-ready table):

- **Minimum:** Windows 10 or 11, 64-bit; dual-core CPU; 4 GB RAM; integrated graphics. Only
  Windows 11 has been tested (Phase 1). Phase 1 measured a working set of about 595 MB in use and
  440 MB minimized.
- **Storage:** the packaged app measured 704 MB in Phase 1 (`docs/ZOOWORKERS_STATE.md`), so the
  earlier "~300 MB" was wrong. **OWNER DECISION** on the published figure after Phase 3.
- **macOS and Linux:** packaging targets exist in `package.json`, but no build has been tested.
  **OWNER DECISION** whether to list them.
- **Recommended:** to be filled from Phase 3. The game already offers a Battery-friendly mode
  (Settings → Window) and Quiet Mode (the tray menu); see the known issue with battery mode after
  a restart in `docs/PACKAGED_BUILD_QA.md`.

## Suggested launch options

- Players need none. The packaged build has no developer panel (it only appears in a dev build or
  with `?dev=1` in the browser).
- For a player whose GPU driver keeps the window from appearing, Steam's launch options can pass
  `--disable-gpu-safe-mode` (hardware acceleration off); `--force-gpu` turns it back on
  (`electron/main.ts`).
- The in-game **Launch on system startup** option opens the game normally at login; it does not
  start hidden in the tray.
- The desktop app reports a Steam Deck (`SteamDeck`/`SteamOS` environment variables), but nothing
  in the game changes on one and it has never been tested there.

## Capsule art briefs (for a commissioned artist)

Use the authored characters as reference, never redraws off-model: each of the 23 employees has
a poster in `public/employees/<id>-poster.png`. Keep the game's palette roles (green for actions,
gold for rewards, purple only for rare things) and its warm wood, paper and cream materials.
`docs/STEAM_ASSET_CHECKLIST.md` has the sizes and Steam's rules.

- **Main capsule:** Pip mid-celebration at his desk, buried in nuts and acorns, the tree-trunk
  office cut away behind him, warm amber lighting. Title lockup with the subtitle "A Cozy Animal
  Office Idle Game" if the owner keeps it.
- **Small capsule:** Pip's face with his round glasses and orange tie (as in
  `public/employees/pip-poster.png`), and one golden nut.
- **Library hero:** the multi-floor office cutaway with the team at work: several of the 23
  employees, no more than four in any one room, as in the game.

## Documents

- EULA template (**must be reviewed by a lawyer before use**): see
  `docs/EULA_TEMPLATE.md`.
- Privacy statement: `PRIVACY.md`.
- Release checklist: `docs/RELEASE_CHECKLIST.md`.

> Do not commit real Steam App IDs, secrets, or signing certificates. This repo
> intentionally contains none.
