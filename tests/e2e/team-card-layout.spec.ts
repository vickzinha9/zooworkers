import { expect, test, type Page } from '@playwright/test';
import { createInitialState } from '../../src/sim/state';
import type { GameState } from '../../src/sim/types';
import { openView } from './support/shell';

/**
 * The Team sheet's roster card lays itself out from the width the sheet gives it.
 *
 * It used to pick its three columns (portrait | file | actions) from the WINDOW
 * width: one media query stacked it at 380 px and below, and nothing else. So a
 * full-window sheet just past 380 px, and the 350–540 px side panel of every window
 * from 760 px up, squeezed the file column to nothing: "Tico Bolotenberg" one letter
 * per line, Promover / Dar café / Visitar pushed past the sheet's edge, "+757,9K/s"
 * over the name, and the sheet scrolling sideways (measured on the 23-teammate QA
 * save in pt-BR, 800×600: `.sheet__body` +41 px, `.employee-card__info` +143 px).
 */

// scripts/qa-seed.mjs `QA_ROSTER`: the whole cast, four to a room, Bia alone.
const QA_ROSTER: Record<string, string> = {
  pip: 'founder-desk',
  marlow: 'founder-desk',
  nino: 'founder-desk',
  junie: 'founder-desk',
  moss: 'research',
  mina: 'research',
  hazel: 'research',
  perry: 'research',
  axel: 'lab',
  quincy: 'lab',
  inky: 'lab',
  echo: 'lab',
  corvus: 'marketing',
  rosa: 'marketing',
  canela: 'marketing',
  fenn: 'marketing',
  rizzo: 'procurement',
  nixie: 'procurement',
  otto: 'procurement',
  pingo: 'procurement',
  bea: 'construction',
  dorm: 'construction',
  bia: 'sorting',
};

/** `qaSave()` from scripts/qa-seed.mjs, in pt-BR, with two names as long as a nickname gets. */
function qaCompany(): GameState {
  const s = createInitialState(Date.now());
  s.onboardingComplete = true;
  s.createdAt = Date.now() - 900_000;
  s.resources.nuts = 5_000_000;
  s.resources.goldenNuts = 40;
  s.resources.morale = 80;
  s.resources.reputation = 1_600;
  for (const [id, room] of Object.entries(QA_ROSTER)) {
    Object.assign(s.employees[id], { hired: true, level: 4, friendship: 50, room });
  }
  for (const room of [
    'sorting',
    'lab',
    'meeting',
    'research',
    'marketing',
    'construction',
    'procurement',
  ]) {
    s.upgrades[`room-${room}`] = 1;
  }
  // The engine keeps 24 characters of a nickname.
  s.employees.pip.nickname = 'Tico Bolotenberg Segundo';
  s.employees.rizzo.nickname = 'Bartolomeu Castanheirão';
  s.settings.language = 'pt-BR';
  s.settings.reducedMotion = false;
  return s;
}

async function openTeam(page: Page, width: number, height: number) {
  await page.addInitScript((save) => {
    localStorage.setItem('wmno.save.v1', JSON.stringify(save));
  }, qaCompany());
  await page.setViewportSize({ width, height });
  await page.goto('/');
  await page.locator('.office').first().waitFor({ timeout: 15_000 });
  // `npm run dev` only: its DEV button sits over the dock in a narrow window.
  await page.addStyleTag({ content: '.dev-fab { display: none !important; }' });
  await openView(page, 'employees');
  await settle(page);
}

/** The roster as laid out now: 23 cards, fonts in, every portrait settled, sheet still. */
async function settle(page: Page) {
  await expect(page.locator('.employee-card')).toHaveCount(23);
  await page.evaluate(() => document.fonts.ready);
  // Every portrait settles (loaded or failed) before anything is measured; a failed one
  // is named here instead of surfacing as a timeout.
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('.employee-card__art img')].every(
      (img) => img.complete,
    ),
  );
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLImageElement>('.employee-card__art img')]
      .filter((img) => img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src),
  );
  expect(broken, 'every portrait loads').toEqual([]);
  // Let the sheet finish sliding in before measuring it.
  await page.waitForTimeout(700);
}

