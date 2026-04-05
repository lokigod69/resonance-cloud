// src/hooks/useTranslation.ts
import { useAuth } from '@/hooks/useAuth';
import { translations, LANGUAGE_TO_LOCALE, type Locale } from '@/lib/translations';

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

  const t = (key: string, vars?: Record<string, string | number>): string => {
    let str = translations[locale]?.[key] ?? translations.en?.[key] ?? key;

    if (vars) {
      for (const [varName, value] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${varName}\\}`, 'g'), String(value));
      }
    }

    return str;
  };

  /**
   * Pluralization helper.
   * tp('dashboard.deckCount', count) resolves to:
   *   count === 1 → 'dashboard.deckCount.one'
   *   count !== 1 → 'dashboard.deckCount.other'
   * Additional vars can be passed as a third argument.
   */
  const tp = (keyBase: string, count: number, vars?: Record<string, string | number>): string => {
    const pluralKey = count === 1 ? `${keyBase}.one` : `${keyBase}.other`;
    return t(pluralKey, { count, ...vars });
  };

  return { t, tp, locale };
}
