import assert from 'node:assert/strict'

import {
  getPublicCategoryGroups,
  getStaticCategoryWords,
  getStaticCategoryVocabularyItems,
  STATIC_CATEGORY_TARGET_LANGUAGES,
  type StaticCategoryTargetLanguageCode,
} from '../src/data/categories.ts'

const expectedLanguageCodes: StaticCategoryTargetLanguageCode[] = ['en', 'de', 'fr', 'es', 'pt', 'it', 'pl', 'id', 'ceb']

assert.deepEqual(
  STATIC_CATEGORY_TARGET_LANGUAGES.map((language) => language.code),
  expectedLanguageCodes,
  'static category vocabulary should expose the initial Latin-script target language set',
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
assert.ok(animals)
assert.ok(fruits)
assert.ok(money)
assert.ok(feelings)
assert.ok(education)

assert.deepEqual(getStaticCategoryWords(animals, 4, 1, 'German'), ['Hund', 'Katze', 'Vogel', 'Fisch'])
assert.deepEqual(getStaticCategoryWords(animals, 3, 1, 'ceb'), ['iro', 'iring', 'langgam'])
assert.deepEqual(getStaticCategoryWords(fruits, 3, 1, 'Spanish'), ['manzana', 'plátano', 'naranja'])
assert.deepEqual(getStaticCategoryWords(money, 3, 5, 'Portuguese'), ['conta bancária', 'conta poupança', 'conta corrente'])
assert.deepEqual(getStaticCategoryWords(feelings, 3, 1, 'Polish'), ['szczęśliwy', 'smutny', 'zły'])
assert.deepEqual(getStaticCategoryWords(education, 3, 4, 'Italian'), ['imparare', 'studiare', 'leggere'])

const englishAnimalItems = getStaticCategoryVocabularyItems(animals)
assert.deepEqual(
  englishAnimalItems.slice(0, 4).map((item) => item.id),
  ['animals.dog', 'animals.cat', 'animals.bird', 'animals.fish'],
  'concept ids should be stable and derived from category plus English concept slug',
)

console.log('test-static-category-translations: OK')
