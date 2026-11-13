# ZooWorkers roadmap (proposed 2026-11-07, pending the user's approval)

Built from the repository as it is: `docs/ZOOWORKERS_STATE.md`, `DESIGN.md`,
`docs/GAME_DESIGN.md`, the code and tests, PRs #9 and #11, and a local run on native Windows.
It adds no feature the evidence does not call for. The state file stays the record of what was
done; this file is only the order of what comes next.

## Where the project stands

Verified on 2026-11-07:

- Branch `feat/zooworkers-3.0-facility-pass` at `9f5ef83` (final integration), same as origin.
  PR #9 is open, unmerged, mergeable, base `feat/zooworkers-2.0-master-pass`; its CI run #74 on
  `9f5ef83` passed both jobs.
- PR #11 (Feature A, the observation report) is open on `feat/zooworkers-observation-log`
  (`96e7bbb`), one commit stacked on `9f5ef83`, CI run #75 passed. Not yet reviewed.
- ZooWorkers lives entirely in a stack of unmerged PRs (#6 → #7 → #8 → #9 → #11). `main` holds
  only a README.
- Native Windows 11, Node 24: `npm ci` exit 0; `npm run validate` exit 0 (typecheck, lint, i18n
  0 hard errors and 10 draft-locale warnings, 46/46 asset halo checks, 1035/1035 unit tests in
  84 files, build). The web bundle is one 1.62 MB JS chunk (514 KB gzip).
- E2E on the same machine (Chromium 1228, Playwright's default 8 workers): 334 passed,
  34 failed, 9 did not run, of 377 (12.3 min). The failures were timeouts (30 s, 60 s, 2 min),
  late image loads and timing-dependent streak counts, plus 13 trace-zip write errors. Re-run at
  2 workers: the 34 failed tests passed 34/34 and the serial `minigame-polish` file 10/10. Every
  test has passed here, but the suite is not reliable at full parallelism on this PC.

Done and accepted (do not redo): Chapters 1, 4, 9, 2, 3, 5, 6, 7, 8, 10 and final integration,
plus Feature A on its own branch. The cast is 23 of 23 with real art; 21 rooms; three
minigames (Coffee Rescue, Bug Squash, Cable Untangle); save version 13.

## Release blockers and human-only checks (not development)

| Item                                                                                 | Who                            | Notes                                                            |
| ------------------------------------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------- |
| Native Windows packaged build, verify and smoke scripts                              | Claude, on this machine        | Last native run `a4e03ad` (2026-09-19), 37 commits ago. Phase 1. |
| Windows display scaling 100/125/150/200%, multi-monitor snapping, sleep/resume, tray | User                           | Needs system settings and hardware; Claude writes exact steps.   |
| Listening to every cue and the ambience over a long stay                             | User                           | The whole Blockers audio list is still unheard. Phase 6.         |
| Physical touchscreen checks                                                          | User, if a touch device exists | Otherwise decide whether touch is a release requirement.         |
| Merging #9, #11 and landing the stack on `main`                                      | User decides                   | Claude proposes the path; never merges without a yes.            |
| CI artifact storage quota (Playwright report upload)                                 | User (repo settings)           | Separate from test results.                                      |

## Phases, in recommended order

### Phase 1 — Native Windows release verification (done by Claude, 2026-11-07; human part open)

Outcome: see "Phase 1 record" in `docs/ZOOWORKERS_STATE.md`. Four native defects were found and
fixed: the window reopened centred, the tray menu was English only, minimized time was paid
as sleep, and Team cards broke at mid widths. The stale smokes were repaired. The independent
QA review then caught the minimize fix failing under CPU load and a suspension Windows does not
announce being paid as open play; both are fixed. What only a person can check (real display
scaling, unplugging a monitor, the tray menu by hand, real sleep and Modern Standby, the
installer, a heavy load while minimized) is listed under Blockers there.

Follow-ups it found, for Phase 2:

- `docs/PACKAGED_BUILD_QA.md` and `docs/WINDOWS_TESTING.md` describe an older game (12
  employees, an office toolbar, a "Floor" drag label).
- `scripts/qa-inspect.mjs` stubs `window.desktop` without `setTrayLabels` and `getSuspendedMs`.
- E2E is load-sensitive: at 4 workers under load, 8 to 71 of 393 tests time out (more at 8
  workers), and every one passed when re-run with less load. Find what makes the suite slow
  under load before trusting a full run in CI.
- The packaged exe keeps Electron's RunAsNode, NODE_OPTIONS and `--inspect` fuses on. This
  predates Phase 1; turn them off in the release hardening before Steam (Phase 7 at the latest).

- A 'suspend' whose 'resume' never arrives stays open, so every later long gap is paid as
  sleep until the app restarts. This predates Phase 1 and errs toward paying less; main's
  heartbeat could close it once main is clearly running again.

For Phase 3 (corner window):

- At 320×420, a button's tooltip opens above it and can cover the button over it (Visitar's
  covers Promover's price while it has keyboard focus). The shared tooltip layer does this
  everywhere, so it is one change there, not a Team-card fix.

Original plan, for reference:

- **Purpose and player benefit:** the game people install is the packaged Windows app, and it
  has not been run natively since `a4e03ad`. This is the documented next step and the main
  release blocker, and for the first time the work environment is Windows. Players get a window,
  save, recovery and sharpness that are proven, not assumed.
- **Systems:** Electron main, preload and IPC; platform adapter; window chrome (frameless,
  resize, minimum size, always-on-top, corners, click-through, tray, single instance); saves on
  disk and recovery; time accounting under real minimize; sprite sharpness at fractional DPR.
- **Files:** `electron/*`, `src/platform/*`, `scripts/electron-*-smoke.mjs`,
  `scripts/verify-windows-packaged.mjs`, `verify-packaged-renderer.mjs`, `build-steam.mjs`,
  `verify-steam-build.mjs`, the `build` section of `package.json`, `docs/WINDOWS_TESTING.md`,
  `docs/PACKAGED_BUILD_QA.md`, and the 22 numbered checks in the state file.
- **Risks and dependencies:** the smoke scripts were last run under Xvfb on Linux and treat some
  checks as informational there (maximize/restore, late resize events); on Windows they become
  real and may fail for script reasons. electron-builder downloads its Windows tooling on first
  run. Unsigned builds trigger SmartScreen. DPI and sleep need the user. Defects found here may
  need UI or art fixes.
- **Acceptance:** `build:windows:folder`, `build:windows` and `build:steam` exit 0;
  `verify:windows:packaged`, `verify:packaged` and `verify:steam` pass; all eight `smoke:*`
  scripts pass natively, or a script defect is fixed without weakening a check; each of the 22
  numbered checks is either run by Claude with evidence or handed to the user with exact steps;
  the state file's LOCAL WINDOWS list shrinks to human-only items.
- **Tests and playtests:** the smoke and verify scripts; the packaged app played in pt-BR at
  320×420, 380×460 and 1280×720 (opening, crate, a room action, a sheet, Escape, quit and
  relaunch with the save intact); `--force-device-scale-factor` 1.25, 1.5 and 2 as a layout
  proxy before the user's real DPI pass.
- **Agents:** `desktop-performance` (runs and fixes), `qa-playtest` (independent verification),
  `ui-ux-accessibility` and `art-asset-pipeline` only for defects in their areas.

### Phase 2 — Integration and release hygiene

- **Purpose and player benefit:** make what exists trustworthy and honest. Today the language
  menu offers ten languages that are about 1% translated under their full names (choosing
  "Deutsch" gives English), the design doc's cast list names 6 of 23 and its micro-game list
  names games that are not the shipped three, `AGENTS.md` names an old repository, CI's E2E
  job was red on 8 of the last 10 chapter commits before final integration, and on this Windows
  PC the full E2E run fails 34 tests at 8 workers that all pass at 2.
- **Systems:** i18n language list and detection; CI and E2E reliability; design docs; PR #11.
- **Files:** `src/i18n/index.ts`, `src/ui/views/SettingsView.tsx`, locale `_meta`;
  `tests/e2e/minigame-rounds.spec.ts`, `office-play.spec.ts`, `event-setting.spec.ts` (causes,
  not assertions); `AGENTS.md`, `docs/GAME_DESIGN.md`; PR #11's files for review only.
- **Risks and dependencies:** the draft languages need a user decision (hide them, or label them
  as partial); language detection for players on those systems must still land on English or
  pt-BR sensibly. Merge order of the PR stack is the user's call.
- **Acceptance:** PR #11 has a `qa-playtest` verdict with real results; each named flake is
  measured before and after over at least 50 repeats with its cause fixed or documented; the
  full suite passes on this PC at a stated worker count (the cause of the 8-worker failures
  found, not hidden by longer timeouts);
  docs match the game; the language menu is honest; `validate` and full E2E green locally and
  on CI.
- **Tests and playtests:** the flaky specs on repeat; a Settings language test; rendered
  Settings at 320×420 and 1280×720 in pt-BR.
- **Agents:** `qa-playtest`, `zoo-architect` (stack landing plan), `ui-ux-accessibility`,
  `narrative-content`.

### Phase 3 — The corner window left open: long-session efficiency

- **Purpose and player benefit:** leaving the game open is an intended way to play, but its cost
  over hours has never been measured in a packaged build. Players who keep it in a corner all
  day should not feel it in their fans, battery or other apps.
- **Evidence:** a ~2,900-node office; the Team sheet's first opening ~0.85 s; 23 looping APNGs;
  ambient one-shots every 2.6–7.8 s; 13 files driving `requestAnimationFrame`; one 1.62 MB
  bundle; Electron's default background throttling.
- **Systems and files:** `src/art/OfficeScene.tsx` and room dressing, the sprite components,
  `src/ui/AnimatedNumber.tsx`, `src/audio/audio.ts`, the store's tick loop, `electron/main.ts`,
  `vite.config.ts`.
- **Risks:** Chapter 9's rule that open time is credited in full must not change; no
  flattened animation, renderer swap or hidden people; reduced motion and quiet already pause
  things and must keep doing so.
- **Acceptance:** a recorded baseline and an after for CPU while visible, occluded, minimized
  and quiet at 380×460 over 10 minutes; memory over 60 minutes (no growth trend); startup to
  first interactive frame; the Team sheet's first opening. Budgets are proposed from the
  baseline and agreed with the user. Production per hour unchanged.
- **Tests and playtests:** `timeAccounting`, `returns` and `living-office` suites stay green; a
  repeatable measurement script; the six sizes show no visual change.
- **Agents:** `desktop-performance` (lead), `art-asset-pipeline` (APNG cost),
  `simulation-economy` (only if the tick loop changes), `qa-playtest`.

### Phase 4 — Unchaptered surfaces through the player gate

- **Purpose and player benefit:** Photo Mode, Moment Card PNG export (the game's sharing hook),
  Focus Harvest, Achievements, Stats, Daily challenges and the Company file's department network
  are reachable today but were accepted before the chapter kit, are absent from `DESIGN.md`'s
  surface map and have no six-check record. Photo Mode, Focus Harvest and Moment Card export have
  no E2E spec. Every screen a player reaches should meet the office's bar.
- **Systems and files:** `src/ui/PhotoMode.tsx`, `momentCard.ts`, `momentFormats.ts`,
  `officePhoto.ts`, `views/FocusView.tsx`, `AchievementsView.tsx`, `StatsView.tsx`,
  `CompanyView.tsx`, `DepartmentNetwork.tsx`, `src/sim/dailyChallenges.ts`, `achievements.ts`,
  the platform adapter's file saving, and `DESIGN.md`'s surface map.
- **Risks:** scope creep into redesign. Rule: run the gate first, change only what fails. Focus
  Harvest must stay supportive and never punish cancelling.
- **Acceptance:** a six-check PASS record for each surface in pt-BR at the six sizes with
  keyboard, reduced motion and high contrast; a valid PNG exported in the browser and in the
  packaged app; new E2E specs for Photo Mode, Moment Card export and a Focus Harvest session;
  the surface map updated.
- **Agents:** `qa-playtest` (audit first), `ui-ux-accessibility`, `narrative-content`,
  `gameplay-progression`, `desktop-performance` (export in Electron).

### Phase 5 — Progression pacing past the first 12 minutes

- **Purpose and player benefit:** Chapter 4 measured a real 12-minute session. The design's
  targets (automation within the first hour, first restructure after several hours, unlocks
  across cycles) have never been measured. Players need close, medium and long-term reasons to
  return, without grind walls or dead zones.
- **Approach:** a deterministic headless pacing harness on the existing sim (the minigame bands
  were already calibrated this way), run over several profiles (active, corner-idle, a check-in
  every 30 minutes, closed overnight) and three cycles; compare milestone times to targets;
  tune only where the numbers show a wall. New content only if a cycle shows nothing new.
- **Files:** a new harness under `scripts/` or `tests/`, `src/sim/config.ts`, `economy.ts`,
  `goals.ts`, `nextStep.ts`, `prestige.ts`, `src/content/upgrades.ts`, `docs/BALANCING.md`.
- **Risks:** tuning changes how existing saves feel; no save-shape change; numbers must be
  confirmed in rendered play.
- **Acceptance:** a pacing report per profile against targets; every tuning backed by before
  and after numbers; economy, restructure and next-step suites green; rendered six-check spot
  checks at about 2 hours, the first restructure and early cycle 2.
- **Agents:** `simulation-economy` (lead), `gameplay-progression`, `zoo-architect` (review),
  `qa-playtest`.

### Phase 6 — Audio pass from the user's listening notes

- **Purpose and player benefit:** sound reinforces every action, but no session has heard it.
- **Dependency:** the user listens, guided by a short script built from the Blockers audio list
  and a dev-panel way to trigger each cue.
- **Files:** `src/audio/audio.ts`, `docs/AUDIO_SYSTEM.md`.
- **Acceptance:** each note answered with a change or a reason; quiet and mute behaviour
  unchanged; bus levels measured before and after.
- **Agents:** `ui-ux-accessibility`, `qa-playtest`.

### Phase 7 — Steam release packaging

- **Purpose:** ship. Depends on user decisions (app ID, price, store art, signing certificate,
  version) and on Phases 1, 2 and 6.
- **Files:** `steam/`, `scripts/build-steam.mjs`, `docs/STEAM*.md`,
  `docs/HOW_TO_PUBLISH_ON_STEAM.md`, `src/platform/achievements.ts`, `build/` icons,
  `CHANGELOG.md`, `package.json` version.
- **Acceptance:** `docs/STEAM_RELEASE_CHECKLIST.md` complete with evidence; store text in EN and
  pt-BR; achievements mapped; a packaged build verified on Windows.
- **Agents:** `desktop-performance`, `art-asset-pipeline`, `narrative-content`, `qa-playtest`.

Phases 1 and 2 touch different files and can run side by side. Phases 3 and 4 are independent
of each other.

## Deliberately not proposed

- New employees, rooms, currencies or minigames: the cast and rooms are complete and nothing
  shows a gap yet. Phase 5 is where a real content gap would surface.
- Redoing accepted chapters, replacing the renderer or restyling the identity.
- Machine-filling the ten draft locales.
