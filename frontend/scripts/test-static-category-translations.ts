import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  getPublicCategoryGroups,
  getStaticCategorySelectedItems,
  getStaticCategoryWords,
  getStaticCategoryVocabularyItems,
  STATIC_CATEGORY_TRANSLATION_LANGUAGES,
  STATIC_CATEGORY_TARGET_LANGUAGES,
  type StaticCategoryTargetLanguageCode,
} from '../src/data/categories.ts'
import {
  getAdjacentStaticLevelNumbers,
  getLocalizedStaticLevelLabel,
  shouldShowStaticHelperTerm,
} from '../src/lib/staticLibraryLanguage.ts'

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
const vegetables = publicCategories.find((category) => category.id === 'vegetables')
const foodDrinks = publicCategories.find((category) => category.id === 'food_drinks')
assert.ok(animals)
assert.ok(fruits)
assert.ok(money)
assert.ok(feelings)
assert.ok(education)
assert.ok(homeObjects)
assert.ok(vegetables)
assert.ok(foodDrinks)

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

const vegetableLevel2 = vegetables.staticWordLevels?.find((level) => level.level === 2)
const foodDrinksLevel4 = foodDrinks.staticWordLevels?.find((level) => level.level === 4)
assert.ok(vegetableLevel2)
assert.ok(foodDrinksLevel4)
assert.equal(
  getLocalizedStaticLevelLabel(vegetableLevel2, 'de'),
  'H\u00e4ufiges Kochgem\u00fcse',
  'German UI should localize visible static vegetable level titles',
)
assert.equal(
  getLocalizedStaticLevelLabel(vegetableLevel2, 'fr'),
  'L\u00e9gumes courants pour cuisiner',
  'French UI should localize visible static vegetable level titles',
)
assert.equal(
  getLocalizedStaticLevelLabel(foodDrinksLevel4, 'de'),
  'H\u00e4ufige Getr\u00e4nke',
  'German UI should localize visible static food/drink level titles',
)
assert.equal(
  getLocalizedStaticLevelLabel(foodDrinksLevel4, 'fr'),
  'Boissons courantes',
  'French UI should localize visible static food/drink level titles',
)
assert.notEqual(
  getLocalizedStaticLevelLabel(vegetableLevel2, 'de'),
  'Common cooking vegetables',
  'German UI should not fall back to English when a taxonomy translation exists',
)
assert.notEqual(
  getLocalizedStaticLevelLabel(vegetableLevel2, 'fr'),
  'Common cooking vegetables',
  'French UI should not fall back to English when a taxonomy translation exists',
)

const englishWithGermanHelper = getStaticCategorySelectedItems(animals, 1, 1, 'English', 'German')[0]
const englishWithEnglishHelper = getStaticCategorySelectedItems(animals, 1, 1, 'English', 'English')[0]
const frenchWithFrenchHelper = getStaticCategorySelectedItems(animals, 1, 1, 'French', 'French')[0]
const englishWithFrenchHelper = getStaticCategorySelectedItems(animals, 1, 1, 'English', 'French')[0]
assert.equal(shouldShowStaticHelperTerm(englishWithGermanHelper), true, 'different target/helper language should show helper translation')
assert.equal(shouldShowStaticHelperTerm(englishWithEnglishHelper), false, 'same target/helper language should hide duplicate helper translation')
assert.equal(shouldShowStaticHelperTerm(frenchWithFrenchHelper), false, 'same non-English target/helper language should hide duplicate helper translation')
assert.equal(shouldShowStaticHelperTerm(englishWithFrenchHelper), true, 'French UI with English target should show French helper translation')
assert.equal(
  shouldShowStaticHelperTerm({
    ...englishWithGermanHelper,
    targetTerm: englishWithGermanHelper.helperTerm,
    translations: {
      ...englishWithGermanHelper.translations,
      de: { term: englishWithGermanHelper.helperTerm },
    },
  }),
  true,
  'different target/helper languages should still show identical legitimate translation strings',
)
assert.equal(
  shouldShowStaticHelperTerm({
    ...englishWithGermanHelper,
    helperTerm: englishWithGermanHelper.targetTerm,
    translations: {
      ...englishWithGermanHelper.translations,
      de: { term: englishWithGermanHelper.targetTerm, isFallback: true },
    },
  }),
  false,
  'missing helper translations should hide fallback duplicate subtitles without dropping the word card',
)

assert.deepEqual(
  getAdjacentStaticLevelNumbers(animals.staticWordLevels ?? [], 1),
  { previousLevelNumber: null, nextLevelNumber: 2 },
  'Level 1 should expose next navigation and no previous navigation',
)
assert.deepEqual(
  getAdjacentStaticLevelNumbers(animals.staticWordLevels ?? [], 3),
  { previousLevelNumber: 2, nextLevelNumber: 4 },
  'Middle levels should expose both previous and next navigation',
)
assert.deepEqual(
  getAdjacentStaticLevelNumbers(animals.staticWordLevels ?? [], 10),
  { previousLevelNumber: 9, nextLevelNumber: null },
  'Last level should expose previous navigation and no next navigation',
)

console.log('test-static-category-translations: OK')
