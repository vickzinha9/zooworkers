# ZooWorkers — Claude Code project instructions

@AGENTS.md

`AGENTS.md` (imported above) is the permanent execution contract written for the earlier Kiro
setup. Its game rules, boundaries and quality bar apply here unchanged. Where it names Kiro
tooling or conflicts with this file, this file wins for Claude Code sessions.

## Identity (non-negotiable)

A cozy, funny, slightly strange clicker/idle PC game in a small resizable desktop window.
Nutshell Inc. is a warm, suspicious, absurd behavioral-research company. Keep:

- all 23 employees (IDs, APNGs, posters, registry geometry, repaired Pip), natural proportions,
  uniform scale against Pip, and **at most 4 employees per room** in assignment, sim, save
  migration and rendering alike;
- the established art direction, palette roles (green action, gold reward, purple rare only),
  economy roles (nuts, golden nuts, morale, reputation, kernels: no new currency) and saves;
- the corner-window experience: 30-second, 2–5-minute and 10–20-minute visits, plus leaving it
  open as a rewarded, intended way to play.

Never turn it into a generic dashboard, swap the renderer/framework, or redesign its identity
without a clear, user-approved reason. Completed chapters (1, 4, 9, 2, 3, 5, 6, 7, 8, 10, final
integration) are accepted: do not redo them or rebuild systems that already exist.

## Repository and branches

- Canonical repo: `https://github.com/vickzinha9/zooworkers` (repo id 1292934095). The old
  `lulinha143/claude` URL redirects to it. `AGENTS.md`'s "contatoleonardoorrutia-oss/claude"
  line is stale. Never create a fork or a new repo, and never change `origin`.
- This repo also holds unrelated projects' branches (`hexatombe-tcg-catalogo-v1`,
  `heavy-baggage-game`, `working-my-nuts-off`, `feat/gerador-dataset-ficticio`,
  `fix/target-zone-vertical`). Never touch them. The user's separate `vickzinha9/claude` repo is
  a different project.
