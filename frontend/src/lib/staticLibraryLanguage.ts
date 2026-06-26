import {
  STATIC_CATEGORY_TARGET_LANGUAGES,
  type CategoryWordLevel,
  type SelectedCategoryVocabularyItem,
} from '@/data/categories'
import type { Locale } from '@/lib/translations'

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

/** Whether the learner has ever explicitly stored a Library target language (local preference). */
export function hasStoredStaticLibraryTargetLanguage(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return Boolean(window.localStorage.getItem(STATIC_LIBRARY_TARGET_LANGUAGE_KEY))
  } catch {
    return false
  }
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

const STATIC_LEVEL_LABELS: Partial<Record<Locale, Record<string, string>>> = {
  de: {
    'Basic everyday vegetables': 'Einfaches Alltagsgemüse',
    'Common cooking vegetables': 'H\u00e4ufiges Kochgem\u00fcse',
    'Roots and tubers': 'Wurzeln und Knollen',
    'Leafy greens and salad vegetables': 'Blattgemüse und Salatgemüse',
    'Alliums, stems, and shoots': 'Lauchgewächse, Stiele und Sprossen',
    'Cabbage family and related vegetables': 'Kohlgemüse und verwandtes Gemüse',
    'Pods, beans, and sprouts': 'Schoten, Bohnen und Sprossen',
    'Squash, gourds, and similar vegetables': 'Kürbisgewächse und ähnliches Gemüse',
    'Mushrooms and fungi used as vegetables': 'Pilze als Gemüse',
    'Advanced and regional vegetable vocabulary': 'Fortgeschrittener und regionaler Gemüsewortschatz',
    'Basic staple foods and meals': 'Grundnahrungsmittel und einfache Mahlzeiten',
    'Everyday foods': 'Alltägliche Lebensmittel',
    'Dairy and proteins': 'Milchprodukte und Eiweißquellen',
    'Common drinks': 'H\u00e4ufige Getr\u00e4nke',
    'Sweet foods and desserts': 'Süßes und Desserts',
    'Snacks and casual foods': 'Snacks und einfache Speisen',
    'Condiments, sauces, and spreads': 'Würzmittel, Saucen und Aufstriche',
    'Meals and prepared dishes': 'Mahlzeiten und fertige Gerichte',
    'Baked goods and grains': 'Backwaren und Getreide',
    'Advanced food and drinks': 'Fortgeschrittene Speisen und Getränke',
  },
  fr: {
    'Basic everyday vegetables': 'L\u00e9gumes de base du quotidien',
    'Common cooking vegetables': 'L\u00e9gumes courants pour cuisiner',
    'Roots and tubers': 'Racines et tubercules',
    'Leafy greens and salad vegetables': 'L\u00e9gumes-feuilles et salades',
    'Alliums, stems, and shoots': 'Alliac\u00e9s, tiges et pousses',
    'Cabbage family and related vegetables': 'Choux et l\u00e9gumes apparent\u00e9s',
    'Pods, beans, and sprouts': 'Cosses, haricots et germes',
    'Squash, gourds, and similar vegetables': 'Courges et l\u00e9gumes similaires',
    'Mushrooms and fungi used as vegetables': 'Champignons utilis\u00e9s comme l\u00e9gumes',
    'Advanced and regional vegetable vocabulary': 'Vocabulaire avanc\u00e9 et r\u00e9gional des l\u00e9gumes',
    'Basic staple foods and meals': 'Aliments de base et repas simples',
    'Everyday foods': 'Aliments du quotidien',
    'Dairy and proteins': 'Produits laitiers et prot\u00e9ines',
    'Common drinks': 'Boissons courantes',
    'Sweet foods and desserts': 'Sucreries et desserts',
    'Snacks and casual foods': 'Snacks et plats simples',
    'Condiments, sauces, and spreads': 'Condiments, sauces et tartinades',
    'Meals and prepared dishes': 'Repas et plats pr\u00e9par\u00e9s',
    'Baked goods and grains': 'Produits de boulangerie et c\u00e9r\u00e9ales',
    'Advanced food and drinks': 'Nourriture et boissons avanc\u00e9es',
  },
}

export function getLocalizedStaticLevelLabel(level: CategoryWordLevel, locale: Locale): string {
  return STATIC_LEVEL_LABELS[locale]?.[level.label] ?? level.label
}

export function getAdjacentStaticLevelNumbers(
  levels: CategoryWordLevel[],
  currentLevelNumber: number,
): { previousLevelNumber: number | null; nextLevelNumber: number | null } {
  const currentLevelIndex = levels.findIndex((level) => level.level === currentLevelNumber)
  return {
    previousLevelNumber: currentLevelIndex > 0 ? levels[currentLevelIndex - 1].level : null,
    nextLevelNumber: currentLevelIndex >= 0 && currentLevelIndex < levels.length - 1
      ? levels[currentLevelIndex + 1].level
      : null,
  }
}

export function shouldShowStaticHelperTerm(item: SelectedCategoryVocabularyItem): boolean {
  const helperTerm = item.helperTerm.trim()
  if (!helperTerm) return false

  // Same-language target/helper views intentionally suppress the helper line:
  // the translation would duplicate the target word and make static cards noisy.
  if (item.helperLanguage === item.targetLanguage) return false

  // Missing helper translations are represented as fallback terms so the word
  // card remains renderable. Hide the fallback subtitle, but keep legitimate
  // identical strings when the helper and target languages differ.
  if (item.translations[item.helperLanguage]?.isFallback) return false

  return true
}
