// The thematic library's language table and code resolver — split out of
// `./categories` so a caller that only needs a language CODE (the Home audio
// lookup, the Word Stream hook) does not statically pull the ~2 MB translation
// table into its chunk. `./categories` re-exports everything here, so existing
// imports are unaffected; new light-weight callers import from this module.

export type StaticCategoryTargetLanguageCode = 'en' | 'de' | 'fr' | 'es' | 'pt' | 'it' | 'pl' | 'id' | 'ceb' | 'ko' | 'ru' | 'ja'
export type StaticCategoryLanguageStatus = 'stable' | 'experimental' | 'hidden'

export interface StaticCategoryLanguageMetadata {
  code: StaticCategoryTargetLanguageCode
  value: string
  label: string
  name: string
  nativeName: string
  status: StaticCategoryLanguageStatus
  reviewLabel?: string
  script: string
}

export const STATIC_CATEGORY_TRANSLATION_LANGUAGES: StaticCategoryLanguageMetadata[] = [
  { code: 'en', value: 'English', name: 'English', nativeName: 'English', label: 'English', status: 'stable', script: 'Latin' },
  { code: 'de', value: 'German', name: 'German', nativeName: 'Deutsch', label: 'Deutsch', status: 'stable', script: 'Latin' },
  { code: 'fr', value: 'French', name: 'French', nativeName: 'Français', label: 'Français', status: 'stable', script: 'Latin' },
  { code: 'es', value: 'Spanish', name: 'Spanish', nativeName: 'Español', label: 'Español', status: 'stable', script: 'Latin' },
  { code: 'pt', value: 'Portuguese', name: 'Portuguese', nativeName: 'Português', label: 'Português', status: 'stable', script: 'Latin' },
  { code: 'it', value: 'Italian', name: 'Italian', nativeName: 'Italiano', label: 'Italiano', status: 'stable', script: 'Latin' },
  { code: 'pl', value: 'Polish', name: 'Polish', nativeName: 'Polski', label: 'Polski', status: 'stable', script: 'Latin' },
  { code: 'id', value: 'Indonesian', name: 'Indonesian', nativeName: 'Bahasa Indonesia', label: 'Bahasa Indonesia', status: 'stable', script: 'Latin' },
  {
    code: 'ceb',
    value: 'Bisaya',
    name: 'Bisaya / Cebuano',
    nativeName: 'Bisaya / Cebuano',
    label: 'Bisaya / Cebuano',
    status: 'experimental',
    reviewLabel: 'review',
    script: 'Latin',
  },
  {
    code: 'ko',
    value: 'Korean',
    name: 'Korean',
    nativeName: '한국어',
    label: '한국어 (experimental)',
    status: 'experimental',
    reviewLabel: 'experimental',
    script: 'Hangul',
  },
  {
    code: 'ru',
    value: 'Russian',
    name: 'Russian',
    nativeName: 'Русский',
    label: 'Русский (experimental)',
    status: 'experimental',
    reviewLabel: 'experimental',
    script: 'Cyrillic',
  },
  {
    code: 'ja',
    value: 'Japanese',
    name: 'Japanese',
    nativeName: '日本語',
    label: '日本語 (experimental)',
    status: 'experimental',
    reviewLabel: 'experimental',
    script: 'Japanese',
  },
]

export function resolveStaticCategoryTargetLanguageCode(language?: string | null): StaticCategoryTargetLanguageCode {
  const normalized = (language ?? '').trim().toLowerCase()
  return STATIC_CATEGORY_TRANSLATION_LANGUAGES.find((entry) => (
    entry.code === normalized
    || entry.value.toLowerCase() === normalized
    || entry.label.toLowerCase() === normalized
    || entry.name.toLowerCase() === normalized
    || entry.nativeName.toLowerCase() === normalized
    || (entry.code === 'ceb' && normalized === 'cebuano')
  ))?.code ?? 'en'
}

/** Whether the thematic library carries translations for this language value
 * ('German', 'Bisaya', …) — unlike the resolver, this does not fall back. */
export function isStaticCategoryLanguage(language?: string | null): boolean {
  const normalized = (language ?? '').trim().toLowerCase()
  if (!normalized) return false
  return STATIC_CATEGORY_TRANSLATION_LANGUAGES.some((entry) => (
    entry.code === normalized
    || entry.value.toLowerCase() === normalized
    || entry.name.toLowerCase() === normalized
    || entry.nativeName.toLowerCase() === normalized
    || (entry.code === 'ceb' && normalized === 'cebuano')
  ))
}
