// Real-Electron smoke for the suspend record behind the welcome-back note. A minimized
// window can go minutes without a timer, so the game asks the desktop shell how much of
// a long gap the computer was REALLY suspended. This drives powerMonitor 'suspend' and
// 'resume' in the main process and asks the preload bridge (window.desktop) from the
// page, exactly as the game's suspend oracle does (src/main.tsx -> platform adapter).
//
// Runs the built desktop app (dist-electron/main.cjs + dist/), or the packaged exe when
// PKG_EXE is set.
import { _electron as electron } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PKG_EXE = process.env.PKG_EXE;
if (PKG_EXE && !fs.existsSync(PKG_EXE)) {
  console.error(`SUSPEND SMOKE FAIL: PKG_EXE not found: ${PKG_EXE}`);
  process.exit(1);
}
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wmno-suspend-'));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fail(msg) {
  console.error('SUSPEND SMOKE FAIL:', msg);
  process.exit(1);
}

const args = [`--user-data-dir=${profile}`, '--no-sandbox', '--disable-gpu'];
const app = await electron.launch({
  ...(PKG_EXE ? { executablePath: PKG_EXE, args } : { args: ['dist-electron/main.cjs', ...args] }),
  env: { ...process.env, WMNO_SMOKE: '1' },
});

/** Emits a powerMonitor event in main; returns the Date.now() window it happened in. */
async function power(event) {
  return app.evaluate(({ powerMonitor }, name) => {
    const before = Date.now();
    powerMonitor.emit(name);
    return { before, after: Date.now() };
  }, event);
}

/** What the page's bridge answers for [from, to]: a number, null, or 'rejected'. */
async function ask(page, from, to) {
  return page.evaluate(
    ([f, t]) =>
      window.desktop.getSuspendedMs(f, t).then(
        (ms) => ms,
        () => 'rejected',
      ),
    [from, to],
  );
}

function expectBetween(value, low, high, what) {
  if (typeof value !== 'number' || value < low || value > high) {
    fail(`${what}: expected ${low}..${high} ms, got ${JSON.stringify(value)}`);
  }
  console.log(`SUSPEND SMOKE: ${what}: ${value} ms (expected ${low}..${high})`);
}

function expectUnknown(value, what) {
  if (value !== null) fail(`${what}: expected null (unknown), got ${JSON.stringify(value)}`);
  console.log(`SUSPEND SMOKE: ${what}: null (unknown)`);
}

try {
  const page = await app.firstWindow({ timeout: 25000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => typeof window.desktop?.getSuspendedMs === 'function', null, {
    timeout: 20000,
  });

  // Main starts recording before it creates the window, so from here on it can vouch.
  const covered = Date.now();
  await sleep(300);
  expectBetween(await ask(page, covered, Date.now()), 0, 0, 'nothing recorded yet');
  // Before recording started it cannot know: a sleep then would be forgotten.
  expectUnknown(await ask(page, covered - 3_600_000, Date.now()), 'a span from before recording');
  expectUnknown(await ask(page, Date.now(), covered), 'a span ending before it starts');

  // One sleep of about 1.5 s. Main stamps each event with its own Date.now(), somewhere
  // inside the [before, after] window power() reports.
  const suspend = await power('suspend');
  await sleep(1500);
  // Still asleep when asked: it counts up to the end of the asked span.
  const openTo = Date.now();
  expectBetween(
    await ask(page, covered, openTo),
    openTo - suspend.after,
    openTo - suspend.before,
    'a suspension with no resume yet, up to the end of the span',
  );
  const resume = await power('resume');
  const slept = { min: resume.before - suspend.after, max: resume.after - suspend.before };

  expectBetween(
    await ask(page, covered, resume.after + 60_000),
    slept.min,
    slept.max,
    'a span holding the whole sleep',
  );
  expectBetween(
    await ask(page, suspend.after + 500, resume.after + 60_000),
    slept.min - 500,
    slept.max - 500,
    'a span starting 500 ms into the sleep',
  );
  expectBetween(
    await ask(page, covered, suspend.before + 700),
    700 - (suspend.after - suspend.before),
    700,
    'a span ending 700 ms into the sleep',
  );
  expectBetween(await ask(page, covered, suspend.before - 1), 0, 0, 'a span before the sleep');

  // A resume with no suspend before it changes nothing.
  await power('resume');
  expectBetween(
    await ask(page, covered, Date.now() + 60_000),
    slept.min,
    slept.max,
    'after a stray resume',
  );

  // A second, shorter sleep adds up with the first.
  const suspend2 = await power('suspend');
  await sleep(400);
  const resume2 = await power('resume');
  expectBetween(
    await ask(page, covered, Date.now() + 60_000),
    slept.min + (resume2.before - suspend2.after),
    slept.max + (resume2.after - suspend2.before),
    'two sleeps in one span',
  );

  // Main validates the arguments: two finite numbers, or the call is rejected.
  for (const [from, to, what] of [
    [Number.NaN, covered, 'NaN'],
    [covered, Number.POSITIVE_INFINITY, 'Infinity'],
    ['yesterday', covered, 'a string'],
    [null, covered, 'null'],
  ]) {
    const answer = await ask(page, from, to);
    if (answer !== 'rejected') fail(`main accepted ${what} as a time: ${JSON.stringify(answer)}`);
  }
  console.log('SUSPEND SMOKE: main rejected NaN, Infinity, a string and null');

  const startupLog = fs.readFileSync(path.join(profile, 'startup.log'), 'utf-8');
  const suspends = (startupLog.match(/system suspend\./g) || []).length;
  const resumes = (startupLog.match(/system resume\./g) || []).length;
  if (/wall clock jump/.test(startupLog))
    fail('main noticed a wall-clock jump that did not happen');
  if (suspends !== 2 || resumes !== 3) {
    fail(`startup.log should record 2 suspends and 3 resumes, has ${suspends} and ${resumes}`);
  }
  console.log('SUSPEND SMOKE OK: main records real suspensions and the bridge reports them.');
} finally {
  await app.close();
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
  } catch (error) {
    console.warn(
      `SUSPEND SMOKE WARN: could not remove ${profile} (${error.code ?? error.message})`,
    );
  }
}
