import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/content/achievements';
import { STEAM_ACHIEVEMENT_IDS, steamAchievementId } from '../src/platform/achievements';
import { renderSteamAchievementsDoc } from '../scripts/lib/steamAchievementsDoc';

// Every achievement the game can unlock reaches Steam under a valid, unique API
// name, and the table a person copies into Steamworks matches the game.

describe('Steam achievement names', () => {
  it('every achievement has one, and no two share it', () => {
    const names = ACHIEVEMENTS.map((achievement) => STEAM_ACHIEVEMENT_IDS[achievement.id]);
    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(ACHIEVEMENTS.length);
    expect(Object.keys(STEAM_ACHIEVEMENT_IDS)).toHaveLength(ACHIEVEMENTS.length);
  });

  it('are Steamworks API names: ACH_, capitals, digits and underscores', () => {
    for (const name of Object.values(STEAM_ACHIEVEMENT_IDS)) {
      expect(name).toMatch(/^ACH_[A-Z0-9]+(_[A-Z0-9]+)*$/);
      expect(name.length).toBeLessThanOrEqual(64);
    }
  });

  it('keeps the six names given by hand', () => {
    expect(steamAchievementId('first-day')).toBe('ACH_FIRST_DAY');
    expect(steamAchievementId('going-nuts')).toBe('ACH_GOING_COMPLETELY_NUTS');
    expect(steamAchievementId('full-staff')).toBe('ACH_FULL_STAFF');
    expect(steamAchievementId('every-nook')).toBe('ACH_EVERY_NOOK');
  });
});

describe('docs/STEAM_ACHIEVEMENTS.md', () => {
  it('is what the generator writes (run npx tsx scripts/steam-achievements.ts)', async () => {
    const committed = readFileSync(
      new URL('../docs/STEAM_ACHIEVEMENTS.md', import.meta.url),
      'utf8',
    ).replace(/\r\n/g, '\n');
    expect(committed).toBe(await renderSteamAchievementsDoc());
  });

  it('lists every achievement once', async () => {
    const doc = await renderSteamAchievementsDoc();
    for (const name of Object.values(STEAM_ACHIEVEMENT_IDS)) {
      expect(doc.split(`\`${name}\``)).toHaveLength(2);
    }
  });
});
