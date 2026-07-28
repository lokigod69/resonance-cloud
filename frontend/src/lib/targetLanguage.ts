import { canonicalizeLanguageValue } from '@/lib/languages'
import { isGuidedTargetLanguage, setSelectedGuidedTargetLanguage } from '@/lib/todayLanguage'
import type { GuidedTargetLanguage } from '@/data/guidedLessons'

/**
 * The canonical target-language bridge.
 *
 * Three per-surface stores predate this file: the guided key (`guided_target_language`,
 * guided naming), the Library key (`resonance.staticLibrary.targetLanguage`) and the
 * app-wide active language (`resonance_active_language_<uid>`, wizard/deck naming).
 * They used to be written independently, so Today, Library and Home could each believe
 * a different language was being learned. LanguageProvider.setActiveLanguage is the one
 * funnel every picker already goes through — it calls syncTargetLanguageStores so a
 * choice made anywhere lands everywhere.
 *
 * Wizard-space and guided-space naming differ for exactly one language
 * ('Bisaya' ↔ 'Cebuano'); this file owns that bridge — nothing else may re-declare it.
 */
export const WIZARD_TO_GUIDED: Record<string, GuidedTargetLanguage> = { Bisaya: 'Cebuano' }
export const GUIDED_TO_WIZARD: Record<string, string> = { Cebuano: 'Bisaya' }

export function toGuidedLanguageName(language: string | null | undefined): string {
  const canonical = canonicalizeLanguageValue(language)
  if (!canonical) return ''
  return WIZARD_TO_GUIDED[canonical] ?? canonical
}

export function toWizardLanguageName(guidedName: string | null | undefined): string {
  const cleaned = guidedName?.trim() ?? ''
  if (!cleaned) return ''
  return GUIDED_TO_WIZARD[cleaned] ?? canonicalizeLanguageValue(cleaned)
}

// Same store DashboardPG/Dashboard read to build availableLanguages. Seeding it here
// guarantees an onboarding-chosen language survives the dashboards' pin effects and
// Decks' empty-state reset (both clobber an active language that is in neither
// decks nor this list).
const addedLanguagesKey = (userId: string) => `lingwave_added_languages_${userId}`

// Sticky "onboarding answered" flag: deliberately separate from the active-language
// key, which Decks.tsx clears when the last deck disappears. Cleared by nothing.
const targetChosenKey = (userId: string) => `lingwave_target_language_chosen_${userId}`

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/** Fan a target-language choice out to every per-surface store except the active-language
 * key itself (LanguageProvider owns that one). Safe for non-beta legacy languages: each
 * store only accepts values its surface understands. */
export function syncTargetLanguageStores(userId: string | null | undefined, language: string | null | undefined): void {
  if (!userId || !canUseLocalStorage()) return
  const canonical = canonicalizeLanguageValue(language)
  if (!canonical) return

  // Guided / Today — only when the language has a guided tier.
  const guided = toGuidedLanguageName(canonical)
  if (isGuidedTargetLanguage(guided)) {
    setSelectedGuidedTargetLanguage(guided)
  }

  // Library — lazily, so the root bundle (LanguageProvider mounts at the app root)
  // never pulls data/categories in statically. Only persisted when the language has
  // a static pack; persisting an unknown value would store the 'English' fallback.
  void import('@/lib/staticLibraryLanguage')
    .then(({ resolveVisibleStaticLanguage, persistStaticLibraryTargetLanguage }) => {
      if (resolveVisibleStaticLanguage(canonical, '')) {
        persistStaticLibraryTargetLanguage(canonical)
      }
    })
    .catch(() => {
      // Best-effort — the Library resolver falls back to the active language anyway.
    })

  // availableLanguages seed (see addedLanguagesKey above).
  try {
    const key = addedLanguagesKey(userId)
    const raw = window.localStorage.getItem(key)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    const list = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
    if (!list.includes(canonical)) {
      window.localStorage.setItem(key, JSON.stringify([...list, canonical]))
    }
  } catch {
    // Best-effort only.
  }
}

export function markTargetLanguageChosen(userId: string | null | undefined): void {
  if (!userId || !canUseLocalStorage()) return
  try {
    window.localStorage.setItem(targetChosenKey(userId), '1')
  } catch {
    // Best-effort only.
  }
}

export function hasLocallyChosenTargetLanguage(userId: string | null | undefined): boolean {
  if (!userId || !canUseLocalStorage()) return false
  try {
    return window.localStorage.getItem(targetChosenKey(userId)) === '1'
  } catch {
    return false
  }
}
