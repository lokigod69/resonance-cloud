import { STATIC_CATEGORY_TARGET_LANGUAGES } from '@/data/categories'

export const STATIC_LIBRARY_TARGET_LANGUAGE_KEY = 'resonance.staticLibrary.targetLanguage'

export function resolveVisibleStaticLanguage(value: string | null | undefined, fallback = 'English'): string {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  const matched = STATIC_CATEGORY_TARGET_LANGUAGES.find((language) => (
    language.value.toLowerCase() === normalized
    || language.code === normalized
    || language.label.toLowerCase() === normalized
    || language.name.toLowerCase() === normalized
    || language.nativeName.toLowerCase() === normalized
  ))
  return matched?.value ?? fallback
}

export function readStaticLibraryTargetLanguage(queryValue?: string | null, fallback?: string | null): string {
  if (queryValue) return resolveVisibleStaticLanguage(queryValue, 'English')
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(STATIC_LIBRARY_TARGET_LANGUAGE_KEY)
      if (stored) return resolveVisibleStaticLanguage(stored, 'English')
    } catch {
      // Local preference is best-effort only.
    }
  }
  return resolveVisibleStaticLanguage(fallback, 'English')
}

export function persistStaticLibraryTargetLanguage(language: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STATIC_LIBRARY_TARGET_LANGUAGE_KEY, resolveVisibleStaticLanguage(language, 'English'))
  } catch {
    // Local preference is best-effort only.
  }
}

export function staticLibraryRouteSuffix(targetLanguage: string): string {
  const params = new URLSearchParams({ targetLanguage: resolveVisibleStaticLanguage(targetLanguage, 'English') })
  return `?${params.toString()}`
}
