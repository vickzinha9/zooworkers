// Real-Electron smoke for window behaviour: resizable from the OS, minimum-size
// clamping, maximize/restore, and bounds persistence across a relaunch. Runs
// against the built desktop app in an isolated user-data dir so the persisted
// window-settings.json can be inspected. (The subjective "resize hitbox feel"
// is a native Windows concern that can't be measured headlessly — see the
// Windows test checklist — but everything below is verifiable here.)
import { _electron as electron } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MIN_WIDTH = 320;
const MIN_HEIGHT = 420;
// The dock's destinations (src/ui/GameDock.tsx DOCK_ITEMS): Team, Upgrades, Decorate,
// Activities and Archive. Settings is the HUD gear and the office is the screen itself.
const DOCK_DESTINATIONS = 5;
// Below this app width the dock keeps its icons and accessible names but drops the
// visible names (shell.css `@container app (max-width: 349px)`), as nav-layout.spec.ts pins.
const DOCK_LABEL_MIN_WIDTH = 350;
// Windows has a real window manager, so maximize/restore is asserted there. Under xvfb
// (no WM) the round-trip is not observable and stays informational.
const WINDOW_MANAGER = process.platform === 'win32';

// Optional: PKG_EXE (absolute path to a packaged ZooWorkers.exe) runs this whole smoke
// against the packaged app instead of dist-electron/main.cjs.
const PKG_EXE = process.env.PKG_EXE;
if (PKG_EXE && !fs.existsSync(PKG_EXE)) {
  console.error(`WINDOW SMOKE FAIL: PKG_EXE not found: ${PKG_EXE}`);
  process.exit(1);
}

function fail(msg) {
  console.error('WINDOW SMOKE FAIL:', msg);
  process.exit(1);
}

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wmno-udd-'));
// Every profile this smoke creates, removed at the end.
const profiles = [userDataDir];
function freshProfile(tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `wmno-${tag}-`));
  profiles.push(dir);
  return dir;
}

async function launch(profile = userDataDir) {
  const args = [`--user-data-dir=${profile}`, '--no-sandbox', '--disable-gpu'];
  return electron.launch({
    ...(PKG_EXE
      ? { executablePath: PKG_EXE, args }
      : { args: ['dist-electron/main.cjs', ...args] }),
    env: { ...process.env, WMNO_SMOKE: '1' },
  });
}

