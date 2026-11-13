import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import pl from './locales/pl.json';
import ru from './locales/ru.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';

export const SUPPORTED_LANGUAGES = [
  'en',
  'pt-BR',
  'es',
  'fr',
  'de',
  'it',
  'pl',
  'ru',
  'ja',
  'ko',
  'zh-CN',
  'zh-TW',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const resources = {
  en: { translation: en },
  'pt-BR': { translation: ptBR },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  pl: { translation: pl },
  ru: { translation: ru },
  ja: { translation: ja },
  ko: { translation: ko },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
} as const;

type LocaleMeta = { name?: string; complete?: boolean };

function localeMeta(lang: string): LocaleMeta | undefined {
  return (resources as Record<string, { translation: { _meta?: LocaleMeta } }>)[lang]?.translation
    ?._meta;
}

export function languageDisplayName(lang: string): string {
  return localeMeta(lang)?.name ?? lang;
}

/**
 * Languages translated in full (`_meta.complete`, which `check:i18n` enforces key by key).
 * The draft files translate a few dozen labels and fall back to English everywhere else, so
 * a system language is only ever matched against these.
 */
export const COMPLETE_LANGUAGES: readonly SupportedLanguage[] = SUPPORTED_LANGUAGES.filter(
  (lang) => localeMeta(lang)?.complete === true,
);

/** The languages Settings offers, and the only ones the game will run in. */
export const PLAYER_LANGUAGES: readonly SupportedLanguage[] = COMPLETE_LANGUAGES;

/**
 * The language among `among` that a language tag asks for: the same tag (any case), else
 * the same base language (`pt-PT` and `pt` get `pt-BR`, `en-GB` gets `en`).
 */
export function matchLanguage(
  tag: string | null | undefined,
  among: readonly SupportedLanguage[] = PLAYER_LANGUAGES,
): SupportedLanguage | undefined {
  const wanted = tag?.trim().replace('_', '-').toLowerCase();
  if (!wanted) return undefined;
  const base = wanted.split('-')[0];
  return (
    among.find((lang) => lang.toLowerCase() === wanted) ??
    among.find((lang) => lang.toLowerCase().split('-')[0] === base)
  );
}

/**
 * The language the game opens in: a language the player chose (in order), if Settings offers
 * it; else the first system language with a complete translation; else English.
 */
export function pickLanguage(
  chosen: readonly (string | null | undefined)[],
  system: readonly string[],
): SupportedLanguage {
  for (const tag of chosen) {
    const lang = matchLanguage(tag, PLAYER_LANGUAGES);
    if (lang) return lang;
  }
  for (const tag of system) {
    const lang = matchLanguage(tag, COMPLETE_LANGUAGES);
    if (lang) return lang;
  }
  return 'en';
}

function storedLanguage(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem('wmno.lang');
  } catch {
    return null;
  }
}

function systemLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages?.length) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}

/** `chosenLanguage` is the save's language when the player picked one (the default 'en' is not). */
export async function initI18n(chosenLanguage?: string): Promise<typeof i18n> {
  await i18n.use(initReactI18next).init({
    resources,
    lng: pickLanguage([chosenLanguage, storedLanguage()], systemLanguages()),
    fallbackLng: 'en',
    supportedLngs: PLAYER_LANGUAGES as unknown as string[],
    // pt-BR should not be truncated to 'pt' — keep region tags.
    load: 'currentOnly',
    nonExplicitSupportedLngs: false,
    returnObjects: true,
    interpolation: { escapeValue: false },
  });
  // The document speaks the game's language, so assistive tech pronounces it right.
  const syncDocumentLanguage = (lng: string) => {
    if (typeof document !== 'undefined' && lng) document.documentElement.lang = lng;
  };
  syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);
  i18n.on('languageChanged', syncDocumentLanguage);
  return i18n;
}

export default i18n;
