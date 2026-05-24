import {
  getPublicCategoryGroups,
  getStaticCategoryVocabularyItems,
  STATIC_CATEGORY_TRANSLATION_LANGUAGES,
  type Category,
  type StaticCategoryTargetLanguageCode,
  type StaticCategoryVocabularyItem,
} from '../src/data/categories.ts'

export type TranslationReviewRow = {
  conceptId: string
  categoryId: string
  categoryLabel: string
  level: number
  order: number
  part_of_speech: string
  sense: string
  englishTerm: string
  language: StaticCategoryTargetLanguageCode
  targetTerm: string
  needsReview: boolean
  reviewNote: string
  duplicateWarning: string
}

export type TranslationDuplicateCluster = {
  categoryId: string
  categoryLabel: string
  language: StaticCategoryTargetLanguageCode
  term: string
  conceptIds: string[]
  englishTerms: string[]
}

export type TranslationQualitySummary = {
  conceptCount: number
  languages: StaticCategoryTargetLanguageCode[]
  missingByLanguage: Record<StaticCategoryTargetLanguageCode, number>
  emptyByLanguage: Record<StaticCategoryTargetLanguageCode, number>
  needsReviewByLanguage: Record<StaticCategoryTargetLanguageCode, number>
  needsReviewByCategoryLanguage: Record<string, number>
  duplicateClusters: TranslationDuplicateCluster[]
}

type CategoryItem = {
  category: Category
  item: StaticCategoryVocabularyItem
}

export function listStaticCategoryItems(): CategoryItem[] {
  return getPublicCategoryGroups()
    .flatMap((group) => group.categories)
    .filter((category) => category.staticWordLevels?.length)
    .flatMap((category) => getStaticCategoryVocabularyItems(category).map((item) => ({ category, item })))
}

export function getStaticTranslationQualitySummary(): TranslationQualitySummary {
  const categoryItems = listStaticCategoryItems()
  const languages = STATIC_CATEGORY_TRANSLATION_LANGUAGES.map((language) => language.code)
  const missingByLanguage = emptyLanguageCounts(languages)
  const emptyByLanguage = emptyLanguageCounts(languages)
  const needsReviewByLanguage = emptyLanguageCounts(languages)
  const needsReviewByCategoryLanguage: Record<string, number> = {}

  for (const { category, item } of categoryItems) {
    for (const language of languages) {
      const translation = item.translations[language]
      if (!translation) {
        missingByLanguage[language] += 1
        continue
      }
      if (!translation.term.trim()) emptyByLanguage[language] += 1
      if (translation.needsReview) {
        needsReviewByLanguage[language] += 1
        const key = `${category.id}:${language}`
        needsReviewByCategoryLanguage[key] = (needsReviewByCategoryLanguage[key] ?? 0) + 1
      }
    }
  }

  return {
    conceptCount: categoryItems.length,
    languages,
    missingByLanguage,
    emptyByLanguage,
    needsReviewByLanguage,
    needsReviewByCategoryLanguage,
    duplicateClusters: getDuplicateTranslationClusters(),
  }
}

export function getDuplicateTranslationClusters(): TranslationDuplicateCluster[] {
  const clusters: TranslationDuplicateCluster[] = []
  const categories = getPublicCategoryGroups()
    .flatMap((group) => group.categories)
    .filter((category) => category.staticWordLevels?.length)
  const languages = STATIC_CATEGORY_TRANSLATION_LANGUAGES.map((language) => language.code)

  for (const category of categories) {
    const items = getStaticCategoryVocabularyItems(category)
    for (const language of languages) {
      const byTerm = new Map<string, StaticCategoryVocabularyItem[]>()
      for (const item of items) {
        const term = item.translations[language]?.term.trim().normalize('NFC').toLowerCase()
        if (!term) continue
        const matches = byTerm.get(term) ?? []
        matches.push(item)
        byTerm.set(term, matches)
      }

      for (const [term, matches] of byTerm.entries()) {
        if (matches.length < 2) continue
        clusters.push({
          categoryId: category.id ?? category.name,
          categoryLabel: category.name,
          language,
          term,
          conceptIds: matches.map((item) => item.id),
          englishTerms: matches.map((item) => item.translations.en.term),
        })
      }
    }
  }

  return clusters
}

export function buildTranslationReviewRows(args: {
  language: StaticCategoryTargetLanguageCode
  categoryId?: string
  levels?: Set<number>
  needsReviewOnly?: boolean
}): TranslationReviewRow[] {
  const duplicateWarningsByItem = new Map<string, string[]>()
  for (const cluster of getDuplicateTranslationClusters()) {
    if (cluster.language !== args.language) continue
    const warning = `${cluster.term}: ${cluster.englishTerms.join(', ')}`
    for (const conceptId of cluster.conceptIds) {
      const warnings = duplicateWarningsByItem.get(conceptId) ?? []
      warnings.push(warning)
      duplicateWarningsByItem.set(conceptId, warnings)
    }
  }

  return listStaticCategoryItems()
    .filter(({ category, item }) => {
      if (args.categoryId && category.id !== args.categoryId) return false
      if (args.levels && !args.levels.has(item.level)) return false
      if (args.needsReviewOnly && !item.translations[args.language]?.needsReview) return false
      return true
    })
    .map(({ category, item }) => {
      const translation = item.translations[args.language]
      return {
        conceptId: item.id,
        categoryId: item.categoryId,
        categoryLabel: category.name,
        level: item.level,
        order: item.order,
        part_of_speech: item.part_of_speech,
        sense: item.sense,
        englishTerm: item.translations.en.term,
        language: args.language,
        targetTerm: translation?.term ?? '',
        needsReview: translation?.needsReview === true,
        reviewNote: translation?.reviewNote ?? '',
        duplicateWarning: duplicateWarningsByItem.get(item.id)?.join('; ') ?? '',
      }
    })
}

function emptyLanguageCounts(languages: StaticCategoryTargetLanguageCode[]) {
  return Object.fromEntries(languages.map((language) => [language, 0])) as Record<StaticCategoryTargetLanguageCode, number>
}
