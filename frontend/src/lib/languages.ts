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

/** Canonical values persisted in profiles.base_language and accepted by the UI locale layer. */
export const BASE_LANGUAGE_VALUES = [
  'English',
  'German',
  'French',
  'Spanish',
  'Italian',
  'Portuguese',
  'Indonesian',
  'Polish',
  'Russian',
  'Korean',
  'Japanese',
  'Bisaya',
] as const

export type BaseLanguageValue = (typeof BASE_LANGUAGE_VALUES)[number]

export const LANGUAGES: Language[] = [
  { value: 'English',    nativeName: 'English',           code: 'en',  landingColor: '#E53935', wizardColor: '#6366f1', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'German',     nativeName: 'Deutsch',           code: 'de',  landingColor: '#FFD700', wizardColor: '#f59e0b', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'French',     nativeName: 'Français',          code: 'fr',  landingColor: '#4A90D9', wizardColor: '#3b82f6', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Italian',    nativeName: 'Italiano',          code: 'it',  landingColor: '#4CAF50', wizardColor: '#22c55e', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Bisaya',     nativeName: 'Bisaya',            code: 'ceb', landingColor: '#AB47BC', wizardColor: '#ef4444', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Tagalog',    nativeName: 'Tagalog',           code: 'fil', landingColor: '#FF6B35', wizardColor: '#06b6d4',                isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Korean',     nativeName: '한국어',             code: 'ko',  landingColor: '#CD2E3A', wizardColor: '#a855f7', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Indonesian', nativeName: 'Bahasa Indonesia',  code: 'id',  landingColor: '#009688', wizardColor: '#f97316', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Dutch',      nativeName: 'Nederlands',        code: 'nl',  landingColor: '#E65100', wizardColor: '#db2777',                isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Spanish',    nativeName: 'Español',           code: 'es',  landingColor: '#C62828', wizardColor: '#ec4c47', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Hindi',      nativeName: 'हिन्दी',              code: 'hi',  landingColor: '#F9A825', wizardColor: '#65a30d',                isWizard: true,  isLanding: true,  isSpeak: true },
  { value: 'Portuguese', nativeName: 'Português',         code: 'pt',                           wizardColor: '#059669', isBase: true,  isWizard: true,                    isSpeak: true },
  { value: 'Arabic',     nativeName: 'العربية',           code: 'ar',                           wizardColor: '#166534',                isWizard: true,                    isSpeak: true },
  { value: 'Russian',    nativeName: 'Русский',           code: 'ru',  landingColor: '#3A5FCD', wizardColor: '#14b8a6', isBase: true, isWizard: true,  isLanding: true,  isSpeak: true },
  // Polish has full guided A1 content + categories (code 'pl' in categories.ts) but is
  // NOT Speak-enabled: api/ LANGUAGE_CONFIG has no 'pl' — do not set isSpeak without Tier 3.
  { value: 'Polish',     nativeName: 'Polski',            code: 'pl',                           wizardColor: '#e11d48', isBase: true,  isWizard: true },
  { value: 'Japanese',   nativeName: '日本語',             code: 'ja',                           wizardColor: '#eab308', isBase: true,  isWizard: true },
]

/** Build a "Native (English)" label, collapsing to a single name when they match. */
export function getDisplayLabel(lang: Language): string {
  return lang.nativeName === lang.value ? lang.value : `${lang.nativeName} (${lang.value})`
}

export const BASE_LANGUAGES = BASE_LANGUAGE_VALUES.map((value) => {
  const language = LANGUAGES.find((item) => item.value === value && item.isBase)
  if (!language) throw new Error(`Missing base language registry entry: ${value}`)
  return language
})
export const WIZARD_LANGUAGES  = LANGUAGES.filter((l) => l.isWizard)
export const LANDING_LANGUAGES = LANGUAGES.filter((l) => l.isLanding)
export const SPEAK_LANGUAGES   = LANGUAGES.filter((l) => l.isSpeak)

export function isBaseLanguageValue(language: string | null | undefined): language is BaseLanguageValue {
  return typeof language === 'string'
    && (BASE_LANGUAGE_VALUES as readonly string[]).includes(language)
}

/**
 * The invite-only beta offers exactly these target languages (owner call,
 * 2026-07-27: 8 complete ones, no half-wired shells). Criteria: guided A1+A2,
 * a Library pack, Speak support in api LANGUAGE_CONFIG, and Latin script (the
 * typed-recall surfaces have no non-Latin input path yet). Wizard-space naming
 * ('Bisaya', not 'Cebuano'). Every user-facing language picker filters through
 * this list; registries and resolvers stay untrimmed so existing decks in
 * dropped languages keep working. Swap entries here, nowhere else.
 */
export const BETA_TARGET_LANGUAGES = [
  'English', 'German', 'Spanish', 'French', 'Italian', 'Portuguese', 'Bisaya', 'Indonesian',
] as const

export function isBetaTargetLanguage(language: string | null | undefined): boolean {
  if (!language) return false
  const canonical = canonicalizeLanguageValue(language)
  return (BETA_TARGET_LANGUAGES as readonly string[]).includes(canonical)
}

export const BETA_WIZARD_LANGUAGES = WIZARD_LANGUAGES.filter((l) =>
  (BETA_TARGET_LANGUAGES as readonly string[]).includes(l.value))

/**
 * Languages whose script the typed-recall surfaces cannot honestly serve: the
 * forgiving matcher (lib/typedAnswer.ts) is structurally Latin-only — edit
 * distance over Hangul syllable blocks or kanji does not mean what it means
 * over letters — and a tester without the script's keyboard cannot type the
 * answer at all. Typed study modes hide behind this check; tap/voice surfaces
 * (chips, match-pairs, Script Lab, Speak) are unaffected.
 */
const NON_LATIN_SCRIPT_LANGUAGES = new Set(['Korean', 'Russian', 'Japanese', 'Arabic', 'Hindi'])

export function isLatinScriptLanguage(language: string | null | undefined): boolean {
  const canonical = canonicalizeLanguageValue(language)
  return canonical ? !NON_LATIN_SCRIPT_LANGUAGES.has(canonical) : true
}

/** The exact language→code resolution Speak uses before persisting
 * `speak_conversations.language` (Speak.tsx picks `.code` off its
 * SPEAK_LANGUAGES entry by display value). Home's spoke-today check must query
 * with this — never re-derive through getLanguageCode/canonicalize, or the two
 * surfaces drift the moment a mapping diverges. */
export function speakConversationLanguageCode(language: string | null | undefined): string | null {
  if (!language) return null
  return SPEAK_LANGUAGES.find((l) => l.value === language)?.code ?? null
}

function cleanLanguageInput(language: string | null | undefined): string {
  return language?.trim() ?? ''
}

// Names that reach us from other namespaces but are the same language as a
// registry entry. 'Cebuano' is guided-space naming for the 'Bisaya' row — without
// this alias a `?lang=Cebuano` route param stored a phantom second language.
const LANGUAGE_VALUE_ALIASES: Record<string, string> = {
  cebuano: 'Bisaya',
}

export function canonicalizeLanguageValue(language: string | null | undefined): string {
  const cleaned = cleanLanguageInput(language)
  if (!cleaned) return ''

  const normalized = cleaned.toLowerCase()
  return (
    LANGUAGES.find((l) => l.code.toLowerCase() === normalized)?.value
    ?? LANGUAGES.find((l) => l.value.toLowerCase() === normalized)?.value
    ?? LANGUAGE_VALUE_ALIASES[normalized]
    ?? cleaned
  )
}

/** Resolve only supported base languages; unknown legacy values stay explicit as null. */
export function canonicalizeBaseLanguageValue(
  language: string | null | undefined,
): BaseLanguageValue | null {
  const canonical = canonicalizeLanguageValue(language)
  return isBaseLanguageValue(canonical) ? canonical : null
}

export function getBaseLanguageCode(language: string | null | undefined): string | null {
  const canonical = canonicalizeBaseLanguageValue(language)
  return canonical ? LANGUAGES.find((item) => item.value === canonical)?.code ?? null : null
}

const INTL_LOCALES: Record<BaseLanguageValue, string> = {
  English: 'en-US',
  German: 'de-DE',
  French: 'fr-FR',
  Spanish: 'es-ES',
  Italian: 'it-IT',
  Portuguese: 'pt-BR',
  Indonesian: 'id-ID',
  Polish: 'pl-PL',
  Russian: 'ru-RU',
  Korean: 'ko-KR',
  Japanese: 'ja-JP',
  Bisaya: 'ceb-PH',
}

/** A stable Intl locale for the resolved UI locale/base-language code. */
export function getIntlLocale(languageOrCode: string | null | undefined): string {
  const canonical = canonicalizeBaseLanguageValue(languageOrCode)
  return canonical ? INTL_LOCALES[canonical] : 'en-US'
}

export function canUseLegacyGermanCurriculum(language: string | null | undefined): boolean {
  return canonicalizeBaseLanguageValue(language) === 'German'
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
