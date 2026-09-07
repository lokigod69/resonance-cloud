// src/hooks/useTranslation.ts
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  createT,
  getLoadedLocaleMessages,
  getLocaleLoadStatus,
  loadLocaleMessages,
  retryLocaleMessages,
  selectPluralTranslationKey,
  subscribeLocaleMessages,
  type Locale,
} from '@/lib/translations';
import {
  getBrowserLocaleInputs,
  getBrowserLocaleStorage,
  persistProfileUiLocale,
  resolveUiLocale,
} from '@/lib/localePreference';

/**
 * Returns a translation function t() that resolves keys
 * based on the user's base_language profile setting.
 *
 * Usage:
 *   const { t, locale } = useTranslation();
 *   t('nav.decks')                         // → "Decks"
 *   t('credits.added', { count: 5 })       // → "+5 Credits hinzugefügt!"
 *
 * Fallback chain: locale translation → English translation → raw key
 */
export function useTranslation() {
  const { profile } = useAuth();
  const locale: Locale = resolveUiLocale({
    profileBaseLanguage: profile?.base_language,
    storage: getBrowserLocaleStorage(),
    browserLocales: getBrowserLocaleInputs(),
  });
  const localeMessages = useSyncExternalStore(
    subscribeLocaleMessages,
    () => getLoadedLocaleMessages(locale),
    () => getLoadedLocaleMessages('en'),
  );
  const localeLoadStatus = useSyncExternalStore(
    subscribeLocaleMessages,
    () => getLocaleLoadStatus(locale),
    () => 'ready' as const,
  );

  useEffect(() => {
    persistProfileUiLocale(profile?.base_language, getBrowserLocaleStorage());
  }, [profile?.base_language]);

  useEffect(() => {
    const loaded = getLoadedLocaleMessages(locale);
    if (loaded) return;

    void loadLocaleMessages(locale).catch((error: unknown) => {
      if (import.meta.env.DEV) console.warn('[i18n] Failed to load locale; using English', { locale, error });
    });
  }, [locale]);

  const retryLocale = useCallback(() => retryLocaleMessages(locale), [locale]);

  // Memoize t and tp so their identities are stable across renders for a given
  // locale. Without this, every render produces a new t, which cascades through
  // any useCallback/useEffect that depends on t and causes infinite re-render
  // loops (see Dashboard.tsx loadDecks flicker bug).
  const t = useMemo(() => createT(locale, localeMessages), [locale, localeMessages]);

  const tp = useMemo(
    () =>
      (keyBase: string, count: number, vars?: Record<string, string | number>): string => {
        const pluralKey = selectPluralTranslationKey(locale, keyBase, count, localeMessages);
        return t(pluralKey, { count, ...vars });
      },
    [locale, localeMessages, t]
  );

  return {
    t,
    tp,
    locale,
    localeReady: localeLoadStatus === 'ready' && localeMessages !== undefined,
    localeLoadFailed: localeLoadStatus === 'error',
    retryLocale,
  };
}
