export function resolveStaticCategoryTargetLanguageCode(language?: string | null): string {
  const value = (language ?? '').trim().toLowerCase()
  if (value.startsWith('kor')) return 'ko'
  if (value.startsWith('pol')) return 'pl'
  return 'de'
}

// lib/staticLibraryLanguage.ts entered the Home graph via lib/targetLanguage.ts
// (the canonical-language fan-out). The harness only needs the shape its
// resolver reads — enough entries for fixtures to resolve German/English.
export const STATIC_CATEGORY_TARGET_LANGUAGES = [
  { value: 'English', code: 'en', label: 'English', name: 'English', nativeName: 'English' },
  { value: 'German', code: 'de', label: 'German', name: 'German', nativeName: 'Deutsch' },
]
