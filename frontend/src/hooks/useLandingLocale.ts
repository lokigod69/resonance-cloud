// src/hooks/useLandingLocale.ts
//
// Detects locale for the landing page (anonymous users).
// Different from useTranslation() which reads from the user profile.
//
// Detection order:
//   1. URL parameter ?lang=de
//   2. Browser language (navigator.language)
//   3. Fallback to English

import { useMemo } from 'react';
import { createT, type Locale } from '@/lib/translations';

const BROWSER_LANG_TO_LOCALE: Record<string, Locale> = {
  de: 'de',
  'de-DE': 'de',
  'de-AT': 'de',
  'de-CH': 'de',
};

export function useLandingLocale() {
  const locale = useMemo<Locale>(() => {
    // 1. Check URL parameter: ?lang=de
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    if (langParam === 'de') return 'de';

    // 2. Check browser language (full tag first, then primary subtag)
    const browserLang = navigator.language;
    if (BROWSER_LANG_TO_LOCALE[browserLang]) return BROWSER_LANG_TO_LOCALE[browserLang];
    const primary = browserLang.split('-')[0];
    if (BROWSER_LANG_TO_LOCALE[primary]) return BROWSER_LANG_TO_LOCALE[primary];

    // 3. Fallback
    return 'en';
  }, []);

  return { t: createT(locale), locale };
}