async function inspectRendererAt(page, width, height) {
  await app.evaluate(
    async ({ BrowserWindow }, bounds) => {
      BrowserWindow.getAllWindows()[0].setBounds(bounds);
    },
    { width, height },
  );
  await page.waitForTimeout(250);

  const report = await page.evaluate(() => {
    // b138638 replaced the letterhead, tab rail and view wrapper with a HUD shelf, a
    // dock and sheets over an always-mounted office, so each region is measured by the
    // element that now plays its role:
    const selectors = [
      'html',
      'body',
      '#root',
      '.app',
      // The window's top shelf (GameHud.tsx `<header className="hud">`), was `.header`.
      '.hud',
      // The resource strip, was `.header__strip`. Its cells now live in two places on
      // the shelf: the nuts counter (`.hud__nuts`) and the other resources'
      // stickers (`.hud__stats`), so both are measured.
      '.hud__nuts',
      '.hud__stats',
      // The navigation (GameDock.tsx `<nav className="dock">`), was the `.nav` rail.
      '.dock',
      // The playable stage (App.tsx `<main className="app__stage">`), was `.app__main`.
      '.app__stage',
      // The screen on the stage. `.view-anim` wrapped the current view, the office by
      // default; the office (OfficeScene.tsx root `.office`) is now always mounted
      // there and every other screen opens as a sheet over it.
      '.office',
    ];
    const metrics = selectors.map((selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return { selector, missing: true };
      const box = element.getBoundingClientRect();
      return {
        selector,
        missing: false,
        overflow: element.scrollWidth - element.clientWidth,
        left: box.left,
        right: box.right,
        height: box.height,
      };
    });
    const dock = document.querySelector('.dock');
    const shelf = document.querySelector('.dock__shelf');
    // Each destination is a `.dock__item` (it still carries `nav__destination` too).
    const items = [...document.querySelectorAll('.dock .dock__item')];
    const visible = (element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return (
        style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0
      );
    };
    const onScreen = (element) => {
      const box = element.getBoundingClientRect();
      return (
        box.left >= -1 &&
        box.top >= -1 &&
        box.right <= window.innerWidth + 1 &&
        box.bottom <= window.innerHeight + 1
      );
    };
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      uiScale: document.documentElement.dataset.uiScale,
      appZoom: getComputedStyle(document.querySelector('.app')).zoom,
      appChildren: [...document.querySelector('.app').children].map((element) => ({
        className: element.className,
        position: getComputedStyle(element).position,
        height: element.getBoundingClientRect().height,
      })),
      metrics,
      navCount: items.length,
      // Reachable = visible inside the window, with its icon drawn and an accessible
      // name. The visible name is not required: narrow windows drop it (see below).
      navReachable: items.filter(
        (item) =>
          visible(item) &&
          onScreen(item) &&
          Boolean(item.getAttribute('aria-label')) &&
          Boolean(item.querySelector('.ui-icon')),
      ).length,
      // Per-destination sizes, as nav-layout.spec.ts measures them.
      navItems: items.map((item) => {
        const box = item.getBoundingClientRect();
        const label = item.querySelector('.dock__label');
        return {
          name: item.getAttribute('aria-label'),
          width: Math.round(box.width),
          height: Math.round(box.height),
          iconWidth: Math.round(item.querySelector('.ui-icon')?.getBoundingClientRect().width ?? 0),
          labelVisible: label ? visible(label) : false,
          labelClipped: label ? label.scrollWidth > label.clientWidth + 1 : false,
        };
      }),
      // Any disclosure inside the dock would be an overflow menu. The rail's old
      // `.nav__more-*` menu is still looked for in case it ever comes back.
      navOverflowControls: document.querySelectorAll(
        '.nav__more-toggle, .nav__more-panel, .dock [aria-haspopup], .dock [aria-expanded]',
      ).length,
      navScroll: Math.max(
        dock ? dock.scrollWidth - dock.clientWidth : 0,
        shelf ? shelf.scrollWidth - shelf.clientWidth : 0,
      ),
      documentScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      // The dock sits at the very bottom of the window.
      dockBottomGap: dock ? window.innerHeight - dock.getBoundingClientRect().bottom : null,
      navRows: new Set(items.map((item) => Math.round(item.getBoundingClientRect().top))).size,
      controls: document.querySelectorAll('.window-controls .wc-btn').length,
      mainHeight: document.querySelector('.app__stage')?.getBoundingClientRect().height ?? 0,
    };
  });

  for (const metric of report.metrics) {
    if (metric.missing) fail(`${metric.selector} missing at ${width}x${height}`);
    if (metric.overflow > 6) {
      fail(`${metric.selector} overflows by ${metric.overflow}px at ${width}x${height}`);
    }
    if (metric.left < -1 || metric.right > report.viewport.width + 1) {
      fail(`${metric.selector} escapes viewport at ${width}x${height}: ${JSON.stringify(metric)}`);
    }
  }
  // Every destination present and directly reachable, in real Electron.
  //
  // The eleven-tab rail became a five-item dock (b138638): fewer, bigger targets on
  // one row at every size, with names wherever they fit and accessible names
  // everywhere. tests/e2e/nav-layout.spec.ts pins that contract across eleven
  // viewports; this is the same contract asserted against the packaged renderer.
  if (report.navCount !== DOCK_DESTINATIONS || report.navReachable !== DOCK_DESTINATIONS) {
    fail(`navigation is not fully reachable at ${width}x${height}: ${JSON.stringify(report)}`);
  }
  if (report.navRows !== 1) {
    fail(`navigation must stay on one row at ${width}x${height}: ${JSON.stringify(report)}`);
  }
  // No destination may hide behind an overflow menu or a horizontal scroll gesture.
  if (report.navOverflowControls !== 0 || report.navScroll > 2 || report.documentScroll > 2) {
    fail(`navigation hides destinations at ${width}x${height}: ${JSON.stringify(report)}`);
  }
  if (report.dockBottomGap === null || Math.abs(report.dockBottomGap) > 1) {
    fail(
      `dock is not at the bottom of the window at ${width}x${height}: ${JSON.stringify(report)}`,
    );
  }
  const labelled = report.viewport.width >= DOCK_LABEL_MIN_WIDTH;
  for (const item of report.navItems) {
    // Comfortable targets: a companion window is often driven by a trackpad.
    if (item.width < 44 || item.height < 38 || item.iconWidth < 18) {
      fail(`dock target too small at ${width}x${height}: ${JSON.stringify(item)}`);
    }
    if (labelled ? !item.labelVisible || item.labelClipped : item.labelVisible) {
      fail(
        `dock name ${labelled ? 'missing or clipped' : 'should give way'} at ${width}x${height}: ${JSON.stringify(item)}`,
      );
    }
  }
  if (report.controls !== 3) {
    fail(`desktop window controls missing at ${width}x${height}: ${JSON.stringify(report)}`);
  }
  if (report.mainHeight < 70) {
    fail(`playable region is too short at ${width}x${height}: ${JSON.stringify(report)}`);
  }
  console.log(
    `WINDOW SMOKE: renderer contained at ${width}x${height}`,
    JSON.stringify(report.viewport),
  );
}

