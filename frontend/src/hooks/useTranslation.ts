// src/hooks/useTranslation.ts
import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createT, LANGUAGE_TO_LOCALE, type Locale } from '@/lib/translations';

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
  const locale: Locale = LANGUAGE_TO_LOCALE[profile?.base_language ?? ''] ?? 'en';

  // Memoize t and tp so their identities are stable across renders for a given
  // locale. Without this, every render produces a new t, which cascades through
  // any useCallback/useEffect that depends on t and causes infinite re-render
  // loops (see Dashboard.tsx loadDecks flicker bug).
  const t = useMemo(() => createT(locale), [locale]);

  const tp = useMemo(
    () =>
      (keyBase: string, count: number, vars?: Record<string, string | number>): string => {
        const pluralKey = count === 1 ? `${keyBase}.one` : `${keyBase}.other`;
        return t(pluralKey, { count, ...vars });
      },
    [t]
  );

  return { t, tp, locale };
}