- ZooWorkers lives in a stack of unmerged PRs: `main` holds only a README. Delivery branch is
  `feat/zooworkers-3.0-facility-pass` (PR #9, base `feat/zooworkers-2.0-master-pass`). Work that
  builds on it may sit on its own branch stacked on it (as PR #11 does).
- **Ask first, every time:** merging, force-pushing, rewriting history, deleting branches,
  changing a PR's base, pushing to `main`, or any other destructive or outward-facing step.
- Commit and push (never force) only when the user's request for that task includes it.
  Otherwise leave changes uncommitted and say so. Stage only task-owned files. Preserve
  uncommitted user changes; never reset, discard or revert existing good work.

## Read before implementing

1. `docs/ZOOWORKERS_STATE.md`: branch, accepted chapters, known gaps, the Blockers list and the
   numbered native-Windows checks. Read it once per task, then only the relevant record.
2. `DESIGN.md`: visual and interaction authority. Read only the relevant sections.
3. `docs/GAME_DESIGN.md`: systems and rules as implemented (its cast and micro-game lists are
   partly out of date; the code and the state file win).
4. Steering, by area: `.kiro/steering/simulation.md` (`src/sim`, `src/save`, `src/content`,
   `src/state`), `.kiro/steering/visual.md` (`src/art`, `src/ui`, `src/styles.css`),
   `.kiro/steering/qa.md` (closing a chapter). Player gate:
   `.kiro/skills/zooworkers-playtest/SKILL.md`.
5. `docs/ROADMAP.md`: the proposed phase order (follow it only once the user approves a phase).
6. Topic docs in `docs/` as needed (`MINIGAMES.md`, `BALANCING.md`, `CHARACTER_SPRITES.md`,
   `LOCALIZATION.md`, `WINDOWS_TESTING.md`, `PACKAGED_BUILD_QA.md`, Steam docs).

Ignore Kiro-only setup: `.kiro/agents/*.json`, `templates/`, model-picking notes and Linux
sandbox drift notes in the state file.

## Architecture and conventions

- Boundaries: rules in `src/sim` (deterministic, seeded RNG, no React/Electron/DOM), authored
  data in `src/content`, versioned state in `src/save` (schema, migrations; `SAVE_VERSION` in
  `src/sim/config.ts`), orchestration in `src/state`, React UI in `src/ui`, scene and asset
  registries in `src/art`, desktop APIs in `electron/` and `src/platform` (contextIsolation,
  preload, CSP stay intact).
- One economy, clock, relationship store, event queue and save system. Prefer derived state.
  Persisted fields need schema defaults or migrations and old-save tests.
- Every player-facing string is an i18n key in `src/i18n/locales/en.json` and `pt-BR.json`.
  pt-BR is the primary QA language. The other 10 locales are drafts that fall back to English.
- TypeScript strict, Prettier (single quotes, width 100), ESLint with zero warnings. Content as
  data. No dead UI, placeholder interactions, fake rewards or `TODO` in core systems.
- Keep dependencies and the lockfile unless a concrete need justifies a change. No secrets,
  certificates or personal paths in committed files. Master artwork is gitignored and recorded
  by SHA-256; never overwrite it.

## Workflow

UNDERSTAND → PLAN → IMPLEMENT → TEST → PLAYTEST → FIX → VALIDATE → DOCUMENT.

- Plan at most five outcomes, finish every in-scope outcome, and stop at the task boundary.
- Tests: relevant Vitest (`tests/*.test.ts[x]`) and Playwright (`tests/e2e/*.spec.ts`) while
  working; near the end `npm run validate` once (typecheck, lint, i18n, assets, unit, build),
  then relevant `npm run test:e2e` specs; `npm run build:desktop` when desktop code changes.
- Playtest the changed flow in the rendered game (pt-BR) through the normal player path, at
  320×420, 380×460, 800×600, 1280×720, 1440×900 and 1920×1080 where layout is affected, plus
  keyboard, reduced motion and high contrast where relevant. Inspect screenshots one at a time;
  keep raw artifacts in the ignored `visual-artifacts/`.
- This machine is native Windows, so `build:windows:folder`, `verify:windows:packaged` and the
  `smoke:*` scripts can actually run here. Display scaling, sleep/resume, multi-monitor, audio
  listening and physical touch still need the user.
- Document: a concise record in `docs/ZOOWORKERS_STATE.md` (evidence, blockers, next step), and
  `docs/GAME_DESIGN.md` or `docs/HOW_TO_PLAY_THE_GAME.md` when rules or player steps change.

## Honest reporting

Report real commands, exit codes and counts; never assumed results. Never weaken, skip or delete
an assertion, or refresh a visual baseline, to make a check pass. Flaky tests are reported with
their measured rate. Blocked rendered play is **PLAYTEST UNVERIFIED**; unheard sound is **AUDIO
LISTENING REQUIRED**; unrun native checks are **LOCAL WINDOWS VERIFICATION REQUIRED**. None of
them is ever recorded as passed.

## Specialist team (`.claude/agents/`)

The lead session is the architect-integrator and the only one who commits, pushes or touches
branches. Specialists: `zoo-architect` and `qa-playtest` (read-only), `simulation-economy`,
`gameplay-progression`, `narrative-content`, `ui-ux-accessibility`, `art-asset-pipeline`,
`desktop-performance`.

- Use a specialist when its expertise improves the result, not to raise call counts. This
  replaces `AGENTS.md`'s "one primary agent" line for Claude Code.
- Run independent research, audits and reviews in parallel. Give each implementer explicit file
  ownership and acceptance criteria; never let two agents edit the same file at once.
- Weigh each feature across gameplay, simulation, UI, narrative, art, accessibility, saves and
  regression risk. Have `qa-playtest` independently review important changes before they land.
- Review every specialist's output before integrating it; specialists never commit, push,
  merge, switch branches or open PRs.
