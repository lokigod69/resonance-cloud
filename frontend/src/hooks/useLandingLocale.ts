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
import { useLocation } from 'react-router-dom';
import { createT, type Locale } from '@/lib/translations';

const BROWSER_LANG_TO_LOCALE: Record<string, Locale> = {
  de: 'de',
  'de-DE': 'de',
  'de-AT': 'de',
  'de-CH': 'de',
  fr: 'fr',
  'fr-FR': 'fr',
  'fr-CA': 'fr',
  'fr-BE': 'fr',
  'fr-CH': 'fr',
};

export function resolveLandingLocale(search: string, browserLanguage: string | null | undefined): Locale {
  const langParam = new URLSearchParams(search).get('lang');
  if (langParam === 'de' || langParam === 'fr') return langParam;

  const browserLang = browserLanguage ?? '';
  if (BROWSER_LANG_TO_LOCALE[browserLang]) return BROWSER_LANG_TO_LOCALE[browserLang];
  const primary = browserLang.split('-')[0];
  return BROWSER_LANG_TO_LOCALE[primary] ?? 'en';
}

export function resolvePageDocumentLocale({
  pathname,
  search,
  browserLanguage,
  appLocale,
}: {
  pathname: string
  search: string
  browserLanguage?: string | null
  appLocale: Locale
}): Locale {
  return pathname === '/' ? resolveLandingLocale(search, browserLanguage) : appLocale
}

export function useLandingLocale() {
  const location = useLocation()
  const locale = useMemo<Locale>(
    () => resolveLandingLocale(location.search, navigator.language),
    [location.search],
  );

  return { t: createT(locale), locale };
}
