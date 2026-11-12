import { test, expect, type Browser, type Page } from '@playwright/test';
import { openSettingsTab } from './support/shell';

// Settings → Language offers only languages the game is translated into, and a player
// whose system speaks something else lands on English (or pt-BR for any Portuguese),
// never on a draft that is English with a few dozen translated labels under another
// language's name.

const SAVE = {
  version: 8,
  onboardingComplete: true,
  lastSaved: Date.now(),
  createdAt: Date.now() - 600_000,
  company: { name: 'Nutshell Inc.' },
  resources: { nuts: 500_000, goldenNuts: 20, permanentKernels: 0, morale: 80, reputation: 90 },
  employees: {
    pip: { hired: true, level: 4, friendship: 50, room: 'founder-desk', x: 0.5 },
  },
  upgrades: {},
  collections: { nuts: [], outfits: [], logos: [], moments: [], secrets: [] },
  settings: { reducedMotion: true },
};

async function openOn(
  browser: Browser,
  locale: string,
  seed: { language: string } | null,
  viewport = { width: 1280, height: 720 },
): Promise<Page> {
  const context = await browser.newContext({ locale, viewport });
  const page = await context.newPage();
  await page.addInitScript(
    ({ save, chosen }) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      if (chosen) {
        const settings = { ...save.settings, language: chosen };
        localStorage.setItem('wmno.save.v1', JSON.stringify({ ...save, settings }));
        localStorage.setItem('wmno.settings.v1', JSON.stringify(settings));
        localStorage.setItem('wmno.lang', chosen);
      }
    },
    { save: SAVE, chosen: seed?.language ?? null },
  );
  await page.goto('/');
  return page;
}

const languageSelect = (page: Page, label: string) => page.getByRole('combobox', { name: label });

test('a German system opens a new company in English, and Portuguese can be chosen and kept', async ({
  browser,
}) => {
  const page = await openOn(browser, 'de-DE', null);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Claim the first acorn' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.office')).toBeVisible();

  await openSettingsTab(page, 'general');
  const select = languageSelect(page, 'Game language');
  await expect(select).toHaveValue('en');
  // Only complete translations are offered.
  await expect(select.locator('option')).toHaveText(['English', 'Português (Brasil)']);

  await select.selectOption('pt-BR');
  await expect(page.getByRole('heading', { name: 'Idioma' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await openSettingsTab(page, 'general');
  await expect(languageSelect(page, 'Idioma do jogo')).toHaveValue('pt-BR');
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('wmno.save.v1') ?? '{}').settings?.language,
  );
  expect(saved).toBe('pt-BR');
  await page.context().close();
});

test('a Portuguese (Portugal) system opens in Brazilian Portuguese and Settings says so', async ({
  browser,
}) => {
  const page = await openOn(browser, 'pt-PT', null);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('button', { name: 'Pegar a primeira bolota' })).toBeVisible();
  await page.keyboard.press('Escape');
  await openSettingsTab(page, 'general');
  await expect(languageSelect(page, 'Idioma do jogo')).toHaveValue('pt-BR');
  await page.context().close();
});

test('a company that picked a draft language in an older build opens in a complete one', async ({
  browser,
}) => {
  // The player chose "Deutsch" when drafts were offered; their system is Brazilian.
  const page = await openOn(browser, 'pt-BR', { language: 'de' });
  await expect(page.locator('.office')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await openSettingsTab(page, 'general');
  await expect(languageSelect(page, 'Idioma do jogo')).toHaveValue('pt-BR');
  await page.context().close();
});

for (const viewport of [
  { width: 320, height: 420 },
  { width: 1280, height: 720 },
]) {
  test(`the language setting reads in full at ${viewport.width}x${viewport.height} in pt-BR`, async ({
    browser,
  }) => {
    const page = await openOn(browser, 'pt-BR', { language: 'pt-BR' }, viewport);
    await expect(page.locator('.office')).toBeVisible();
    await openSettingsTab(page, 'general');
    const row = page.locator('#settings-language');
    await row.scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: 'Idioma' })).toBeVisible();
    const select = languageSelect(page, 'Idioma do jogo');
    await expect(select).toBeVisible();
    await expect(select).toHaveValue('pt-BR');

    // The row and its control stay inside the window, with readable text.
    for (const target of [row, select]) {
      const box = await target.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    }
    const fontSize = await select.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(11);
    const sideways = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(sideways).toBe(false);
    await page.screenshot({
      path: `visual-artifacts/p2/settings-language-${viewport.width}x${viewport.height}.png`,
    });
    await page.context().close();
  });
}
