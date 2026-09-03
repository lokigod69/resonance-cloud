/* eslint-disable */
// Scenario-driven stand-in for the ~2 MB thematic library. The Word Stream
// hook dynamic-imports this module and reads two functions; the words they
// serve come from window.__scenario.streamWords (none → no stream → the
// due/rest buoys render exactly as before).

import { scenario, type StreamWordStub } from './scenario'

export function resolveStaticCategoryTargetLanguageCode(language?: string | null): string {
  const value = (language ?? '').trim().toLowerCase()
  if (value.startsWith('kor')) return 'ko'
  if (value.startsWith('pol')) return 'pl'
  if (value.startsWith('eng')) return 'en'
  return 'de'
}

// lib/staticLibraryLanguage.ts entered the Home graph via lib/targetLanguage.ts
// (the canonical-language fan-out). The harness only needs the shape its
// resolver reads — enough entries for fixtures to resolve German/English.
export const STATIC_CATEGORY_TARGET_LANGUAGES = [
  { value: 'English', code: 'en', label: 'English', name: 'English', nativeName: 'English' },
  { value: 'German', code: 'de', label: 'German', name: 'German', nativeName: 'Deutsch' },
]

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
