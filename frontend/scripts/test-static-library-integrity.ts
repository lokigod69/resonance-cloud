import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  getPublicCategoryGroups,
  getStaticCategorySelectedItems,
  getStaticCategoryVocabularyItems,
  STATIC_CATEGORY_TARGET_LANGUAGES,
  STATIC_CATEGORY_TRANSLATION_LANGUAGES,
} from '../src/data/categories.ts'
import { curriculumEntryImagePath } from '../src/lib/curriculumImagePath.ts'
import { generatedCategoryEntryImagePath } from '../src/lib/generatedCategoryImages.ts'

function publicAssetExists(assetPath: string | null): boolean {
  if (!assetPath) return false
  const relativePath = assetPath.replace(/^\/+/, '')
  return existsSync(resolve(process.cwd(), 'public', relativePath))
}

const staticCategories = getPublicCategoryGroups()
  .flatMap((group) => group.categories)
  .filter((category) => category.staticWordLevels?.length)

const missingImagePaths: string[] = []
const missingTranslations: string[] = []
const fallbackTranslations: string[] = []
const duplicateVisibleTerms: string[] = []

for (const category of staticCategories) {
  const categorySlug = category.id ?? category.name
  for (const level of category.staticWordLevels ?? []) {
    const sourceCount = level.words.length
    const vocabularyItems = getStaticCategoryVocabularyItems(category, level.level)
    assert.equal(
      vocabularyItems.length,
      sourceCount,
      `${categorySlug} level ${level.level} source count should equal vocabulary item count`,
    )

    const conceptIds = new Set<string>()
    for (const item of vocabularyItems) {
      assert.ok(item.id, `${categorySlug} level ${level.level} should not contain blank concept ids`)
      assert.ok(!conceptIds.has(item.id), `${categorySlug} level ${level.level} contains duplicate concept id ${item.id}`)
      conceptIds.add(item.id)
      assert.ok(item.translations.en.term.trim(), `${item.id} should include a non-empty English source term`)

      const generatedImage = generatedCategoryEntryImagePath('en', categorySlug, item.translations.en.term)
      const legacyImage = curriculumEntryImagePath('en', categorySlug, item.translations.en.term)
      if (!publicAssetExists(generatedImage) && !publicAssetExists(legacyImage)) {
        missingImagePaths.push(`${categorySlug} level ${level.level}: ${item.id} (${item.translations.en.term})`)
      }

      for (const language of STATIC_CATEGORY_TRANSLATION_LANGUAGES) {
        const translation = item.translations[language.code]
        if (!translation?.term.trim()) {
          missingTranslations.push(`${categorySlug} level ${level.level}: ${item.id} missing ${language.code}`)
        } else if (translation.isFallback && language.code !== 'en') {
          fallbackTranslations.push(`${categorySlug} level ${level.level}: ${item.id} fallback ${language.code}`)
        }
      }
    }

    for (const targetLanguage of STATIC_CATEGORY_TARGET_LANGUAGES) {
      const selectedItems = getStaticCategorySelectedItems(
        category,
        sourceCount,
        level.level,
        targetLanguage.value,
        'German',
        { dedupeTargetTerms: false },
      )
      assert.equal(
        selectedItems.length,
        sourceCount,
        `${categorySlug} level ${level.level} should render ${sourceCount} ${targetLanguage.value} cards`,
      )
      assert.equal(
        new Set(selectedItems.map((item) => item.conceptId)).size,
        selectedItems.length,
        `${categorySlug} level ${level.level} should not collide render keys for ${targetLanguage.value}`,
      )

      const visibleTerms = new Set<string>()
      for (const item of selectedItems) {
        const visibleTerm = item.targetTerm.trim().normalize('NFC').toLowerCase()
        if (visibleTerms.has(visibleTerm)) {
          duplicateVisibleTerms.push(`${categorySlug} level ${level.level}: duplicate ${targetLanguage.value} term "${item.targetTerm}"`)
        }
        visibleTerms.add(visibleTerm)
      }
    }
  }
}

assert.equal(missingTranslations.length, 0, `static library has blank translations:\n${missingTranslations.join('\n')}`)

if (fallbackTranslations.length > 0) {
  console.warn(`test-static-library-integrity: ${fallbackTranslations.length} fallback translations\n${fallbackTranslations.slice(0, 25).join('\n')}`)
}

if (missingImagePaths.length > 0) {
  console.warn(`test-static-library-integrity: ${missingImagePaths.length} image fallbacks\n${missingImagePaths.slice(0, 25).join('\n')}`)
}

if (duplicateVisibleTerms.length > 0) {
  console.warn(`test-static-library-integrity: ${duplicateVisibleTerms.length} duplicate visible translations\n${duplicateVisibleTerms.slice(0, 25).join('\n')}`)
}

console.log(
  `test-static-library-integrity: OK (${staticCategories.length} categories, ${fallbackTranslations.length} fallback translations, ${missingImagePaths.length} image fallbacks, ${duplicateVisibleTerms.length} duplicate visible translations)`,
)