// --- first launch: exercise resize, clamp, maximize/restore, set a size ---
let app = await launch();
{
  const page = await app.firstWindow({ timeout: 20000 });
  await page.waitForLoadState('domcontentloaded');
  await page.locator('.dock').waitFor({ state: 'visible', timeout: 20000 });

  // Exercise the real Electron renderer (including custom window controls) at
  // the native minimum/default, compact square, and wide-short acceptance sizes.
  for (const [rendererWidth, rendererHeight] of [
    [320, 420],
    [380, 460],
    [520, 520],
    [900, 420],
  ]) {
    await inspectRendererAt(page, rendererWidth, rendererHeight);
  }

  // Phase 1: resizable + min-clamp + maximize/restore round-trip. (Maximize is
  // WM-dependent: asserted on Windows, informational only under xvfb.)
  const info = await app.evaluate(async ({ BrowserWindow, screen }) => {
    const w = BrowserWindow.getAllWindows()[0];
    // Wait for the window manager to report the requested state, for at most 3 s
    // (xvfb never does).
    const settle = (predicate) =>
      new Promise((resolve) => {
        const started = Date.now();
        const poll = () => {
          if (predicate() || Date.now() - started > 3000) resolve(predicate());
          else setTimeout(poll, 50);
        };
        poll();
      });
    const resizable = w.isResizable();
    w.setSize(120, 120);
    const clamped = w.getSize();
    w.maximize();
    const maxed = await settle(() => w.isMaximized());
    const maxedSize = w.getSize();
    w.unmaximize();
    // `restored` keeps its old meaning: still maximized after unmaximize() (bad).
    const restored = !(await settle(() => !w.isMaximized()));
    const restoredSize = w.getSize();
    return {
      resizable,
      clamped,
      maxed,
      maxedSize,
      restored,
      restoredSize,
      scaleFactor: screen.getDisplayMatching(w.getBounds()).scaleFactor,
      workArea: screen.getDisplayMatching(w.getBounds()).workArea,
    };
  });
  // Let any async resize from the maximize/unmaximize dance settle so it can't
  // overwrite the persisted size below (xvfb emits these late).
  await page.waitForTimeout(600);
  // Phase 2: set the size to persist LAST, in isolation.
  const info2 = await app.evaluate(async ({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    w.setBounds({ width: 720, height: 640 });
    return { set: w.getSize() };
  });
  info.set = info2.set;

  if (!info.resizable) fail('window is not resizable');
  if (info.clamped[0] < MIN_WIDTH || info.clamped[1] < MIN_HEIGHT) {
    fail(`min-size not enforced: got ${info.clamped}`);
  }
  if (info.set[0] !== 720) fail(`setSize width not applied: ${info.set}`);
  // maximize/restore depend on a real window manager. Windows has one, so the
  // round-trip must maximize (to a larger size) and come back to the exact
  // pre-maximize size. xvfb has none, so there it stays best-effort and only warns.
  if (WINDOW_MANAGER) {
    if (!info.maxed) fail(`maximize() did not maximize the window: ${JSON.stringify(info)}`);
    if (!(info.maxedSize[0] > info.clamped[0] && info.maxedSize[1] > info.clamped[1])) {
      fail(`maximized window is not larger than the restored one: ${JSON.stringify(info)}`);
    }
    if (info.restored) fail(`unmaximize() left the window maximized: ${JSON.stringify(info)}`);
    if (info.restoredSize[0] !== info.clamped[0] || info.restoredSize[1] !== info.clamped[1]) {
      fail(`restore did not return to the pre-maximize size: ${JSON.stringify(info)}`);
    }
  } else if (!info.maxed || info.restored) {
    console.log(
      'WINDOW SMOKE NOTE: maximize/restore not observable under xvfb (no WM) —',
      JSON.stringify(info),
    );
  }

  // Give the debounced bounds-persist (400ms) time to write.
  await page.waitForTimeout(1600);
  console.log('WINDOW SMOKE: resize/clamp/maximize/restore OK', JSON.stringify(info));
}
await app.close();

// Persistence is asserted against the WRITTEN settings file — deterministic and
// free of the WM-less show/resize distortions that skew getSize() under xvfb.
const settingsFile = path.join(userDataDir, 'window-settings.json');
const persisted = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
if (persisted.width !== 720 || persisted.height !== 640) {
  fail(
    `bounds not persisted to disk: ${JSON.stringify({ width: persisted.width, height: persisted.height })}`,
  );
}
console.log(
  'WINDOW SMOKE: bounds persisted to disk OK',
  JSON.stringify({ width: persisted.width, height: persisted.height }),
);

// --- relaunch: the app reopens and the persisted size is still on disk ---
app = await launch();
{
  await app.firstWindow({ timeout: 20000 });
  const alive = await app.evaluate(async ({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    return !!w && !w.isDestroyed() && w.isResizable();
  });
  if (!alive) fail('window did not reopen (resizable) after relaunch');
  const stillPersisted = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
  if (stillPersisted.width !== 720)
    fail(`persisted width lost after relaunch: ${stillPersisted.width}`);
  console.log('WINDOW SMOKE: relaunched with persisted bounds intact OK');
}
// Wait for Electron and its profile handles to close before removing the fixture.
await app.close();

// ---------------------------------------------------------------------------
// Where the window reopens, and the tray menu's language.
// Positions only mean something under a real window manager, so these phases are
// asserted on Windows and skipped (with a note) under xvfb.
// ---------------------------------------------------------------------------
const CORNER_MARGIN = 16; // electron/windowPlacement.ts
const BASE_SIZE = { width: 380, height: 460 };
const TRAY_EN = ['Show', 'Hide', 'Quiet Mode', 'Settings…', 'Quit'];
const TRAY_PT = ['Mostrar', 'Esconder', 'Modo Silencioso', 'Ajustes…', 'Sair'];
// A returning company in English: no opening sequence over the HUD and its ✕.
const OFFICE_SAVE = {
  version: 6,
  onboardingComplete: true,
  lastSaved: Date.now(),
  resources: { nuts: 100000, goldenNuts: 5, reputation: 200, morale: 80, permanentKernels: 0 },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const settingsOf = (profile) => path.join(profile, 'window-settings.json');
function readSettings(profile) {
  try {
    return JSON.parse(fs.readFileSync(settingsOf(profile), 'utf-8'));
  } catch {
    return null;
  }
}
const savedBounds = (s) => (s ? { x: s.x, y: s.y, width: s.width, height: s.height } : null);
const sameBounds = (a, b) =>
  Boolean(a && b) && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
const inside = (b, a) =>
  b.x >= a.x && b.y >= a.y && b.x + b.width <= a.x + a.width && b.y + b.height <= a.y + a.height;

async function poll(read, ok, timeout = 5000) {
  const started = Date.now();
  let value = await read();
  while (!ok(value) && Date.now() - started < timeout) {
    await sleep(100);
    value = await read();
  }
  return value;
}

async function windowState(electronApp) {
  return electronApp.evaluate(({ BrowserWindow, screen }) => {
    const w = BrowserWindow.getAllWindows()[0];
    const bounds = w.getBounds();
    return {
      bounds,
      minimized: w.isMinimized(),
      maximized: w.isMaximized(),
      workArea: screen.getDisplayMatching(bounds).workArea,
      workAreas: screen.getAllDisplays().map((display) => display.workArea),
    };
  });
}

/** The game on screen; `seed` makes it a returning English company first. */
async function openGame(electronApp, { seed = false } = {}) {
  const page = await electronApp.firstWindow({ timeout: 20000 });
  await page.waitForLoadState('domcontentloaded');
  if (seed) {
    // Seeded on every document start, so the first boot cannot overwrite it on reload.
    await page.addInitScript((save) => {
      localStorage.setItem('wmno.save.v1', JSON.stringify(save));
      localStorage.setItem('wmno.lang', 'en');
    }, OFFICE_SAVE);
    await page.reload();
  }
  await page.locator('.office').first().waitFor({ timeout: 20000 });
  return page;
}

/** Closes the way a player does: the HUD's ✕ (WindowControls.tsx), then waits for exit. */
async function closeWithControl(electronApp, page) {
  const exited = electronApp.waitForEvent('close', { timeout: 20000 });
  await page
    .locator('.wc-btn--close')
    .click()
    .catch((error) => {
      // The page can go away while the click settles; the quit is what is checked.
      if (!/closed|destroyed/i.test(String(error))) throw error;
    });
  await exited;
}

function expectBottomRight(state, size, when) {
  const area = state.workArea;
  const expected = {
    x: area.x + area.width - size.width - CORNER_MARGIN,
    y: area.y + area.height - size.height - CORNER_MARGIN,
    ...size,
  };
  if (!sameBounds(state.bounds, expected)) {
    fail(
      `${when}: not at the bottom-right corner of its display: ${JSON.stringify(state.bounds)}, ` +
        `expected ${JSON.stringify(expected)} (work area ${JSON.stringify(area)})`,
    );
  }
}

/** The labels of the menu main last gave the tray (separators left out). */
async function trayMenuLabels(electronApp) {
  return electronApp.evaluate(() => {
    const menu = globalThis.__zwTrayMenu;
    return menu
      ? menu.items.filter((item) => item.type !== 'separator').map((item) => item.label)
      : null;
  });
}

async function expectTray(electronApp, expected, when) {
  const same = (labels) => JSON.stringify(labels) === JSON.stringify(expected);
  const labels = await poll(() => trayMenuLabels(electronApp), same, 8000);
  if (!same(labels)) {
    fail(`tray menu ${when}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(labels)}`);
  }
  console.log(`WINDOW SMOKE: tray menu ${when}:`, JSON.stringify(labels));
}

/** Changes the game's language the way a player does: Settings > General > Language. */
async function chooseLanguage(page, lang) {
  await page.locator('.hud__settings').click();
  await page.locator('.settings-tab[data-tab="general"]').click();
  await page.locator('#settings-language select').selectOption(lang);
  await page.locator('.sheet__close').click();
  await page.locator('.sheet').waitFor({ state: 'detached', timeout: 10000 });
}

/** Runs `action` on the main window and waits until `settled` holds (3 s at most). */
async function windowAction(electronApp, action, settled) {
  return electronApp.evaluate(
    async ({ BrowserWindow }, { action: name, settled: until }) => {
      const w = BrowserWindow.getAllWindows()[0];
      w[name]();
      const started = Date.now();
      const check = () =>
        until === 'minimized'
          ? w.isMinimized()
          : until === 'maximized'
            ? w.isMaximized()
            : !w.isMinimized() && !w.isMaximized();
      while (!check() && Date.now() - started < 3000) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return { ok: check(), bounds: w.getBounds() };
    },
    { action, settled },
  );
}

// Longer than the 400 ms bounds-save debounce in main.ts, so any save has landed.
const SETTLE_MS = 1200;

if (!WINDOW_MANAGER) {
  console.log(
    'WINDOW SMOKE NOTE: placement across relaunches and the tray menu need a window manager;',
    'skipped under xvfb.',
  );
} else {
  // --- 1. Move, close with ✕, relaunch: the same place (on every display) ---------
  // The tray menu is checked here too: English first, then pt-BR once the player picks
  // it in Settings, then pt-BR straight away on the next launch.
  const moved = freshProfile('move');
  app = await launch(moved);
  let page = await openGame(app, { seed: true });
  await expectTray(app, TRAY_EN, 'in English');
  await chooseLanguage(page, 'pt-BR');
  await expectTray(app, TRAY_PT, 'after the player chose pt-BR');

  const { workAreas } = await windowState(app);
  // One spot on each connected display: neither a corner nor the centre.
  const targets = workAreas.map((area) => ({
    x: area.x + 137,
    y: area.y + 91,
    width: 404,
    height: 512,
  }));
  for (const [index, target] of targets.entries()) {
    const where = `display ${index + 1} of ${targets.length}`;
    await app.evaluate(
      ({ BrowserWindow }, b) => BrowserWindow.getAllWindows()[0].setBounds(b),
      target,
    );
    const afterMove = await poll(
      () => readSettings(moved),
      (s) => sameBounds(savedBounds(s), target),
    );
    if (!sameBounds(savedBounds(afterMove), target)) {
      fail(
        `moving to ${where} was not remembered: ${JSON.stringify(afterMove)} vs ${JSON.stringify(target)}`,
      );
    }

    // Minimized, Windows parks the window near -32000: that must never be saved.
    const minimized = await windowAction(app, 'minimize', 'minimized');
    if (!minimized.ok) fail(`minimize() did not minimize on ${where}`);
    await sleep(SETTLE_MS);
    const whileMinimized = readSettings(moved);
    if (!sameBounds(savedBounds(whileMinimized), target)) {
      fail(
        `minimizing on ${where} changed the remembered bounds: ${JSON.stringify(whileMinimized)} ` +
          `(minimized getBounds ${JSON.stringify(minimized.bounds)})`,
      );
    }
    const restored = await windowAction(app, 'restore', 'normal');
    if (!restored.ok || !sameBounds(restored.bounds, target)) {
      fail(
        `restore on ${where} did not come back to ${JSON.stringify(target)}: ${JSON.stringify(restored)}`,
      );
    }

    // Maximized: the remembered bounds stay the ones it restores to.
    const maximized = await windowAction(app, 'maximize', 'maximized');
    if (!maximized.ok) fail(`maximize() did not maximize on ${where}`);
    await sleep(SETTLE_MS);
    const whileMaximized = readSettings(moved);
    if (!sameBounds(savedBounds(whileMaximized), target) || whileMaximized.maximized !== true) {
      fail(
        `maximizing on ${where} lost the normal bounds or the flag: ${JSON.stringify(whileMaximized)} ` +
          `(maximized getBounds ${JSON.stringify(maximized.bounds)})`,
      );
    }
    const unmaximized = await windowAction(app, 'unmaximize', 'normal');
    if (!unmaximized.ok || !sameBounds(unmaximized.bounds, target)) {
      fail(
        `unmaximize on ${where} did not come back to ${JSON.stringify(target)}: ${JSON.stringify(unmaximized)}`,
      );
    }
    await sleep(SETTLE_MS);
    if (readSettings(moved)?.maximized !== false)
      fail(`unmaximize on ${where} kept maximized: true`);
    console.log(
      `WINDOW SMOKE: ${where}: minimize (parked at ${JSON.stringify(minimized.bounds)}) and ` +
        `maximize kept the remembered bounds`,
      JSON.stringify(target),
    );

    await closeWithControl(app, page);
    const onClose = readSettings(moved);
    if (!sameBounds(savedBounds(onClose), target)) {
      fail(
        `closing with ✕ on ${where} saved ${JSON.stringify(onClose)}, not ${JSON.stringify(target)}`,
      );
    }
    app = await launch(moved);
    page = await openGame(app);
    const reopened = await windowState(app);
    if (!sameBounds(reopened.bounds, target)) {
      fail(
        `relaunch did not reopen where the window was closed on ${where}: ` +
          `${JSON.stringify(reopened.bounds)}, expected ${JSON.stringify(target)}`,
      );
    }
    console.log(
      `WINDOW SMOKE: ${where}: closed with ✕ and reopened at the same place OK`,
      JSON.stringify(reopened.bounds),
    );
    if (index === 0) await expectTray(app, TRAY_PT, 'at start of a pt-BR relaunch');
  }
  await app.close();

  // --- 2. A first launch nobody moves, closed with ✕ and relaunched: still at the corner
  const untouched = freshProfile('corner');
  app = await launch(untouched);
  page = await openGame(app, { seed: true });
  const first = await windowState(app);
  expectBottomRight(first, BASE_SIZE, 'first launch');
  await closeWithControl(app, page);
  if (!sameBounds(savedBounds(readSettings(untouched)), first.bounds)) {
    fail(`closing did not remember the corner spot: ${JSON.stringify(readSettings(untouched))}`);
  }
  app = await launch(untouched);
  page = await openGame(app);
  const second = await windowState(app);
  if (!sameBounds(second.bounds, first.bounds)) {
    fail(
      `relaunch moved the window: ${JSON.stringify(second.bounds)} vs ${JSON.stringify(first.bounds)}`,
    );
  }
  expectBottomRight(second, BASE_SIZE, 'relaunch');
  console.log(
    'WINDOW SMOKE: unmoved window reopened at its corner OK',
    JSON.stringify(second.bounds),
  );
  await app.close();

  // --- 3. A remembered spot no display can show any more: it lands fully on screen --
  // Far off every display, then a 10 px sliver past the right edge of the rightmost
  // display (what an unplugged monitor on the right leaves behind). Both fall back to
  // the bottom-right corner, at the remembered size.
  const offscreen = freshProfile('offscreen');
  const remembered = { width: 520, height: 600 };
  const rightmost = workAreas.reduce((a, b) => (a.x + a.width >= b.x + b.width ? a : b));
  const lostSpots = [
    { x: 50000, y: 50000, why: 'far off every display' },
    {
      x: rightmost.x + rightmost.width - 10,
      y: rightmost.y + 100,
      why: 'a sliver past the rightmost display',
    },
  ];
  for (const spot of lostSpots) {
    fs.writeFileSync(
      settingsOf(offscreen),
      JSON.stringify({ corner: 'bottom-right', x: spot.x, y: spot.y, ...remembered }),
    );
    fs.rmSync(path.join(offscreen, 'startup.log'), { force: true });
    app = await launch(offscreen);
    await app.firstWindow({ timeout: 20000 });
    const landed = await windowState(app);
    if (!landed.workAreas.some((area) => inside(landed.bounds, area))) {
      fail(`saved spot ${spot.why} reopened off screen: ${JSON.stringify(landed)}`);
    }
    expectBottomRight(landed, remembered, `saved spot ${spot.why}`);
    const startupLog = fs.readFileSync(path.join(offscreen, 'startup.log'), 'utf-8');
    if (!/window placement: corner /.test(startupLog)) {
      fail(`startup.log does not record the corner fallback for ${spot.why}`);
    }
    console.log(
      `WINDOW SMOKE: saved spot ${spot.why} landed on screen OK`,
      JSON.stringify(landed.bounds),
    );
    await app.close();
  }
}

fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
// The other profiles are only cleanup: Chromium may hold one a moment after exit.
for (const profile of profiles.slice(1)) {
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
  } catch (error) {
    console.warn(`WINDOW SMOKE WARN: could not remove ${profile} (${error.code ?? error.message})`);
  }
}
console.log('WINDOW SMOKE OK');