interface CardReport {
  id: string;
  /** Things that leave the card sideways (tag.class:px past the edge). */
  outside: string[];
  actionsInside: boolean;
  infoOverflow: number;
  nameLines: number;
  fullNameLines: number;
  gainOverName: boolean;
  smallTargets: string[];
  smallText: string[];
  portraitUpscale: number;
  portraitAspectDrift: number;
}

function measure(page: Page) {
  return page.evaluate(() => {
    /** How many lines a text node is set on (its own text, not the level chip beside it). */
    const lines = (el: Element | null) => {
      const text = el && [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent?.trim());
      if (!text) return 0;
      const range = document.createRange();
      range.selectNodeContents(text);
      return new Set(
        [...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)),
      ).size;
    };
    const label = (el: Element) =>
      `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0] || '-'}`;
    const body = document.querySelector('.sheet__body') as HTMLElement;
    const cards: CardReport[] = [...document.querySelectorAll('.employee-card')].map((card) => {
      const box = card.getBoundingClientRect();
      const inside = (r: DOMRect) => r.left >= box.left - 0.5 && r.right <= box.right + 0.5;
      const outside: string[] = [];
      const smallText: string[] = [];
      for (const el of card.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (!inside(r)) outside.push(`${label(el)}:${Math.round(r.right - box.right)}`);
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
        if (hasText && parseFloat(getComputedStyle(el).fontSize) < 11) smallText.push(label(el));
      }
      const actions = [...card.querySelectorAll('.employee-card__actions > *')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width && r.height);
      const name = card.querySelector('.employee-card__name');
      const gain = card.querySelector('.employee-card__gain');
      const overlaps = (a: DOMRect, b: DOMRect) =>
        a.left < b.right - 1 &&
        b.left < a.right - 1 &&
        a.top < b.bottom - 1 &&
        b.top < a.bottom - 1;
      const smallTargets = [...card.querySelectorAll('button, input, select')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && Math.min(r.width, r.height) < 30;
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          return `${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}`;
        });
      const info = card.querySelector('.employee-card__info') as HTMLElement;
      const img = card.querySelector('.employee-card__art img') as HTMLImageElement | null;
      const art = img?.getBoundingClientRect();
      return {
        id:
          (card.querySelector('.employee-card__talk') as HTMLElement | null)?.dataset.employee ??
          '?',
        outside: outside.slice(0, 4),
        actionsInside: actions.length > 0 && actions.every(inside),
        infoOverflow: info.scrollWidth - info.clientWidth,
        nameLines: lines(name),
        fullNameLines: lines(card.querySelector('.employee-card__fullname')),
        gainOverName: Boolean(
          gain && name && overlaps(gain.getBoundingClientRect(), name.getBoundingClientRect()),
        ),
        smallTargets,
        smallText,
        portraitUpscale: img && art ? art.height / img.naturalHeight : 0,
        portraitAspectDrift:
          img && art
            ? Math.abs(art.width / art.height / (img.naturalWidth / img.naturalHeight) - 1)
            : 0,
      };
    });
    return {
      sideways: body.scrollWidth - body.clientWidth,
      pageSideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cards,
    };
  });
}

const SIZES: Array<[number, number]> = [
  // The six standard window sizes.
  [320, 420],
  [380, 460],
  [800, 600],
  [1280, 720],
  [1440, 900],
  [1920, 1080],
  // Where it broke: a full-window sheet just past 380 px...
  [400, 600],
  [440, 600],
  [500, 600],
  // ...and the side panel, from 760 px to past 1300 px.
  [760, 600],
  [880, 600],
  [1000, 600],
  [1100, 600],
  [1200, 600],
];

