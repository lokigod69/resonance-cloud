export function resolveStaticCategoryTargetLanguageCode(language?: string | null): string {
  const value = (language ?? '').trim().toLowerCase()
  if (value.startsWith('kor')) return 'ko'
  if (value.startsWith('pol')) return 'pl'
  return 'de'
}
