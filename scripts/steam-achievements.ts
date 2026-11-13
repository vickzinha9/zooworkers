// Writes docs/STEAM_ACHIEVEMENTS.md from the game's achievements and locales.
// Usage: npx tsx scripts/steam-achievements.ts
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderSteamAchievementsDoc } from './lib/steamAchievementsDoc';

const target = fileURLToPath(new URL('../docs/STEAM_ACHIEVEMENTS.md', import.meta.url));
writeFileSync(target, await renderSteamAchievementsDoc());
console.info(`wrote ${target}`);