/** Every way a card can break at the size the window has now, as one list. */
async function problemsAt(page: Page, width: number, height: number): Promise<string[]> {
  const m = await measure(page);
  expect(m.cards, `23 cards at ${width}x${height}`).toHaveLength(23);
  const problems: string[] = [];
  if (m.sideways > 1) problems.push(`the Team sheet scrolls sideways (+${m.sideways}px)`);
  if (m.pageSideways > 1) problems.push(`the window scrolls sideways (+${m.pageSideways}px)`);
  for (const card of m.cards) {
    const who = card.id;
    if (!card.actionsInside) problems.push(`${who}: Promover, Dar café or Visitar leaves the card`);
    if (card.outside.length) problems.push(`${who}: sticks out: ${card.outside.join(', ')}`);
    if (card.infoOverflow > 1)
      problems.push(`${who}: the file column overflows +${card.infoOverflow}px`);
    if (card.nameLines > 2) problems.push(`${who}: name on ${card.nameLines} lines`);
    if (card.fullNameLines > 2) problems.push(`${who}: full name on ${card.fullNameLines} lines`);
    if (card.gainOverName) problems.push(`${who}: the per-second gain covers the name`);
    if (card.smallTargets.length)
      problems.push(`${who}: controls under 30 px: ${card.smallTargets.join(', ')}`);
    if (card.smallText.length)
      problems.push(`${who}: text under 11 px: ${card.smallText.join(', ')}`);
    if (card.portraitUpscale > 1.02)
      problems.push(`${who}: portrait enlarged x${card.portraitUpscale.toFixed(2)}`);
    if (card.portraitAspectDrift > 0.02)
      problems.push(`${who}: portrait squeezed ${(card.portraitAspectDrift * 100).toFixed(1)}%`);
  }
  await page.screenshot({ path: `visual-artifacts/review/team-card-${width}x${height}.png` });
  return problems;
}

// The game is a resizable window: each group loads the company once and the window is
// then resized to every size in it, as a player does (14 cold loads of 23 portraits ran
// close to their timeout in a loaded full suite). Every size is still measured in full.
const GROUPS: Array<[string, Array<[number, number]>]> = [
  ['the six standard window sizes', SIZES.slice(0, 6)],
  ['the widths where it broke', SIZES.slice(6)],
];

for (const [group, sizes] of GROUPS) {
  test(`Team cards fit their sheet at ${group} (23 teammates, pt-BR)`, async ({ page }) => {
    test.setTimeout(90_000);
    const [[firstWidth, firstHeight]] = sizes;
    await openTeam(page, firstWidth, firstHeight);
    const found: Record<string, string[]> = {};
    for (const [width, height] of sizes) {
      await test.step(`${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await settle(page);
        found[`${width}x${height}`] = await problemsAt(page, width, height);
      });
    }
    // Asserted once, every size listed, so one run names everything that broke.
    const broken = Object.fromEntries(Object.entries(found).filter(([, list]) => list.length));
    expect(broken, `Team cards at ${group}`).toEqual({});
  });
}

for (const [width, height] of [
  [800, 600],
  [320, 420],
] as const) {
  test(`keyboard at ${width}x${height}: a card in order, Enter on Visitar, Escape back to it`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openTeam(page, width, height);
    const card = page.locator('.employee-card', {
      has: page.locator('.employee-card__talk[data-employee="otto"]'),
    });
    const visit = card.locator('.employee-card__talk');
    await card.locator('.nickname-input').focus();
    const order: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      const step = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const style = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const card = el.closest('.employee-card')?.getBoundingClientRect();
        return {
          name: String(el.className).split(' ')[0] || el.tagName.toLowerCase(),
          inCard: Boolean(card),
          // The keyboard ring itself, not a resting shadow every button already has.
          ring:
            el.matches(':focus-visible') &&
            style.outlineStyle !== 'none' &&
            parseFloat(style.outlineWidth) >= 2,
          inside: Boolean(card) && r.left >= card!.left - 0.5 && r.right <= card!.right + 0.5,
          talk: el.classList.contains('employee-card__talk'),
        };
      });
      expect(step.inCard, `focus stays in the card (${order.join(' > ')})`).toBe(true);
      expect(step.ring, `${step.name} shows where focus is`).toBe(true);
      expect(step.inside, `${step.name} sits inside the card`).toBe(true);
      order.push(step.name);
      if (step.talk) break;
      await page.keyboard.press('Tab');
    }
    // Name the teammate, place them, dress them; then promote, coffee, visit.
    expect(order[0]).toBe('nickname-input');
    expect(order[1]).toBe('select');
    expect(order.slice(-3)).toEqual(['buy-btn', 'ghost-btn', 'ghost-btn']);
    await expect(visit).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('.visit')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.visit')).toHaveCount(0);
    await expect(page.locator('.sheet[data-sheet="employees"]')).toBeVisible();
    await expect(visit).toBeFocused();
  });
}
