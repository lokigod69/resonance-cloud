import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  getPublicCategoryGroups,
  getStaticCategoryWords,
  getStaticCategoryVocabularyItems,
  STATIC_CATEGORY_TRANSLATION_LANGUAGES,
  STATIC_CATEGORY_TARGET_LANGUAGES,
  type StaticCategoryTargetLanguageCode,
} from '../src/data/categories.ts'

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['export:translation-review'],
  'tsx scripts/export-static-translation-review.ts',
  'package.json should expose a static translation review export command',
)
assert.ok(
  existsSync(resolve(process.cwd(), 'scripts/export-static-translation-review.ts')),
  'translation review export script should exist',
)

const expectedLanguageCodes: StaticCategoryTargetLanguageCode[] = ['en', 'de', 'fr', 'es', 'pt', 'it', 'pl', 'id', 'ceb', 'ko']
const expectedVisibleLanguageCodes: StaticCategoryTargetLanguageCode[] = ['en', 'de', 'fr', 'es', 'pt', 'it', 'pl', 'id', 'ko']

assert.deepEqual(
  STATIC_CATEGORY_TRANSLATION_LANGUAGES.map((language) => language.code),
  expectedLanguageCodes,
  'static category vocabulary should validate every stored translation language, including hidden review languages',
)
assert.deepEqual(
  STATIC_CATEGORY_TARGET_LANGUAGES.map((language) => language.code),
  expectedVisibleLanguageCodes,
  'static category vocabulary selector should hide languages that are not ready for public selection',
)
assert.equal(
  STATIC_CATEGORY_TARGET_LANGUAGES.find((language) => language.code === 'ko')?.status,
  'experimental',
  'Korean should be visible but marked experimental',
)
assert.equal(
  STATIC_CATEGORY_TRANSLATION_LANGUAGES.find((language) => language.code === 'ceb')?.status,
  'hidden',
  'Cebuano should remain stored for review but hidden from the normal selector',
)
assert.match(
  STATIC_CATEGORY_TARGET_LANGUAGES.find((language) => language.code === 'ko')?.label ?? '',
  /experimental|review/i,
  'Korean selector label should visibly communicate review status',
)

const publicCategories = getPublicCategoryGroups().flatMap((group) => group.categories)
const staticCategories = publicCategories.filter((category) => category.staticWordLevels?.length)
assert.ok(staticCategories.length >= 19, 'all public thematic static categories should be discoverable')

const staticVocabularyItems = staticCategories.flatMap((category) => getStaticCategoryVocabularyItems(category))
assert.ok(staticVocabularyItems.length >= 1800, 'static concept vocabulary should include all thematic pack items')

for (const category of staticCategories) {
  const items = getStaticCategoryVocabularyItems(category)
  const expectedCount = category.staticWordLevels?.reduce((sum, level) => sum + level.words.length, 0) ?? 0
  assert.equal(items.length, expectedCount, `${category.id} concept item count should match level source count`)
  for (const item of items) {
    assert.ok(item.id.startsWith(`${category.id}.`), `${item.id} should be prefixed by its category id`)
    assert.equal(item.categoryId, category.id, `${item.id} should carry categoryId`)
    assert.equal(typeof item.level, 'number', `${item.id} should carry level`)
    assert.equal(typeof item.order, 'number', `${item.id} should carry order`)
    assert.ok(item.part_of_speech, `${item.id} should carry part_of_speech`)
    assert.ok(item.sense, `${item.id} should carry sense`)
    assert.notEqual(item.id, item.translations.en.term, `${item.id} should not use the raw English term as its only id`)
    for (const language of expectedLanguageCodes) {
      const translation = item.translations[language]
      assert.ok(translation, `${item.id} should include ${language} translation object`)
      assert.ok(translation.term.trim().length > 0, `${item.id} should include a non-empty ${language} term`)
    }
  }
}

const animals = publicCategories.find((category) => category.id === 'animals')
const fruits = publicCategories.find((category) => category.id === 'fruits')
const money = publicCategories.find((category) => category.id === 'money_shopping_services')
const feelings = publicCategories.find((category) => category.id === 'feelings_states')
const education = publicCategories.find((category) => category.id === 'education_learning')
const homeObjects = publicCategories.find((category) => category.id === 'home_objects')
assert.ok(animals)
assert.ok(fruits)
assert.ok(money)
assert.ok(feelings)
assert.ok(education)
assert.ok(homeObjects)

assert.deepEqual(getStaticCategoryWords(animals, 4, 1, 'German'), ['Hund', 'Katze', 'Vogel', 'Fisch'])
assert.deepEqual(getStaticCategoryWords(animals, 3, 1, 'ceb'), ['iro', 'iring', 'langgam'])
assert.deepEqual(getStaticCategoryWords(fruits, 3, 1, 'Spanish'), ['manzana', 'plátano', 'naranja'])
assert.deepEqual(getStaticCategoryWords(money, 3, 5, 'Portuguese'), ['conta bancária', 'conta poupança', 'conta corrente'])
assert.deepEqual(getStaticCategoryWords(feelings, 3, 1, 'Polish'), ['szczęśliwy', 'smutny', 'zły'])
assert.deepEqual(getStaticCategoryWords(education, 3, 4, 'Italian'), ['imparare', 'studiare', 'leggere'])

assert.deepEqual(getStaticCategoryWords(homeObjects, 3, 1, 'Korean'), ['의자', '테이블', '침대'])

const englishAnimalItems = getStaticCategoryVocabularyItems(animals)
assert.deepEqual(
  englishAnimalItems.slice(0, 4).map((item) => item.id),
  ['animals.dog', 'animals.cat', 'animals.bird', 'animals.fish'],
  'concept ids should be stable and derived from category plus English concept slug',
)

console.log('test-static-category-translations: OK')
