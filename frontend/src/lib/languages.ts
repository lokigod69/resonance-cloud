// Single source of truth for all supported languages.
// Different UI surfaces use different subsets — see capability flags.
//
// To add a new language:
//   1. Append a new entry below
//   2. Set the appropriate isBase/isWizard/isLanding/isSpeak flags
//   3. Pick distinct landingColor / wizardColor values if applicable
//   4. (For voice tutor) make sure voiceRegistry.ts has a TUTOR_VOICES entry for the code
//   5. (Optional) add a langName.<Value> translation key in translations.ts

export interface Language {
  /** English name. Matches Supabase profile.base_language values. */
  value: string
  /** Native script name, e.g. '한국어', 'Deutsch'. Used by Speak page and as a label root. */
  nativeName: string
  /** ISO 639-1 (or BCP-47) code as used by ElevenLabs / FlagIcon / locale lookups. */
  code: string
  /** Color used by the landing showcase chips (Material palette). */
  landingColor?: string
  /** Color used by the generation wizard tiles (Tailwind palette). */
  wizardColor?: string

  /** Selectable as user's base/UI language in Settings, Onboarding, ProfileModal. */
  isBase?: boolean
  /** Selectable as a target learning language in the generation wizard. */
  isWizard?: boolean
  /** Shown in the landing page language showcase. */
  isLanding?: boolean
  /** Available in the Speak voice tutor. */
  isSpeak?: boolean
}

export const LANGUAGES: Language[] = [
  { value: 'English',    nativeName: 'English',           code: 'en',  landingColor: '#E53935', wizardColor: '#6366f1', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'German',     nativeName: 'Deutsch',           code: 'de',  landingColor: '#FFD700', wizardColor: '#f59e0b', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'French',     nativeName: 'Français',          code: 'fr',  landingColor: '#4A90D9', wizardColor: '#3b82f6', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Italian',    nativeName: 'Italiano',          code: 'it',  landingColor: '#4CAF50', wizardColor: '#22c55e', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Bisaya',     nativeName: 'Bisaya',            code: 'ceb', landingColor: '#AB47BC', wizardColor: '#ef4444', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Tagalog',    nativeName: 'Tagalog',           code: 'fil', landingColor: '#FF6B35', wizardColor: '#06b6d4', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Korean',     nativeName: '한국어',             code: 'ko',  landingColor: '#CD2E3A', wizardColor: '#a855f7', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Indonesian', nativeName: 'Bahasa Indonesia',  code: 'id',  landingColor: '#009688', wizardColor: '#f97316',                isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Dutch',      nativeName: 'Nederlands',        code: 'nl',  landingColor: '#E65100', wizardColor: '#db2777',                isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Spanish',    nativeName: 'Español',           code: 'es',  landingColor: '#C62828', wizardColor: '#ec4c47', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Hindi',      nativeName: 'हिन्दी',              code: 'hi',  landingColor: '#F9A825', wizardColor: '#65a30d',                isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Portuguese', nativeName: 'Português',         code: 'pt',                           wizardColor: '#059669',                isWizard: true,                    isSpeak: true },
  { value: 'Arabic',     nativeName: 'العربية',           code: 'ar',                           wizardColor: '#166534',                isWizard: true,                    isSpeak: true },
  { value: 'Russian',    nativeName: 'Русский',           code: 'ru',  landingColor: '#3A5FCD', wizardColor: '#14b8a6', isWizard: true,  isLanding: true,  isSpeak: true },
  // Polish has full guided A1 content + categories (code 'pl' in categories.ts) but is
  // NOT Speak-enabled: api/ LANGUAGE_CONFIG has no 'pl' — do not set isSpeak without Tier 3.
  { value: 'Polish',     nativeName: 'Polski',            code: 'pl',                           wizardColor: '#e11d48',                isWizard: true },
]

/** Build a "Native (English)" label, collapsing to a single name when they match. */
export function getDisplayLabel(lang: Language): string {
  return lang.nativeName === lang.value ? lang.value : `${lang.nativeName} (${lang.value})`
}

export const BASE_LANGUAGES    = LANGUAGES.filter((l) => l.isBase)
export const WIZARD_LANGUAGES  = LANGUAGES.filter((l) => l.isWizard)
export const LANDING_LANGUAGES = LANGUAGES.filter((l) => l.isLanding)
export const SPEAK_LANGUAGES   = LANGUAGES.filter((l) => l.isSpeak)

function cleanLanguageInput(language: string | null | undefined): string {
  return language?.trim() ?? ''
}

export function canonicalizeLanguageValue(language: string | null | undefined): string {
  const cleaned = cleanLanguageInput(language)
  if (!cleaned) return ''

  const normalized = cleaned.toLowerCase()
  return (
    LANGUAGES.find((l) => l.code.toLowerCase() === normalized)?.value
    ?? LANGUAGES.find((l) => l.value.toLowerCase() === normalized)?.value
    ?? cleaned
  )
}

export function getLanguageCode(language: string | null | undefined): string {
  const cleaned = cleanLanguageInput(language)
  if (!cleaned) return ''

  const normalized = cleaned.toLowerCase()
  const canonical = canonicalizeLanguageValue(cleaned)
  return (
    LANGUAGES.find((l) => l.code.toLowerCase() === normalized)?.code
    ?? LANGUAGES.find((l) => l.value === canonical)?.code
    ?? cleaned
  )
}

export function getLanguageQueryValues(language: string | null | undefined): string[] {
  const cleaned = cleanLanguageInput(language)
  const canonical = canonicalizeLanguageValue(cleaned)
  const code = getLanguageCode(cleaned)
  return Array.from(new Set([canonical, code, cleaned].filter(Boolean)))
}

export function languagesMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const leftCanonical = canonicalizeLanguageValue(left)
  const rightCanonical = canonicalizeLanguageValue(right)
  return Boolean(leftCanonical && rightCanonical && leftCanonical === rightCanonical)
}

// Maps an ISO code (e.g. 'en') to the canonical wizard-value form
// (e.g. 'English') used by decks.target_language and profiles.base_language.
// Mirror of profileBaseLanguageToIso in curriculumCategories.ts. Also accepts
// the full-word form (case-insensitive) as a defensive path against schema
// drift in curriculum JSON. Falls back to the raw input if unrecognized so
// the caller can still surface a coherent error downstream. Empty string on
// null/undefined is load-bearing — triggers the RPC's required-param check.
export function isoToWizardValue(iso: string | null | undefined): string {
  return canonicalizeLanguageValue(iso)
}
