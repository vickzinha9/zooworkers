import { describe, it, expect } from 'vitest';
import {
  COMPLETE_LANGUAGES,
  PLAYER_LANGUAGES,
  SUPPORTED_LANGUAGES,
  matchLanguage,
  pickLanguage,
  resources,
} from '../src/i18n';

type Json = Record<string, unknown>;

function leafCount(obj: Json): number {
  let n = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_meta') continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) n += leafCount(v as Json);
    else n += 1;
  }
  return n;
}

describe('which languages the game offers', () => {
  it('offers exactly the complete translations: English and Brazilian Portuguese', () => {
    expect(COMPLETE_LANGUAGES).toEqual(['en', 'pt-BR']);
    expect(PLAYER_LANGUAGES).toEqual(['en', 'pt-BR']);
  });

  it('offers no language whose file covers less than the English key set', () => {
    const english = leafCount(resources.en.translation as unknown as Json);
    for (const lang of PLAYER_LANGUAGES) {
      const keys = leafCount(resources[lang].translation as unknown as Json);
      expect(keys, `${lang} has ${keys} of ${english} keys`).toBeGreaterThanOrEqual(english);
    }
  });

  it('keeps every draft file loaded for translators, just not offered', () => {
    const drafts = SUPPORTED_LANGUAGES.filter((lang) => !PLAYER_LANGUAGES.includes(lang));
    expect(drafts).toHaveLength(10);
    for (const lang of drafts) {
      const meta = (resources[lang].translation as Json)._meta as { complete?: boolean };
      expect(meta.complete, lang).toBe(false);
    }
  });
});

describe('matching a language tag', () => {
  it.each([
    ['en', 'en'],
    ['EN-us', 'en'],
    ['en-GB', 'en'],
    ['pt-BR', 'pt-BR'],
    ['pt_BR', 'pt-BR'],
    ['pt-PT', 'pt-BR'],
    ['pt', 'pt-BR'],
  ])('%s → %s', (tag, expected) => {
    expect(matchLanguage(tag)).toBe(expected);
  });

  it.each(['de', 'de-DE', 'es-MX', 'ja', 'zh-TW', 'zh-HK', 'nl', '', '  ', null, undefined])(
    'offers nothing for %s',
    (tag) => {
      expect(matchLanguage(tag)).toBeUndefined();
    },
  );
});

describe('the language the game opens in', () => {
  it.each([
    // [what the player chose (save, then last pick), system languages, expected]
    [[], ['pt-BR'], 'pt-BR'],
    [[], ['pt-PT', 'pt'], 'pt-BR'],
    [[], ['en-US'], 'en'],
    // A system language without a complete translation lands on English, never a draft.
    [[], ['de-DE', 'de'], 'en'],
    [[], ['es-MX', 'es'], 'en'],
    [[], ['ja-JP'], 'en'],
    [[], ['zh-HK'], 'en'],
    [[], ['ar'], 'en'],
    [[], [], 'en'],
    // A later system language that is complete still counts.
    [[], ['nl-NL', 'pt-BR'], 'pt-BR'],
    [[], ['de-DE', 'en-GB'], 'en'],
    // The player's own choice comes first.
    [['en'], ['pt-BR'], 'en'],
    [['pt-BR'], ['de-DE'], 'pt-BR'],
    [[undefined, 'pt-BR'], ['en-US'], 'pt-BR'],
    // A choice the menu no longer offers (a draft picked in an older build) is skipped.
    [['de'], ['pt-BR'], 'pt-BR'],
    [['de', 'de'], ['de-DE'], 'en'],
  ] as const)('chosen %j, system %j → %s', (chosen, system, expected) => {
    expect(pickLanguage(chosen, system)).toBe(expected);
  });
});
