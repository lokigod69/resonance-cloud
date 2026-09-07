/** API-local mirror of the persisted base-language contract. Keep dependency-free. */
export const API_BASE_LANGUAGES = [
  { value: 'English', code: 'en' },
  { value: 'German', code: 'de' },
  { value: 'French', code: 'fr' },
  { value: 'Spanish', code: 'es' },
  { value: 'Italian', code: 'it' },
  { value: 'Portuguese', code: 'pt' },
  { value: 'Indonesian', code: 'id' },
  { value: 'Polish', code: 'pl' },
  { value: 'Russian', code: 'ru' },
  { value: 'Korean', code: 'ko' },
  { value: 'Japanese', code: 'ja' },
  { value: 'Bisaya', code: 'ceb' },
] as const

export type ApiBaseLanguageValue = (typeof API_BASE_LANGUAGES)[number]['value']
export type ApiBaseLanguageCode = (typeof API_BASE_LANGUAGES)[number]['code']

export type ApiBaseLanguage = {
  value: ApiBaseLanguageValue
  code: ApiBaseLanguageCode
}

const BASE_LANGUAGE_ALIASES: Record<string, ApiBaseLanguageValue> = {
  cebuano: 'Bisaya',
}

export function resolveApiBaseLanguage(value: unknown): ApiBaseLanguage | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null

  const resolved = API_BASE_LANGUAGES.find((item) => (
    item.value.toLowerCase() === normalized || item.code === normalized
  ))
  if (resolved) return { value: resolved.value, code: resolved.code }

  const alias = BASE_LANGUAGE_ALIASES[normalized]
  if (!alias) return null
  const aliased = API_BASE_LANGUAGES.find((item) => item.value === alias)
  return aliased ? { value: aliased.value, code: aliased.code } : null
}
