import type { GuidedTargetLanguage } from '@/data/guidedLessons'

export const TODAY_GUIDED_LANGUAGE_STORAGE_KEY = 'guided_target_language'

const TARGET_LANGUAGES: ReadonlySet<GuidedTargetLanguage> = new Set([
  'English',
  'Spanish',
  'Italian',
  'French',
  'Portuguese',
  'German',
  'Cebuano',
  'Indonesian',
  'Polish',
  'Korean',
  'Russian',
  'Japanese',
])

export const DEFAULT_GUIDED_TARGET_LANGUAGE: GuidedTargetLanguage = 'English'

export function isGuidedTargetLanguage(value: unknown): value is GuidedTargetLanguage {
  return typeof value === 'string' && TARGET_LANGUAGES.has(value as GuidedTargetLanguage)
}

export function resolveGuidedTargetLanguage(value: unknown): GuidedTargetLanguage {
  return isGuidedTargetLanguage(value) ? value : DEFAULT_GUIDED_TARGET_LANGUAGE
}

export function getSelectedGuidedTargetLanguage(): GuidedTargetLanguage {
  if (!canUseLocalStorage()) return DEFAULT_GUIDED_TARGET_LANGUAGE
  try {
    return resolveGuidedTargetLanguage(window.localStorage.getItem(TODAY_GUIDED_LANGUAGE_STORAGE_KEY))
  } catch {
    return DEFAULT_GUIDED_TARGET_LANGUAGE
  }
}

export function setSelectedGuidedTargetLanguage(language: GuidedTargetLanguage) {
  if (!canUseLocalStorage()) return
  try {
    window.localStorage.setItem(TODAY_GUIDED_LANGUAGE_STORAGE_KEY, language)
  } catch {
    return
  }
}

/** The last path the learner chose in each language, on this device. */
export function readPreferredGuidedPath(userId: string | undefined, language: string): string | null {
  if (!userId) return null
  try {
    return window.localStorage.getItem(`guided_path:${userId}:${language}`)
  } catch {
    return null
  }
}

export function rememberGuidedPath(userId: string | undefined, language: string, pathId: string): void {
  if (!userId) return
  try {
    window.localStorage.setItem(`guided_path:${userId}:${language}`, pathId)
  } catch {
    // The current selection still works through the URL.
  }
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}
