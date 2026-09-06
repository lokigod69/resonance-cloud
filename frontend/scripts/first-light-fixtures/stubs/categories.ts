// Scenario-driven stand-in for the ~2 MB thematic library. The Word Stream
// hook dynamic-imports this module and reads two functions; the words they
// serve come from window.__scenario.streamWords (none → no stream → the
// due/rest buoys render exactly as before).

import { scenario, type StreamWordStub } from './scenario'
import { resolveStaticCategoryTargetLanguageCode, STATIC_CATEGORY_TRANSLATION_LANGUAGES } from '@/data/staticCategoryLanguages'
export { resolveStaticCategoryTargetLanguageCode }
export const STATIC_CATEGORY_TARGET_LANGUAGES = STATIC_CATEGORY_TRANSLATION_LANGUAGES.filter((entry) => entry.status !== 'hidden')
export const STATIC_CATEGORY_BETA_TARGET_LANGUAGES = STATIC_CATEGORY_TARGET_LANGUAGES.filter((entry) => ['English', 'German', 'Spanish', 'French', 'Italian', 'Portuguese', 'Bisaya', 'Indonesian'].includes(entry.value))
export const PINNED_BOTTOM_CATEGORIES = []

const CATEGORY_META: Record<string, { labelKey: string; emoji: string }> = {
  animals: { labelKey: 'category.animals', emoji: '🐾' },
  fruits: { labelKey: 'category.fruits', emoji: '🍎' },
  food_drinks: { labelKey: 'category.foodDrinks', emoji: '🍽️' },
}

function streamWords(): StreamWordStub[] {
  return scenario().streamWords ?? []
}

export function getPublicCategoryGroups() {
  const slugs = Array.from(new Set(streamWords().map((word) => word.categorySlug)))
  return [{
    label: 'Fixture',
    groupKey: 'category.group.fixture',
    emoji: '·',
    categories: slugs.map((slug) => ({
      id: slug,
      name: slug,
      emoji: CATEGORY_META[slug]?.emoji ?? '·',
      labelKey: CATEGORY_META[slug]?.labelKey ?? `category.${slug}`,
      staticWordLevels: [{ level: 1, label: 'Level 1', words: streamWords().filter((w) => w.categorySlug === slug).map((w) => w.target) }],
    })),
  }]
}

export const getCategoryGroups = getPublicCategoryGroups

export function getStaticCategorySelectedItems(
  category: { id?: string; name: string },
  _requestedCount: number,
  _levelNumber: number | undefined,
  targetLanguage: string | null | undefined,
  helperLanguage: string | null | undefined,
) {
  const targetCode = resolveStaticCategoryTargetLanguageCode(targetLanguage)
  const helperCode = resolveStaticCategoryTargetLanguageCode(helperLanguage)
  const slug = category.id ?? category.name
  return streamWords()
    .filter((word) => word.categorySlug === slug)
    .map((word, index) => ({
      conceptId: word.conceptId,
      itemId: word.conceptId,
      categoryId: slug,
      level: word.level,
      order: index + 1,
      part_of_speech: 'noun',
      sense: slug,
      targetLanguage: targetCode,
      targetLanguageName: targetLanguage ?? 'German',
      targetTerm: word.target,
      helperLanguage: helperCode,
      helperLanguageName: helperLanguage ?? 'English',
      helperTerm: word.helper,
      translations: {
        [targetCode]: { term: word.target },
        [helperCode]: { term: word.helper },
        en: { term: word.helper },
      },
    }))
}
