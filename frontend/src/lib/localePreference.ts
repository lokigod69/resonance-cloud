import { LANGUAGE_TO_LOCALE, type Locale } from './translations'

export const UI_LOCALE_PREFERENCE_KEY = 'lingwave:ui-locale'

const SUPPORTED_UI_LOCALES = new Set<Locale>([
  'en', 'de', 'fr', 'es', 'it', 'pt', 'id', 'pl', 'ru', 'ko', 'ja', 'ceb',
])

type LocaleStorage = Pick<Storage, 'getItem' | 'setItem'>

export function isSupportedUiLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_UI_LOCALES.has(value as Locale)
}

export function resolveBrowserUiLocale(browserLocales: readonly string[]): Locale | undefined {
  for (const candidate of browserLocales) {
    const primary = candidate.trim().toLowerCase().replaceAll('_', '-').split('-')[0]
    if (isSupportedUiLocale(primary)) return primary
  }
  return undefined
}

export function readStoredUiLocale(storage?: LocaleStorage | null): Locale | undefined {
  if (!storage) return undefined
  try {
    const stored = storage.getItem(UI_LOCALE_PREFERENCE_KEY)
    return isSupportedUiLocale(stored) ? stored : undefined
  } catch {
    return undefined
  }
}

export function resolveUiLocale({
  profileBaseLanguage,
  storage,
  browserLocales = [],
}: {
  profileBaseLanguage?: string | null
  storage?: LocaleStorage | null
  browserLocales?: readonly string[]
}): Locale {
  const profileLocale = LANGUAGE_TO_LOCALE[profileBaseLanguage ?? '']
  return profileLocale
    ?? readStoredUiLocale(storage)
    ?? resolveBrowserUiLocale(browserLocales)
    ?? 'en'
}

export function persistProfileUiLocale(
  profileBaseLanguage: string | null | undefined,
  storage?: LocaleStorage | null,
): boolean {
  const locale = LANGUAGE_TO_LOCALE[profileBaseLanguage ?? '']
  if (!locale || !storage) return false
  try {
    storage.setItem(UI_LOCALE_PREFERENCE_KEY, locale)
    return true
  } catch {
    return false
  }
}

export function getBrowserLocaleInputs(): string[] {
  if (typeof navigator === 'undefined') return []
  try {
    return [...(navigator.languages ?? []), navigator.language].filter(Boolean)
  } catch {
    return []
  }
}

export function getBrowserLocaleStorage(): LocaleStorage | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}
