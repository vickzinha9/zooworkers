// Reproduces the real Windows failure condition on Linux: an install path that
// contains a space and parentheses (the user's ".../claude-... (1)/..." folder).
// The old loadFile produced a malformed file URL for such paths and failed with
// ERR_FAILED (-2); the pathToFileURL fix must load the renderer regardless.
// It builds its own copy of dist/ + dist-electron/ + package.json inside a
// spaced/parenthesized temp dir (node_modules symlinked), then launches from
// there. Requires `npm run build:desktop` to have produced dist/ + dist-electron/.
import { _electron as electron } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'wmno-spaced-'));
// A path segment with a space AND parentheses, mirroring the user's "... (1)".
const dir = path.join(base, 'game build (1)', 'claude app');
const junction = path.join(dir, 'node_modules');

// Cleanup only; it is not what this smoke verifies. On Windows, Chromium's helper
// processes release the temp profile (and the launch cwd) a few seconds after
// app.close(), so removal is retried for a while and a final failure only warns.
// The node_modules link is removed on its own first, and the recursive removal of
// the fixture runs only once that link is confirmed gone, so it can never reach the
// repository's real node_modules.
const CLEANUP_BUDGET_MS = 20_000;
const CLEANUP_RETRY_MS = 500;
const RETRYABLE = new Set(['EPERM', 'EBUSY', 'ENOTEMPTY', 'EACCES']);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let cleanupAttempts = 0;
async function retrying(action) {
  const deadline = Date.now() + CLEANUP_BUDGET_MS;
  for (;;) {
    cleanupAttempts += 1;
    try {
      action();
      return null;
    } catch (error) {
      if (!RETRYABLE.has(error.code) || Date.now() >= deadline) return error;
      await sleep(CLEANUP_RETRY_MS);
    }
  }
}

/** 'link' (the junction/symlink), 'gone', 'other' (not a link) or 'unknown'. */
function junctionState() {
  try {
    return fs.lstatSync(junction).isSymbolicLink() ? 'link' : 'other';
  } catch (error) {
    return error.code === 'ENOENT' ? 'gone' : 'unknown';
  }
}

async function removeFixture() {
  const started = Date.now();
  let error = null;
  try {
    // Unlink removes the link itself, never what it points at.
    if (junctionState() === 'link') error = await retrying(() => fs.unlinkSync(junction));
    const state = junctionState();
    if (!error && state !== 'gone') {
      error = new Error(`node_modules link is ${state}, so the fixture was left in place`);
    }
    if (!error) error = await retrying(() => fs.rmSync(base, { recursive: true, force: true }));
  } catch (unexpected) {
    error = unexpected;
  }
  const elapsed = `${Date.now() - started} ms, ${cleanupAttempts} attempt(s)`;
  if (error) {
    console.warn(
      `SPACED-PATH WARN: temp fixture not removed after ${elapsed} ` +
        `(${error.code ?? error.message}); delete ${base} by hand.`,
    );
  } else {
    console.log(`SPACED-PATH: temp fixture removed after ${elapsed}.`);
  }
}

fs.mkdirSync(dir, { recursive: true });
fs.cpSync(path.join(root, 'dist'), path.join(dir, 'dist'), { recursive: true });
fs.cpSync(path.join(root, 'dist-electron'), path.join(dir, 'dist-electron'), { recursive: true });
fs.copyFileSync(path.join(root, 'package.json'), path.join(dir, 'package.json'));
try {
  fs.symlinkSync(
    path.join(root, 'node_modules'),
    path.join(dir, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
} catch {
  /* symlink may already exist */
}

const app = await electron.launch({
  args: [
    'dist-electron/main.cjs',
    `--user-data-dir=${path.join(base, 'isolated-profile')}`,
    '--no-sandbox',
    '--disable-gpu',
  ],
  cwd: dir,
  env: { ...process.env, WMNO_SMOKE: '1' },
});

try {
  const page = await app.firstWindow({ timeout: 20000 });
  await page.waitForLoadState('domcontentloaded');
  const url = page.url();
  if (url.startsWith('data:')) {
    console.error(
      'SPACED-PATH FAIL: renderer fell back to the data: error page —',
      url.slice(0, 60),
    );
    process.exit(1);
  }
  // The real game UI must render (not an error page).
  await page.locator('.office, .opening, .modal').first().waitFor({ timeout: 20000 });
  console.log(
    'SPACED-PATH OK: renderer loaded from a spaced/parenthesized path. url starts',
    url.slice(0, 56),
  );
} finally {
  await app.close();
  await removeFixture();
}
