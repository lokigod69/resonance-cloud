import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  CATEGORY_GROUPS,
  getPublicCategoryGroups,
  getStaticCategorySelectedItems,
  getStaticCategoryWords,
  getThematicDuplicateReport,
  formatSelectedCategoryVocabularyLabel,
} from '../src/data/categories.ts'

const categoryPicker = readFileSync(resolve(process.cwd(), 'src/components/generate/steps/CategoryPicker.tsx'), 'utf8')
const wordsStep = readFileSync(resolve(process.cwd(), 'src/components/generate/steps/WordsStep.tsx'), 'utf8')
const wizardState = readFileSync(resolve(process.cwd(), 'src/components/generate/useWizardState.ts'), 'utf8')
const categoryListPage = readFileSync(resolve(process.cwd(), 'src/pages/categories/CategoryListPage.tsx'), 'utf8')

assert.match(
  categoryPicker,
  /const DEFAULT_CATEGORY_WORD_COUNT = 5/,
  'category suggestions should default to 5 words',
)

assert.match(
  categoryPicker,
  /const MAX_CATEGORY_WORD_COUNT = 10/,
  'category suggestions should cap at 10 words',
)

assert.match(
  categoryPicker,
  /min=\{MIN_CATEGORY_WORD_COUNT\}[\s\S]*?max=\{MAX_CATEGORY_WORD_COUNT\}/,
  'category amount slider should run from 5 to 10',
)

const tileClickBody = categoryPicker.match(/function handleTileClick\(category: Category\) \{([\s\S]*?)\n {2}\}/)?.[1] ?? ''
assert.doesNotMatch(
  tileClickBody,
  /fetchSuggestions/,
  'clicking a category should only select it, not fetch immediately',
)

assert.match(
  categoryPicker,
  /onMergeWords\(suggestedWords\)[\s\S]*resetExpansion\(\)/,
  'successful category fetch should merge suggestions directly and collapse the drawer',
)

assert.doesNotMatch(
  categoryPicker,
  /regenerateAll|RefreshCw|AddToList|addToList/,
  'category picker should not expose regenerate-all or separate add-to-list affordances',
)

const categoryIndex = wordsStep.indexOf('        <CategoryPicker')
const inputIndex = wordsStep.indexOf('          <GlassInput')
const chipsIndex = wordsStep.indexOf('          <WordChips')
const actionsIndex = wordsStep.indexOf('                <PremiumQuickModePanel')

assert.ok(categoryIndex !== -1, 'WordsStep should render CategoryPicker')
assert.ok(inputIndex !== -1, 'WordsStep should render GlassInput')
assert.ok(chipsIndex !== -1, 'WordsStep should render WordChips')
assert.ok(actionsIndex !== -1, 'WordsStep should render PremiumQuickModePanel')
assert.ok(categoryIndex < inputIndex, 'categories should appear above the manual input')
assert.ok(inputIndex < chipsIndex, 'manual input should appear before green word chips')
assert.ok(chipsIndex < actionsIndex, 'premium actions should appear under the green word chips')

const animalsCategory = CATEGORY_GROUPS.flatMap((group) => group.categories).find((category) => category.id === 'animals')
assert.ok(animalsCategory, 'Animals category should be selectable in CATEGORY_GROUPS')
assert.equal(animalsCategory.name, 'Animals')
assert.equal(animalsCategory.labelKey, 'category.animals')
assert.equal(
  animalsCategory.description,
  'Common, wild, sea, bird, insect, and advanced animal vocabulary.',
)
assert.deepEqual(
  animalsCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Animals should preserve 10 level groups as metadata',
)

const animalWords = getStaticCategoryWords(animalsCategory, 100)
assert.equal(animalWords.length, 100, 'Animals should expose all 100 canonical animal words')
assert.equal(animalWords.includes('fish'), true, 'Animals should include fish even though legacy Nouns also contains it')
assert.equal(new Set(animalWords).size, animalWords.length, 'Animals static words should not contain duplicates')
assert.deepEqual(
  animalWords.slice(0, 10),
  ['dog', 'cat', 'bird', 'fish', 'horse', 'cow', 'pig', 'sheep', 'goat', 'chicken'],
  'Animals should preserve the canonical level 1 ordering with fish restored',
)
assert.deepEqual(
  animalsCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Animals should preserve 10 levels with 10 entries each',
)
assert.ok(
  categoryPicker.includes('getStaticCategorySelectedItems(category, requestedCount, selectedStaticLevel ?? undefined, targetLanguage, helperLanguage)'),
  'CategoryPicker should use target/helper-language-aware local static vocabulary items for leveled static categories instead of the suggestion API',
)
assert.ok(
  categoryPicker.includes('STATIC_CATEGORY_TARGET_LANGUAGES.map'),
  'CategoryPicker should expose the static vocabulary target language selector',
)
assert.ok(
  categoryPicker.indexOf('id="static-category-target-language"') < categoryPicker.indexOf('{activeCategory && selectedLabel && ('),
  'CategoryPicker should show the language-pair selectors as soon as the drawer opens, before a category is selected',
)
assert.ok(
  categoryPicker.includes('handleHelperLanguageChange'),
  'CategoryPicker should expose a helper/base translation language selector separate from target vocabulary language',
)
assert.ok(
  categoryPicker.includes("onTargetLanguageChange?.(language)"),
  'CategoryPicker should notify the wizard when the target vocabulary language changes',
)
assert.ok(
  categoryPicker.includes('onMergeVocabularyItems?.(staticItems)'),
  'CategoryPicker should merge static category selections as concept metadata, not only raw strings',
)
assert.ok(
  categoryListPage.includes('to="/generate"') && categoryListPage.includes("categories.generateFromCategories"),
  'Categories page should expose a visible entry point to the multilingual Generate category picker',
)

const publicCategories = getPublicCategoryGroups().flatMap((group) => group.categories)
const livingWorldGroup = getPublicCategoryGroups().find((group) => group.label === 'Living World')
assert.ok(livingWorldGroup, 'Living World should be present in public category groups')
assert.deepEqual(
  livingWorldGroup.categories.map((category) => category.id),
  ['animals', 'fruits', 'vegetables'],
  'Living World should group Animals, Fruits, and Vegetables together',
)
const foodKitchenGroup = getPublicCategoryGroups().find((group) => group.label === 'Food & Kitchen')
assert.ok(foodKitchenGroup, 'Food & Kitchen should be present in public category groups')
assert.deepEqual(
  foodKitchenGroup.categories.map((category) => category.id),
  ['food_drinks', 'nuts_seeds'],
  'Food & Kitchen should expose Food & Drinks and Nuts & Seeds as public categories',
)
const everydayLifeGroup = getPublicCategoryGroups().find((group) => group.label === 'Everyday Life')
assert.ok(everydayLifeGroup, 'Everyday Life should be present in public category groups')
assert.deepEqual(
  everydayLifeGroup.categories.map((category) => category.id),
  ['home_objects', 'body_health', 'clothing_appearance'],
  'Everyday Life should expose Home & Objects, Body & Health, and Clothing & Appearance as public categories',
)
const worldTravelGroup = getPublicCategoryGroups().find((group) => group.label === 'World & Travel')
assert.ok(worldTravelGroup, 'World & Travel should be present in public category groups')
assert.deepEqual(
  worldTravelGroup.categories.map((category) => category.id),
  ['nature_weather', 'places_buildings', 'transport_travel'],
  'World & Travel should expose Nature & Weather, Places & Buildings, and Transport & Travel as public categories',
)
const peopleSocietyGroup = getPublicCategoryGroups().find((group) => group.label === 'People & Society')
assert.ok(peopleSocietyGroup, 'People & Society should be present in public category groups')
assert.deepEqual(
  peopleSocietyGroup.categories.map((category) => category.id),
  ['jobs_people', 'feelings_states', 'education_learning'],
  'People & Society should expose Jobs & People, Feelings & States, and Education & Learning as public categories',
)
const cultureLeisureGroup = getPublicCategoryGroups().find((group) => group.label === 'Culture & Leisure')
assert.ok(cultureLeisureGroup, 'Culture & Leisure should be present in public category groups')
assert.deepEqual(
  cultureLeisureGroup.categories.map((category) => category.id),
  ['sports_hobbies', 'music_instruments', 'arts_entertainment'],
  'Culture & Leisure should expose Sports & Hobbies, Music & Instruments, and Arts & Entertainment as public categories',
)
const modernLifeGroup = getPublicCategoryGroups().find((group) => group.label === 'Modern Life')
assert.ok(modernLifeGroup, 'Modern Life should be present in public category groups')
assert.deepEqual(
  modernLifeGroup.categories.map((category) => category.id),
  ['technology_media', 'money_shopping_services'],
  'Modern Life should expose Technology & Media and Money, Shopping & Services as public categories',
)
assert.equal(
  CATEGORY_GROUPS.find((group) => group.label === 'Language Building')?.categories.some((category) => category.id === 'animals'),
  false,
  'Animals should no longer live under Language Building',
)

const fruitsCategory = publicCategories.find((category) => category.id === 'fruits')
assert.ok(fruitsCategory, 'Fruits category should be selectable in the public category picker')
assert.equal(fruitsCategory.name, 'Fruits')
assert.equal(fruitsCategory.labelKey, 'category.fruits')
assert.equal(fruitsCategory.group, 'Living World')
assert.equal(fruitsCategory.language, 'English')
assert.equal(fruitsCategory.default_part_of_speech, 'noun')
assert.equal(fruitsCategory.public, true)
assert.equal(
  fruitsCategory.description,
  'Common, tropical, citrus, berry, orchard, and advanced fruit vocabulary.',
)
assert.deepEqual(
  fruitsCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Fruits should preserve 10 levels with 10 entries each',
)

const fruitWords = getStaticCategoryWords(fruitsCategory, 100)
assert.equal(fruitWords.length, 100, 'Fruits should expose 100 entries')
assert.equal(new Set(fruitWords).size, 100, 'Fruits should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(fruitsCategory, 10, 1),
  ['apple', 'banana', 'orange', 'grape', 'strawberry', 'lemon', 'peach', 'pear', 'cherry', 'watermelon'],
  'Fruits level 1 should supply the common fruit list',
)
assert.deepEqual(
  getStaticCategoryWords(fruitsCategory, 10, 7),
  ['clementine', 'pomelo', 'kumquat', 'yuzu', 'calamansi', 'blood orange', 'satsuma', 'citron', 'bergamot orange', 'ugli fruit'],
  'Fruits level 7 should supply the citrus list',
)
for (const level of fruitsCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Fruits entries should carry metadata, not bare strings')
    const fruitEntry = entry as { word: string; level?: number; part_of_speech?: string }
    assert.equal(fruitEntry.part_of_speech, 'noun', `Fruits entry ${fruitEntry.word} should be noun`)
    assert.equal(fruitEntry.level, level.level, `Fruits entry ${fruitEntry.word} should carry its level metadata`)
  }
}

const vegetablesCategory = publicCategories.find((category) => category.id === 'vegetables')
assert.ok(vegetablesCategory, 'Vegetables category should be selectable in the public category picker')
assert.equal(vegetablesCategory.name, 'Vegetables')
assert.equal(vegetablesCategory.labelKey, 'category.vegetables')
assert.equal(vegetablesCategory.group, 'Living World')
assert.equal(vegetablesCategory.language, 'English')
assert.equal(vegetablesCategory.default_part_of_speech, 'noun')
assert.equal(vegetablesCategory.public, true)
assert.equal(
  vegetablesCategory.description,
  'Common vegetables, roots, leafy greens, stems, pods, squash, mushrooms, and advanced culinary vegetable vocabulary.',
)
assert.deepEqual(
  vegetablesCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Vegetables should preserve 10 levels with 10 entries each',
)

const vegetableWords = getStaticCategoryWords(vegetablesCategory, 100)
assert.equal(vegetableWords.length, 100, 'Vegetables should expose 100 entries')
assert.equal(new Set(vegetableWords).size, 100, 'Vegetables should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(vegetablesCategory, 10, 1),
  ['carrot', 'potato', 'onion', 'tomato', 'cucumber', 'lettuce', 'garlic', 'corn', 'mushroom', 'broccoli'],
  'Vegetables level 1 should supply the basic everyday vegetable list',
)
assert.deepEqual(
  getStaticCategoryWords(vegetablesCategory, 10, 10),
  ['lotus root', 'burdock root', 'jicama', 'malanga', 'salsify', 'crosne', 'nopales', 'fiddlehead fern', 'samphire', 'seaweed'],
  'Vegetables level 10 should supply the advanced and regional vegetable list',
)
for (const level of vegetablesCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Vegetables entries should carry metadata, not bare strings')
    const vegetableEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(vegetableEntry.part_of_speech, 'noun', `Vegetables entry ${vegetableEntry.word} should be noun`)
    assert.equal(vegetableEntry.sense, 'culinary_vegetable', `Vegetables entry ${vegetableEntry.word} should carry culinary sense`)
    assert.equal(vegetableEntry.level, level.level, `Vegetables entry ${vegetableEntry.word} should carry its level metadata`)
  }
}

const foodDrinksCategory = publicCategories.find((category) => category.id === 'food_drinks')
assert.ok(foodDrinksCategory, 'Food & Drinks category should be selectable in the public category picker')
assert.equal(foodDrinksCategory.name, 'Food & Drinks')
assert.equal(foodDrinksCategory.labelKey, 'category.foodDrinks')
assert.equal(foodDrinksCategory.group, 'Food & Kitchen')
assert.equal(foodDrinksCategory.language, 'English')
assert.equal(foodDrinksCategory.default_part_of_speech, 'noun')
assert.equal(foodDrinksCategory.public, true)
assert.equal(
  foodDrinksCategory.description,
  'Common meals, staples, dairy, proteins, snacks, desserts, condiments, sauces, baked goods, and non-alcoholic drinks.',
)
assert.deepEqual(
  foodDrinksCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Food & Drinks should preserve 10 levels with 10 entries each',
)

const foodDrinkWords = getStaticCategoryWords(foodDrinksCategory, 100)
assert.equal(foodDrinkWords.length, 100, 'Food & Drinks should expose 100 entries')
assert.equal(new Set(foodDrinkWords).size, 100, 'Food & Drinks should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(foodDrinksCategory, 10, 1),
  ['bread', 'rice', 'pasta', 'soup', 'sandwich', 'pizza', 'egg', 'cheese', 'meat', 'salad'],
  'Food & Drinks level 1 should supply the basic staple foods and meals list',
)
assert.deepEqual(
  getStaticCategoryWords(foodDrinksCategory, 10, 10),
  ['espresso', 'cappuccino', 'herbal tea', 'iced tea', 'coconut water', 'bubble tea', 'kombucha', 'tofu', 'hummus', 'falafel'],
  'Food & Drinks level 10 should supply the advanced food and drinks list',
)
for (const level of foodDrinksCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Food & Drinks entries should carry metadata, not bare strings')
    const foodDrinkEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(foodDrinkEntry.part_of_speech, 'noun', `Food & Drinks entry ${foodDrinkEntry.word} should be noun`)
    assert.equal(foodDrinkEntry.sense, 'food_drink', `Food & Drinks entry ${foodDrinkEntry.word} should carry food/drink sense`)
    assert.equal(foodDrinkEntry.level, level.level, `Food & Drinks entry ${foodDrinkEntry.word} should carry its level metadata`)
  }
}

const nutsSeedsCategory = publicCategories.find((category) => category.id === 'nuts_seeds')
assert.ok(nutsSeedsCategory, 'Nuts & Seeds category should be selectable in the public category picker')
assert.equal(nutsSeedsCategory.name, 'Nuts & Seeds')
assert.equal(nutsSeedsCategory.labelKey, 'category.nutsSeeds')
assert.equal(nutsSeedsCategory.group, 'Food & Kitchen')
assert.equal(nutsSeedsCategory.language, 'English')
assert.equal(nutsSeedsCategory.default_part_of_speech, 'noun')
assert.equal(nutsSeedsCategory.public, true)
assert.equal(
  nutsSeedsCategory.description,
  'Common nuts, edible seeds, pantry seeds, nut and seed products, and advanced regional nut and seed vocabulary.',
)
assert.deepEqual(
  nutsSeedsCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5],
  'Nuts & Seeds should preserve 5 level groups as metadata',
)
assert.deepEqual(
  nutsSeedsCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10],
  'Nuts & Seeds should preserve 5 levels with 10 entries each',
)

const nutsSeedWords = getStaticCategoryWords(nutsSeedsCategory, 50)
assert.equal(nutsSeedWords.length, 50, 'Nuts & Seeds should expose 50 entries')
assert.equal(new Set(nutsSeedWords).size, 50, 'Nuts & Seeds should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(nutsSeedsCategory, 10, 1),
  ['almond', 'peanut', 'walnut', 'cashew', 'pistachio', 'hazelnut', 'pecan', 'chestnut', 'sunflower seed', 'pumpkin seed'],
  'Nuts & Seeds level 1 should supply the common nuts and snack seeds list',
)
assert.deepEqual(
  getStaticCategoryWords(nutsSeedsCategory, 10, 5),
  ['acorn', 'hickory nut', 'beech nut', 'kola nut', 'candlenut', 'pili nut', 'baru nut', 'ginkgo nut', 'fox nut', 'lotus seed'],
  'Nuts & Seeds level 5 should supply the advanced and regional nuts and seeds list',
)
for (const level of nutsSeedsCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Nuts & Seeds entries should carry metadata, not bare strings')
    const nutsSeedsEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(nutsSeedsEntry.part_of_speech, 'noun', `Nuts & Seeds entry ${nutsSeedsEntry.word} should be noun`)
    assert.equal(nutsSeedsEntry.sense, 'nut_seed', `Nuts & Seeds entry ${nutsSeedsEntry.word} should carry nut/seed sense`)
    assert.equal(nutsSeedsEntry.level, level.level, `Nuts & Seeds entry ${nutsSeedsEntry.word} should carry its level metadata`)
  }
}

const homeObjectsCategory = publicCategories.find((category) => category.id === 'home_objects')
assert.ok(homeObjectsCategory, 'Home & Objects category should be selectable in the public category picker')
assert.equal(homeObjectsCategory.name, 'Home & Objects')
assert.equal(homeObjectsCategory.labelKey, 'category.homeObjects')
assert.equal(homeObjectsCategory.group, 'Everyday Life')
assert.equal(homeObjectsCategory.language, 'English')
assert.equal(homeObjectsCategory.default_part_of_speech, 'noun')
assert.equal(homeObjectsCategory.public, true)
assert.equal(
  homeObjectsCategory.description,
  'Common home vocabulary, furniture, rooms, household items, appliances, containers, cleaning supplies, tools, desk objects, and decor.',
)
assert.deepEqual(
  homeObjectsCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Home & Objects should preserve 10 level groups as metadata',
)
assert.deepEqual(
  homeObjectsCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Home & Objects should preserve 10 levels with 10 entries each',
)

const homeObjectWords = getStaticCategoryWords(homeObjectsCategory, 100)
assert.equal(homeObjectWords.length, 100, 'Home & Objects should expose 100 entries')
assert.equal(new Set(homeObjectWords).size, 100, 'Home & Objects should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(homeObjectsCategory, 10, 1),
  ['chair', 'table', 'bed', 'sofa', 'door', 'window', 'key', 'lamp', 'mirror', 'shelf'],
  'Home & Objects level 1 should supply the basic home objects and furniture list',
)
assert.deepEqual(
  getStaticCategoryWords(homeObjectsCategory, 10, 10),
  ['curtain', 'blinds', 'cushion', 'vase', 'candle', 'picture frame', 'doormat', 'coat rack', 'remote control', 'clock'],
  'Home & Objects level 10 should supply the decor and household extras list',
)
const homeObjectsEnglishGerman = getStaticCategorySelectedItems(homeObjectsCategory, 3, 1, 'English', 'German')
assert.deepEqual(
  homeObjectsEnglishGerman.map(formatSelectedCategoryVocabularyLabel),
  ['chair / Stuhl', 'table / Tisch', 'bed / Bett'],
  'Home & Objects should display English primary chips with German helper translations',
)
assert.deepEqual(
  homeObjectsEnglishGerman.map((item) => ({
    conceptId: item.conceptId,
    categoryId: item.categoryId,
    targetLanguage: item.targetLanguage,
    targetTerm: item.targetTerm,
    helperLanguage: item.helperLanguage,
    helperTerm: item.helperTerm,
    part_of_speech: item.part_of_speech,
    sense: item.sense,
  })),
  [
    {
      conceptId: 'home_objects.chair',
      categoryId: 'home_objects',
      targetLanguage: 'en',
      targetTerm: 'chair',
      helperLanguage: 'de',
      helperTerm: 'Stuhl',
      part_of_speech: 'noun',
      sense: 'home_object',
    },
    {
      conceptId: 'home_objects.table',
      categoryId: 'home_objects',
      targetLanguage: 'en',
      targetTerm: 'table',
      helperLanguage: 'de',
      helperTerm: 'Tisch',
      part_of_speech: 'noun',
      sense: 'home_object',
    },
    {
      conceptId: 'home_objects.bed',
      categoryId: 'home_objects',
      targetLanguage: 'en',
      targetTerm: 'bed',
      helperLanguage: 'de',
      helperTerm: 'Bett',
      part_of_speech: 'noun',
      sense: 'home_object',
    },
  ],
  'Selected static items should preserve stable concept metadata for later enrichment and generation',
)
assert.deepEqual(
  getStaticCategorySelectedItems(homeObjectsCategory, 3, 1, 'German', 'English')
    .map(formatSelectedCategoryVocabularyLabel),
  ['Stuhl / chair', 'Tisch / table', 'Bett / bed'],
  'Home & Objects should display German primary chips with English helper translations',
)
assert.deepEqual(
  getStaticCategorySelectedItems(homeObjectsCategory, 3, 1, 'English', 'English')
    .map(formatSelectedCategoryVocabularyLabel),
  ['chair', 'table', 'bed'],
  'Same-language target/helper display should collapse to a single term',
)
assert.deepEqual(
  getStaticCategorySelectedItems(homeObjectsCategory, 3, 1, 'Korean', 'English')
    .map(formatSelectedCategoryVocabularyLabel),
  ['의자 / chair', '테이블 / table', '침대 / bed'],
  'Home & Objects should display Korean primary chips with English helper translations',
)
assert.deepEqual(
  getStaticCategorySelectedItems(homeObjectsCategory, 3, 1, 'English', 'Korean')
    .map(formatSelectedCategoryVocabularyLabel),
  ['chair / 의자', 'table / 테이블', 'bed / 침대'],
  'Home & Objects should display English primary chips with Korean helper translations',
)
for (const level of homeObjectsCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Home & Objects entries should carry metadata, not bare strings')
    const homeObjectEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(homeObjectEntry.part_of_speech, 'noun', `Home & Objects entry ${homeObjectEntry.word} should be noun`)
    assert.equal(homeObjectEntry.sense, 'home_object', `Home & Objects entry ${homeObjectEntry.word} should carry home/object sense`)
    assert.equal(homeObjectEntry.level, level.level, `Home & Objects entry ${homeObjectEntry.word} should carry its level metadata`)
  }
}

const bodyHealthCategory = publicCategories.find((category) => category.id === 'body_health')
assert.ok(bodyHealthCategory, 'Body & Health category should be selectable in the public category picker')
assert.equal(bodyHealthCategory.name, 'Body & Health')
assert.equal(bodyHealthCategory.labelKey, 'category.bodyHealth')
assert.equal(bodyHealthCategory.group, 'Everyday Life')
assert.equal(bodyHealthCategory.language, 'English')
assert.equal(bodyHealthCategory.default_part_of_speech, 'mixed')
assert.equal(bodyHealthCategory.public, true)
assert.equal(
  bodyHealthCategory.description,
  'Body parts, body areas, organs, senses, health states, symptoms, injuries, treatment basics, medical measurements, and advanced body vocabulary.',
)
assert.deepEqual(
  bodyHealthCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Body & Health should preserve 10 level groups as metadata',
)
assert.deepEqual(
  bodyHealthCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Body & Health should preserve 10 levels with 10 entries each',
)

const bodyHealthWords = getStaticCategoryWords(bodyHealthCategory, 100)
assert.equal(bodyHealthWords.length, 100, 'Body & Health should expose 100 entries')
assert.equal(new Set(bodyHealthWords).size, 100, 'Body & Health should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(bodyHealthCategory, 10, 1),
  ['head', 'face', 'eye', 'ear', 'nose', 'mouth', 'hand', 'arm', 'leg', 'foot'],
  'Body & Health level 1 should supply the basic body parts list',
)
assert.deepEqual(
  getStaticCategoryWords(bodyHealthCategory, 10, 5),
  ['healthy', 'sick', 'tired', 'hungry', 'thirsty', 'dizzy', 'weak', 'strong', 'sleepy', 'awake'],
  'Body & Health level 5 should supply the health states and feelings list',
)
assert.deepEqual(
  getStaticCategoryWords(bodyHealthCategory, 10, 10),
  ['immune system', 'nervous system', 'digestive system', 'skeleton', 'joint', 'tendon', 'ligament', 'artery', 'vein', 'organ'],
  'Body & Health level 10 should supply the advanced body and health vocabulary list',
)
for (const level of bodyHealthCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Body & Health entries should carry metadata, not bare strings')
    const bodyHealthEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(bodyHealthEntry.sense, 'body_health', `Body & Health entry ${bodyHealthEntry.word} should carry body/health sense`)
    assert.equal(bodyHealthEntry.level, level.level, `Body & Health entry ${bodyHealthEntry.word} should carry its level metadata`)
    const expectedPartOfSpeech = level.level === 5 ? 'adjective' : 'noun'
    assert.equal(
      bodyHealthEntry.part_of_speech,
      expectedPartOfSpeech,
      `Body & Health entry ${bodyHealthEntry.word} should carry ${expectedPartOfSpeech} metadata`,
    )
  }
}

const clothingAppearanceCategory = publicCategories.find((category) => category.id === 'clothing_appearance')
assert.ok(clothingAppearanceCategory, 'Clothing & Appearance category should be selectable in the public category picker')
assert.equal(clothingAppearanceCategory.name, 'Clothing & Appearance')
assert.equal(clothingAppearanceCategory.labelKey, 'category.clothingAppearance')
assert.equal(clothingAppearanceCategory.group, 'Everyday Life')
assert.equal(clothingAppearanceCategory.language, 'English')
assert.equal(clothingAppearanceCategory.default_part_of_speech, 'mixed')
assert.equal(clothingAppearanceCategory.public, true)
assert.equal(
  clothingAppearanceCategory.description,
  'Clothes, footwear, accessories, jewelry, clothing parts, materials, patterns, grooming items, hairstyles, and basic appearance descriptors.',
)
assert.deepEqual(
  clothingAppearanceCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Clothing & Appearance should preserve 10 level groups as metadata',
)
assert.deepEqual(
  clothingAppearanceCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Clothing & Appearance should preserve 10 levels with 10 entries each',
)

const clothingAppearanceWords = getStaticCategoryWords(clothingAppearanceCategory, 100)
assert.equal(clothingAppearanceWords.length, 100, 'Clothing & Appearance should expose 100 entries')
assert.equal(new Set(clothingAppearanceWords).size, 100, 'Clothing & Appearance should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(clothingAppearanceCategory, 10, 1),
  ['shirt', 'pants', 'dress', 'skirt', 'jacket', 'coat', 'sweater', 'shoes', 'socks', 'hat'],
  'Clothing & Appearance level 1 should supply the basic clothing list',
)
assert.deepEqual(
  getStaticCategoryWords(clothingAppearanceCategory, 10, 7),
  ['striped', 'checked', 'floral', 'plain', 'patterned', 'spotted', 'shiny', 'formal', 'casual', 'fashionable'],
  'Clothing & Appearance level 7 should supply the patterns and clothing styles list',
)
assert.deepEqual(
  getStaticCategoryWords(clothingAppearanceCategory, 10, 9),
  ['tall', 'short', 'young', 'old', 'slim', 'muscular', 'clean', 'dirty', 'neat', 'messy'],
  'Clothing & Appearance level 9 should supply the appearance descriptors list',
)
assert.deepEqual(
  getStaticCategoryWords(clothingAppearanceCategory, 10, 10),
  ['earrings', 'brooch', 'cufflink', 'handbag', 'sunglasses', 'helmet', 'cloak', 'veil', 'headscarf', 'kimono'],
  'Clothing & Appearance level 10 should supply the advanced and cultural clothing list',
)
for (const level of clothingAppearanceCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Clothing & Appearance entries should carry metadata, not bare strings')
    const clothingAppearanceEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(clothingAppearanceEntry.sense, 'clothing_appearance', `Clothing & Appearance entry ${clothingAppearanceEntry.word} should carry clothing/appearance sense`)
    assert.equal(clothingAppearanceEntry.level, level.level, `Clothing & Appearance entry ${clothingAppearanceEntry.word} should carry its level metadata`)
    const expectedPartOfSpeech = level.level === 7 || level.level === 9 ? 'adjective' : 'noun'
    assert.equal(
      clothingAppearanceEntry.part_of_speech,
      expectedPartOfSpeech,
      `Clothing & Appearance entry ${clothingAppearanceEntry.word} should carry ${expectedPartOfSpeech} metadata`,
    )
  }
}

const natureWeatherCategory = publicCategories.find((category) => category.id === 'nature_weather')
assert.ok(natureWeatherCategory, 'Nature & Weather category should be selectable in the public category picker')
assert.equal(natureWeatherCategory.name, 'Nature & Weather')
assert.equal(natureWeatherCategory.labelKey, 'category.natureWeather')
assert.equal(natureWeatherCategory.group, 'World & Travel')
assert.equal(natureWeatherCategory.language, 'English')
assert.equal(natureWeatherCategory.default_part_of_speech, 'noun')
assert.equal(natureWeatherCategory.public, true)
assert.equal(
  natureWeatherCategory.description,
  'Common nature, landscapes, weather, seasons, plants, terrain, ecosystems, and natural events.',
)
assert.deepEqual(
  natureWeatherCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Nature & Weather should preserve 10 level groups as metadata',
)
assert.deepEqual(
  natureWeatherCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Nature & Weather should preserve 10 levels with 10 entries each',
)

const natureWeatherWords = getStaticCategoryWords(natureWeatherCategory, 100)
assert.equal(natureWeatherWords.length, 100, 'Nature & Weather should expose 100 entries')
assert.equal(new Set(natureWeatherWords).size, 100, 'Nature & Weather should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(natureWeatherCategory, 10, 1),
  ['sun', 'moon', 'sky', 'cloud', 'rain', 'snow', 'wind', 'weather', 'tree', 'flower'],
  'Nature & Weather level 1 should supply the basic nature and weather list',
)
assert.deepEqual(
  getStaticCategoryWords(natureWeatherCategory, 10, 10),
  ['climate', 'atmosphere', 'temperature', 'humidity', 'forecast', 'drizzle', 'downpour', 'monsoon', 'tide', 'glacier'],
  'Nature & Weather level 10 should supply the advanced weather and environment list',
)
for (const level of natureWeatherCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Nature & Weather entries should carry metadata, not bare strings')
    const natureWeatherEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(natureWeatherEntry.part_of_speech, 'noun', `Nature & Weather entry ${natureWeatherEntry.word} should be noun`)
    assert.equal(natureWeatherEntry.sense, 'nature_weather', `Nature & Weather entry ${natureWeatherEntry.word} should carry nature/weather sense`)
    assert.equal(natureWeatherEntry.level, level.level, `Nature & Weather entry ${natureWeatherEntry.word} should carry its level metadata`)
  }
}

const placesBuildingsCategory = publicCategories.find((category) => category.id === 'places_buildings')
assert.ok(placesBuildingsCategory, 'Places & Buildings category should be selectable in the public category picker')
assert.equal(placesBuildingsCategory.name, 'Places & Buildings')
assert.equal(placesBuildingsCategory.labelKey, 'category.placesBuildings')
assert.equal(placesBuildingsCategory.group, 'World & Travel')
assert.equal(placesBuildingsCategory.language, 'English')
assert.equal(placesBuildingsCategory.default_part_of_speech, 'noun')
assert.equal(placesBuildingsCategory.public, true)
assert.equal(
  placesBuildingsCategory.description,
  'Common public places, city buildings, services, transport places, work and education places, shops, civic places, cultural venues, accommodation, and specialized buildings.',
)
assert.deepEqual(
  placesBuildingsCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Places & Buildings should preserve 10 level groups as metadata',
)
assert.deepEqual(
  placesBuildingsCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Places & Buildings should preserve 10 levels with 10 entries each',
)

const placesBuildingWords = getStaticCategoryWords(placesBuildingsCategory, 100)
assert.equal(placesBuildingWords.length, 100, 'Places & Buildings should expose 100 entries')
assert.equal(new Set(placesBuildingWords).size, 100, 'Places & Buildings should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(placesBuildingsCategory, 10, 1),
  ['school', 'hospital', 'park', 'store', 'restaurant', 'cafe', 'hotel', 'bank', 'library', 'market'],
  'Places & Buildings level 1 should supply the basic public places list',
)
assert.deepEqual(
  getStaticCategoryWords(placesBuildingsCategory, 10, 10),
  ['skyscraper', 'observatory', 'planetarium', 'monastery', 'cathedral', 'shrine', 'greenhouse', 'refinery', 'power plant', 'dam'],
  'Places & Buildings level 10 should supply the advanced and specialized places list',
)
for (const level of placesBuildingsCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Places & Buildings entries should carry metadata, not bare strings')
    const placesBuildingsEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(placesBuildingsEntry.part_of_speech, 'noun', `Places & Buildings entry ${placesBuildingsEntry.word} should be noun`)
    assert.equal(placesBuildingsEntry.sense, 'place_building', `Places & Buildings entry ${placesBuildingsEntry.word} should carry place/building sense`)
    assert.equal(placesBuildingsEntry.level, level.level, `Places & Buildings entry ${placesBuildingsEntry.word} should carry its level metadata`)
  }
}

const transportTravelCategory = publicCategories.find((category) => category.id === 'transport_travel')
assert.ok(transportTravelCategory, 'Transport & Travel category should be selectable in the public category picker')
assert.equal(transportTravelCategory.name, 'Transport & Travel')
assert.equal(transportTravelCategory.labelKey, 'category.transportTravel')
assert.equal(transportTravelCategory.group, 'World & Travel')
assert.equal(transportTravelCategory.language, 'English')
assert.equal(transportTravelCategory.default_part_of_speech, 'noun')
assert.equal(transportTravelCategory.public, true)
assert.equal(
  transportTravelCategory.description,
  'Vehicles, travel items, public transport, road, rail, air and sea travel, travel documents, navigation items, and useful trip vocabulary.',
)
assert.deepEqual(
  transportTravelCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Transport & Travel should preserve 10 level groups as metadata',
)
assert.deepEqual(
  transportTravelCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Transport & Travel should preserve 10 levels with 10 entries each',
)

const transportTravelWords = getStaticCategoryWords(transportTravelCategory, 100)
assert.equal(transportTravelWords.length, 100, 'Transport & Travel should expose 100 entries')
assert.equal(new Set(transportTravelWords).size, 100, 'Transport & Travel should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(transportTravelCategory, 10, 1),
  ['car', 'bus', 'train', 'bicycle', 'motorcycle', 'plane', 'boat', 'ship', 'taxi', 'truck'],
  'Transport & Travel level 1 should supply the basic vehicles list',
)
assert.deepEqual(
  getStaticCategoryWords(transportTravelCategory, 10, 10),
  ['helicopter', 'submarine', 'yacht', 'canoe', 'kayak', 'skateboard', 'roller skates', 'electric car', 'charging station', 'navigation'],
  'Transport & Travel level 10 should supply the advanced transport and travel list',
)
for (const level of transportTravelCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Transport & Travel entries should carry metadata, not bare strings')
    const transportTravelEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(transportTravelEntry.part_of_speech, 'noun', `Transport & Travel entry ${transportTravelEntry.word} should be noun`)
    assert.equal(transportTravelEntry.sense, 'transport_travel', `Transport & Travel entry ${transportTravelEntry.word} should carry transport/travel sense`)
    assert.equal(transportTravelEntry.level, level.level, `Transport & Travel entry ${transportTravelEntry.word} should carry its level metadata`)
  }
}

const jobsPeopleCategory = publicCategories.find((category) => category.id === 'jobs_people')
assert.ok(jobsPeopleCategory, 'Jobs & People category should be selectable in the public category picker')
assert.equal(jobsPeopleCategory.name, 'Jobs & People')
assert.equal(jobsPeopleCategory.labelKey, 'category.jobsPeople')
assert.equal(jobsPeopleCategory.group, 'People & Society')
assert.equal(jobsPeopleCategory.language, 'English')
assert.equal(jobsPeopleCategory.default_part_of_speech, 'noun')
assert.equal(jobsPeopleCategory.public, true)
assert.equal(
  jobsPeopleCategory.description,
  'Basic people words, social roles, workplace roles, education roles, healthcare workers, emergency workers, service jobs, trades, creative jobs, public roles, technology jobs, and advanced professional roles.',
)
assert.deepEqual(
  jobsPeopleCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Jobs & People should preserve 10 level groups as metadata',
)
assert.deepEqual(
  jobsPeopleCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Jobs & People should preserve 10 levels with 10 entries each',
)

const jobsPeopleWords = getStaticCategoryWords(jobsPeopleCategory, 100)
assert.equal(jobsPeopleWords.length, 100, 'Jobs & People should expose 100 entries')
assert.equal(new Set(jobsPeopleWords).size, 100, 'Jobs & People should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(jobsPeopleCategory, 10, 1),
  ['person', 'man', 'woman', 'child', 'baby', 'adult', 'teenager', 'stranger', 'neighbor', 'customer'],
  'Jobs & People level 1 should supply the basic people and social roles list',
)
assert.deepEqual(
  getStaticCategoryWords(jobsPeopleCategory, 10, 10),
  ['ambassador', 'activist', 'historian', 'economist', 'psychologist', 'sociologist', 'archaeologist', 'astronomer', 'composer', 'poet'],
  'Jobs & People level 10 should supply the advanced society and specialist roles list',
)
for (const level of jobsPeopleCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Jobs & People entries should carry metadata, not bare strings')
    const jobsPeopleEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(jobsPeopleEntry.part_of_speech, 'noun', `Jobs & People entry ${jobsPeopleEntry.word} should be noun`)
    assert.equal(jobsPeopleEntry.sense, 'jobs_people', `Jobs & People entry ${jobsPeopleEntry.word} should carry jobs/people sense`)
    assert.equal(jobsPeopleEntry.level, level.level, `Jobs & People entry ${jobsPeopleEntry.word} should carry its level metadata`)
  }
}

const feelingsStatesCategory = publicCategories.find((category) => category.id === 'feelings_states')
assert.ok(feelingsStatesCategory, 'Feelings & States category should be selectable in the public category picker')
assert.equal(feelingsStatesCategory.name, 'Feelings & States')
assert.equal(feelingsStatesCategory.labelKey, 'category.feelingsStates')
assert.equal(feelingsStatesCategory.group, 'People & Society')
assert.equal(feelingsStatesCategory.language, 'English')
assert.equal(feelingsStatesCategory.default_part_of_speech, 'mixed')
assert.equal(feelingsStatesCategory.public, true)
assert.equal(
  feelingsStatesCategory.description,
  'Basic emotions, social feelings, pleasant and unpleasant emotional states, intense feelings, emotion nouns, mental states, relationship feelings, feeling verbs, and advanced emotional vocabulary.',
)
assert.deepEqual(
  feelingsStatesCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Feelings & States should preserve 10 level groups as metadata',
)
assert.deepEqual(
  feelingsStatesCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Feelings & States should preserve 10 levels with 10 entries each',
)

const feelingsStatesWords = getStaticCategoryWords(feelingsStatesCategory, 100)
assert.equal(feelingsStatesWords.length, 100, 'Feelings & States should expose 100 entries')
assert.equal(new Set(feelingsStatesWords).size, 100, 'Feelings & States should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(feelingsStatesCategory, 10, 1),
  ['happy', 'sad', 'angry', 'afraid', 'scared', 'calm', 'excited', 'nervous', 'surprised', 'bored'],
  'Feelings & States level 1 should supply basic emotions',
)
assert.deepEqual(
  getStaticCategoryWords(feelingsStatesCategory, 10, 6),
  ['joy', 'sadness', 'anger', 'fear', 'love', 'affection', 'stress', 'anxiety', 'shame', 'guilt'],
  'Feelings & States level 6 should supply emotion nouns',
)
assert.deepEqual(
  getStaticCategoryWords(feelingsStatesCategory, 10, 9),
  ['feel', 'worry', 'miss', 'trust', 'doubt', 'hope', 'enjoy', 'hate', 'forgive', 'regret'],
  'Feelings & States level 9 should supply feeling and emotion verbs',
)
assert.deepEqual(
  getStaticCategoryWords(feelingsStatesCategory, 10, 10),
  ['content', 'resentful', 'envious', 'apprehensive', 'vulnerable', 'reluctant', 'eager', 'indifferent', 'empathy', 'compassion'],
  'Feelings & States level 10 should supply advanced emotional vocabulary',
)
for (const level of feelingsStatesCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Feelings & States entries should carry metadata, not bare strings')
    const feelingsStatesEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(feelingsStatesEntry.sense, 'feelings_states', `Feelings & States entry ${feelingsStatesEntry.word} should carry feelings/states sense`)
    assert.equal(feelingsStatesEntry.level, level.level, `Feelings & States entry ${feelingsStatesEntry.word} should carry its level metadata`)
    const expectedPartOfSpeech = level.level === 6
      ? 'noun'
      : level.level === 9
        ? 'verb'
        : level.level === 10 && ['empathy', 'compassion'].includes(feelingsStatesEntry.word)
          ? 'noun'
          : 'adjective'
    assert.equal(
      feelingsStatesEntry.part_of_speech,
      expectedPartOfSpeech,
      `Feelings & States entry ${feelingsStatesEntry.word} should carry ${expectedPartOfSpeech} metadata`,
    )
  }
}

const educationLearningCategory = publicCategories.find((category) => category.id === 'education_learning')
assert.ok(educationLearningCategory, 'Education & Learning category should be selectable in the public category picker')
assert.equal(educationLearningCategory.name, 'Education & Learning')
assert.equal(educationLearningCategory.labelKey, 'category.educationLearning')
assert.equal(educationLearningCategory.group, 'People & Society')
assert.equal(educationLearningCategory.language, 'English')
assert.equal(educationLearningCategory.default_part_of_speech, 'mixed')
assert.equal(educationLearningCategory.public, true)
assert.equal(
  educationLearningCategory.description,
  'Learners, lessons, school materials, school life, learning actions, language learning, math and science basics, tests, progress, education systems, higher education, and learning methods.',
)
assert.deepEqual(
  educationLearningCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Education & Learning should preserve 10 level groups as metadata',
)
assert.deepEqual(
  educationLearningCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Education & Learning should preserve 10 levels with 10 entries each',
)

const educationLearningWords = getStaticCategoryWords(educationLearningCategory, 100)
assert.equal(educationLearningWords.length, 100, 'Education & Learning should expose 100 entries')
assert.equal(new Set(educationLearningWords).size, 100, 'Education & Learning should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(educationLearningCategory, 10, 1),
  ['student', 'pupil', 'learner', 'lesson', 'class', 'homework', 'question', 'answer', 'word', 'sentence'],
  'Education & Learning level 1 should supply basic learning words',
)
assert.deepEqual(
  getStaticCategoryWords(educationLearningCategory, 10, 4),
  ['learn', 'study', 'read', 'write', 'listen', 'repeat', 'practice', 'memorize', 'understand', 'explain'],
  'Education & Learning level 4 should supply learning action verbs',
)
assert.deepEqual(
  getStaticCategoryWords(educationLearningCategory, 10, 8),
  ['kindergarten', 'primary school', 'elementary school', 'middle school', 'high school', 'boarding school', 'language school', 'online course', 'campus', 'lecture hall'],
  'Education & Learning level 8 should supply education systems and learning places',
)
assert.deepEqual(
  getStaticCategoryWords(educationLearningCategory, 10, 10),
  ['knowledge', 'skill', 'ability', 'memory', 'concentration', 'study plan', 'learning goal', 'critical thinking', 'problem solving', 'lifelong learning'],
  'Education & Learning level 10 should supply learning methods and abstract learning',
)
for (const level of educationLearningCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Education & Learning entries should carry metadata, not bare strings')
    const educationLearningEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(educationLearningEntry.sense, 'education_learning', `Education & Learning entry ${educationLearningEntry.word} should carry education/learning sense`)
    assert.equal(educationLearningEntry.level, level.level, `Education & Learning entry ${educationLearningEntry.word} should carry its level metadata`)
    const expectedPartOfSpeech = level.level === 4 ? 'verb' : 'noun'
    assert.equal(
      educationLearningEntry.part_of_speech,
      expectedPartOfSpeech,
      `Education & Learning entry ${educationLearningEntry.word} should carry ${expectedPartOfSpeech} metadata`,
    )
  }
}

const sportsHobbiesCategory = publicCategories.find((category) => category.id === 'sports_hobbies')
assert.ok(sportsHobbiesCategory, 'Sports & Hobbies category should be selectable in the public category picker')
assert.equal(sportsHobbiesCategory.name, 'Sports & Hobbies')
assert.equal(sportsHobbiesCategory.labelKey, 'category.sportsHobbies')
assert.equal(sportsHobbiesCategory.group, 'Culture & Leisure')
assert.equal(sportsHobbiesCategory.language, 'English')
assert.equal(sportsHobbiesCategory.default_part_of_speech, 'noun')
assert.equal(sportsHobbiesCategory.public, true)
assert.equal(
  sportsHobbiesCategory.description,
  'Common sports, exercise activities, outdoor activities, team sports, combat sports, water and adventure sports, sports equipment, creative hobbies, music and performance hobbies, games, and leisure activities.',
)
assert.deepEqual(
  sportsHobbiesCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Sports & Hobbies should preserve 10 level groups as metadata',
)
assert.deepEqual(
  sportsHobbiesCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Sports & Hobbies should preserve 10 levels with 10 entries each',
)

const sportsHobbiesWords = getStaticCategoryWords(sportsHobbiesCategory, 100)
assert.equal(sportsHobbiesWords.length, 100, 'Sports & Hobbies should expose 100 entries')
assert.equal(new Set(sportsHobbiesWords).size, 100, 'Sports & Hobbies should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(sportsHobbiesCategory, 10, 1),
  ['football', 'basketball', 'tennis', 'swimming', 'running', 'cycling', 'baseball', 'volleyball', 'golf', 'boxing'],
  'Sports & Hobbies level 1 should supply the common sports list',
)
assert.deepEqual(
  getStaticCategoryWords(sportsHobbiesCategory, 10, 7),
  ['aerobics', 'stretching', 'jump rope', 'frisbee', 'pickleball', 'padel', 'racquetball', 'softball', 'field hockey', 'ice skating'],
  'Sports & Hobbies level 7 should use non-art sport and hobby replacements now owned by Arts & Entertainment',
)
assert.deepEqual(
  getStaticCategoryWords(sportsHobbiesCategory, 10, 9),
  ['scuba diving', 'trail running', 'marathon', 'triathlon', 'orienteering', 'cheerleading', 'disc golf', 'parkour', 'table football', 'ultimate frisbee'],
  'Sports & Hobbies level 9 should use non-game sport and hobby replacements now owned by Arts & Entertainment',
)
assert.deepEqual(
  getStaticCategoryWords(sportsHobbiesCategory, 10, 10),
  ['gardening', 'fishing', 'camping', 'birdwatching', 'stargazing', 'woodworking', 'model building', 'coin collecting', 'stamp collecting', 'geocaching'],
  'Sports & Hobbies level 10 should supply the leisure and advanced hobbies list',
)
assert.deepEqual(
  getStaticCategoryWords(sportsHobbiesCategory, 10, 8),
  ['comedy', 'magic', 'juggling', 'podcasting', 'blogging', 'vlogging', 'creative writing', 'storytelling', 'improvisation', 'acting'],
  'Sports & Hobbies level 8 should use non-music performance hobbies now owned by Music & Instruments',
)
for (const level of sportsHobbiesCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Sports & Hobbies entries should carry metadata, not bare strings')
    const sportsHobbiesEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(sportsHobbiesEntry.part_of_speech, 'noun', `Sports & Hobbies entry ${sportsHobbiesEntry.word} should be noun`)
    assert.equal(sportsHobbiesEntry.sense, 'sports_hobbies', `Sports & Hobbies entry ${sportsHobbiesEntry.word} should carry sports/hobbies sense`)
    assert.equal(sportsHobbiesEntry.level, level.level, `Sports & Hobbies entry ${sportsHobbiesEntry.word} should carry its level metadata`)
  }
}

const musicInstrumentsCategory = publicCategories.find((category) => category.id === 'music_instruments')
assert.ok(musicInstrumentsCategory, 'Music & Instruments category should be selectable in the public category picker')
assert.equal(musicInstrumentsCategory.name, 'Music & Instruments')
assert.equal(musicInstrumentsCategory.labelKey, 'category.musicInstruments')
assert.equal(musicInstrumentsCategory.group, 'Culture & Leisure')
assert.equal(musicInstrumentsCategory.language, 'English')
assert.equal(musicInstrumentsCategory.default_part_of_speech, 'noun')
assert.equal(musicInstrumentsCategory.public, true)
assert.equal(
  musicInstrumentsCategory.description,
  'Common instruments, singing and performance vocabulary, percussion, string instruments, wind and brass instruments, music theory basics, recording and audio vocabulary, ensembles, events, and music genres.',
)
assert.deepEqual(
  musicInstrumentsCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Music & Instruments should preserve 10 level groups as metadata',
)
assert.deepEqual(
  musicInstrumentsCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Music & Instruments should preserve 10 levels with 10 entries each',
)

const musicInstrumentWords = getStaticCategoryWords(musicInstrumentsCategory, 100)
assert.equal(musicInstrumentWords.length, 100, 'Music & Instruments should expose 100 entries')
assert.equal(new Set(musicInstrumentWords).size, 100, 'Music & Instruments should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(musicInstrumentsCategory, 10, 1),
  ['music', 'song', 'guitar', 'piano', 'drums', 'violin', 'flute', 'trumpet', 'microphone', 'headphones'],
  'Music & Instruments level 1 should supply basic music and common instruments',
)
assert.deepEqual(
  getStaticCategoryWords(musicInstrumentsCategory, 10, 10),
  ['classical music', 'jazz', 'rock music', 'pop music', 'hip hop', 'folk music', 'electronic music', 'reggae', 'opera', 'blues'],
  'Music & Instruments level 10 should supply music genres and advanced vocabulary',
)
for (const level of musicInstrumentsCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Music & Instruments entries should carry metadata, not bare strings')
    const musicInstrumentsEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(musicInstrumentsEntry.part_of_speech, 'noun', `Music & Instruments entry ${musicInstrumentsEntry.word} should be noun`)
    assert.equal(musicInstrumentsEntry.sense, 'music_instruments', `Music & Instruments entry ${musicInstrumentsEntry.word} should carry music/instruments sense`)
    assert.equal(musicInstrumentsEntry.level, level.level, `Music & Instruments entry ${musicInstrumentsEntry.word} should carry its level metadata`)
  }
}

const artsEntertainmentCategory = publicCategories.find((category) => category.id === 'arts_entertainment')
assert.ok(artsEntertainmentCategory, 'Arts & Entertainment category should be selectable in the public category picker')
assert.equal(artsEntertainmentCategory.name, 'Arts & Entertainment')
assert.equal(artsEntertainmentCategory.labelKey, 'category.artsEntertainment')
assert.equal(artsEntertainmentCategory.group, 'Culture & Leisure')
assert.equal(artsEntertainmentCategory.language, 'English')
assert.equal(artsEntertainmentCategory.default_part_of_speech, 'noun')
assert.equal(artsEntertainmentCategory.public, true)
assert.equal(
  artsEntertainmentCategory.description,
  'Art basics, supplies, crafts, visual arts, theater and stage vocabulary, film and story vocabulary, books, comics, games, puzzles, video games, shows, events, and advanced art and entertainment vocabulary.',
)
assert.deepEqual(
  artsEntertainmentCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Arts & Entertainment should preserve 10 level groups as metadata',
)
assert.deepEqual(
  artsEntertainmentCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Arts & Entertainment should preserve 10 levels with 10 entries each',
)

const artsEntertainmentWords = getStaticCategoryWords(artsEntertainmentCategory, 100)
assert.equal(artsEntertainmentWords.length, 100, 'Arts & Entertainment should expose 100 entries')
assert.equal(new Set(artsEntertainmentWords).size, 100, 'Arts & Entertainment should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(artsEntertainmentCategory, 10, 1),
  ['art', 'drawing', 'painting', 'paint', 'paintbrush', 'canvas', 'sketch', 'sculpture', 'clay', 'easel'],
  'Arts & Entertainment level 1 should supply art basics and supplies',
)
assert.deepEqual(
  getStaticCategoryWords(artsEntertainmentCategory, 10, 10),
  ['exhibition', 'installation art', 'masterpiece', 'abstract art', 'realism', 'surrealism', 'choreography', 'improvisation', 'critique', 'awards ceremony'],
  'Arts & Entertainment level 10 should supply advanced arts and entertainment vocabulary',
)
for (const level of artsEntertainmentCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Arts & Entertainment entries should carry metadata, not bare strings')
    const artsEntertainmentEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(artsEntertainmentEntry.part_of_speech, 'noun', `Arts & Entertainment entry ${artsEntertainmentEntry.word} should be noun`)
    assert.equal(artsEntertainmentEntry.sense, 'arts_entertainment', `Arts & Entertainment entry ${artsEntertainmentEntry.word} should carry arts/entertainment sense`)
    assert.equal(artsEntertainmentEntry.level, level.level, `Arts & Entertainment entry ${artsEntertainmentEntry.word} should carry its level metadata`)
  }
}

const technologyMediaCategory = publicCategories.find((category) => category.id === 'technology_media')
assert.ok(technologyMediaCategory, 'Technology & Media category should be selectable in the public category picker')
assert.equal(technologyMediaCategory.name, 'Technology & Media')
assert.equal(technologyMediaCategory.labelKey, 'category.technologyMedia')
assert.equal(technologyMediaCategory.group, 'Modern Life')
assert.equal(technologyMediaCategory.language, 'English')
assert.equal(technologyMediaCategory.default_part_of_speech, 'noun')
assert.equal(technologyMediaCategory.public, true)
assert.equal(
  technologyMediaCategory.description,
  'Common devices, computer hardware, internet vocabulary, apps and software, messaging, social media, photos and video, media content, data, storage, security, and advanced modern technology vocabulary.',
)
assert.deepEqual(
  technologyMediaCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Technology & Media should preserve 10 level groups as metadata',
)
assert.deepEqual(
  technologyMediaCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Technology & Media should preserve 10 levels with 10 entries each',
)

const technologyMediaWords = getStaticCategoryWords(technologyMediaCategory, 100)
assert.equal(technologyMediaWords.length, 100, 'Technology & Media should expose 100 entries')
assert.equal(new Set(technologyMediaWords).size, 100, 'Technology & Media should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(technologyMediaCategory, 10, 1),
  ['computer', 'laptop', 'smartphone', 'tablet computer', 'camera', 'television', 'radio', 'screen', 'charger', 'battery'],
  'Technology & Media level 1 should supply the basic devices list',
)
assert.deepEqual(
  getStaticCategoryWords(technologyMediaCategory, 10, 10),
  ['artificial intelligence', 'robot', 'drone', 'virtual reality', 'augmented reality', 'smart home', '3D printer', 'cryptocurrency', 'algorithm', 'sensor'],
  'Technology & Media level 10 should supply advanced and modern technology vocabulary',
)
for (const level of technologyMediaCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Technology & Media entries should carry metadata, not bare strings')
    const technologyMediaEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(technologyMediaEntry.part_of_speech, 'noun', `Technology & Media entry ${technologyMediaEntry.word} should be noun`)
    assert.equal(technologyMediaEntry.sense, 'technology_media', `Technology & Media entry ${technologyMediaEntry.word} should carry technology/media sense`)
    assert.equal(technologyMediaEntry.level, level.level, `Technology & Media entry ${technologyMediaEntry.word} should carry its level metadata`)
  }
}

const moneyShoppingServicesCategory = publicCategories.find((category) => category.id === 'money_shopping_services')
assert.ok(moneyShoppingServicesCategory, 'Money, Shopping & Services category should be selectable in the public category picker')
assert.equal(moneyShoppingServicesCategory.name, 'Money, Shopping & Services')
assert.equal(moneyShoppingServicesCategory.labelKey, 'category.moneyShoppingServices')
assert.equal(moneyShoppingServicesCategory.group, 'Modern Life')
assert.equal(moneyShoppingServicesCategory.language, 'English')
assert.equal(moneyShoppingServicesCategory.default_part_of_speech, 'mixed')
assert.equal(moneyShoppingServicesCategory.public, true)
assert.equal(
  moneyShoppingServicesCategory.description,
  'Everyday money vocabulary, payment, prices, deals, shopping objects, checkout vocabulary, banking basics, online shopping, services, household bills, business money, and advanced financial vocabulary.',
)
assert.deepEqual(
  moneyShoppingServicesCategory.staticWordLevels?.map((level) => level.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'Money, Shopping & Services should preserve 10 level groups as metadata',
)
assert.deepEqual(
  moneyShoppingServicesCategory.staticWordLevels?.map((level) => level.words.length),
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  'Money, Shopping & Services should preserve 10 levels with 10 entries each',
)

const moneyShoppingServicesWords = getStaticCategoryWords(moneyShoppingServicesCategory, 100)
assert.equal(moneyShoppingServicesWords.length, 100, 'Money, Shopping & Services should expose 100 entries')
assert.equal(new Set(moneyShoppingServicesWords).size, 100, 'Money, Shopping & Services should not contain duplicate entries')
assert.deepEqual(
  getStaticCategoryWords(moneyShoppingServicesCategory, 10, 1),
  ['money', 'cash', 'coin', 'banknote', 'wallet', 'price', 'receipt', 'payment', 'shop', 'shopping bag'],
  'Money, Shopping & Services level 1 should supply basic money and shopping vocabulary',
)
assert.deepEqual(
  getStaticCategoryWords(moneyShoppingServicesCategory, 10, 2),
  ['buy', 'sell', 'pay', 'spend', 'save', 'cost', 'charge', 'borrow', 'lend', 'rent'],
  'Money, Shopping & Services level 2 should supply shopping and payment actions',
)
assert.deepEqual(
  getStaticCategoryWords(moneyShoppingServicesCategory, 10, 3),
  ['cheap', 'expensive', 'free', 'discount', 'sale', 'coupon', 'bargain', 'tax', 'tip', 'total'],
  'Money, Shopping & Services level 3 should supply prices and deals vocabulary',
)
assert.deepEqual(
  getStaticCategoryWords(moneyShoppingServicesCategory, 10, 10),
  ['currency', 'exchange rate', 'inflation', 'debt', 'mortgage', 'insurance', 'premium', 'pension', 'stock', 'bond'],
  'Money, Shopping & Services level 10 should supply advanced money and finance vocabulary',
)
for (const level of moneyShoppingServicesCategory.staticWordLevels ?? []) {
  for (const entry of level.words) {
    assert.equal(typeof entry, 'object', 'Money, Shopping & Services entries should carry metadata, not bare strings')
    const moneyShoppingServicesEntry = entry as { word: string; level?: number; part_of_speech?: string; sense?: string }
    assert.equal(moneyShoppingServicesEntry.sense, 'money_shopping_services', `Money, Shopping & Services entry ${moneyShoppingServicesEntry.word} should carry money/shopping/services sense`)
    assert.equal(moneyShoppingServicesEntry.level, level.level, `Money, Shopping & Services entry ${moneyShoppingServicesEntry.word} should carry its level metadata`)
    const expectedPartOfSpeech = level.level === 2
      ? 'verb'
      : level.level === 3 && ['cheap', 'expensive', 'free'].includes(moneyShoppingServicesEntry.word)
        ? 'adjective'
        : 'noun'
    assert.equal(
      moneyShoppingServicesEntry.part_of_speech,
      expectedPartOfSpeech,
      `Money, Shopping & Services entry ${moneyShoppingServicesEntry.word} should carry ${expectedPartOfSpeech} metadata`,
    )
  }
}

const publicNouns = publicCategories.find((category) => category.id === 'nouns' || category.name === 'Nouns (Things)')
assert.equal(publicNouns, undefined, 'Generic Nouns should be frozen as legacy data and hidden from public picker output')
const legacyNouns = CATEGORY_GROUPS.flatMap((group) => group.categories).find((category) => category.name === 'Nouns (Things)')
assert.ok(legacyNouns, 'Legacy Nouns category should remain in source data')
assert.equal(legacyNouns.public, false, 'Legacy Nouns category should be marked non-public')

assert.deepEqual(
  getThematicDuplicateReport().sameSenseDuplicates,
  [
    { term: 'apple', legacyCategory: 'Nouns (Things)', ownerCategory: 'Fruits' },
    { term: 'banana', legacyCategory: 'Nouns (Things)', ownerCategory: 'Fruits' },
    { term: 'fish', legacyCategory: 'Nouns (Things)', ownerCategory: 'Animals' },
    { term: 'potato', legacyCategory: 'Nouns (Things)', ownerCategory: 'Vegetables' },
    { term: 'tomato', legacyCategory: 'Nouns (Things)', ownerCategory: 'Vegetables' },
    { term: 'bread', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'water', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'coffee', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'tea', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'milk', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'juice', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'cheese', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'egg', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'meat', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'rice', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'pasta', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'soup', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'salad', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'sugar', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'salt', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'chair', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'table', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'bed', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'door', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'window', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'key', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'lamp', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'house', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'apartment', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'bathroom', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'plate', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'cup', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'glass', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'bottle', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'spoon', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'fork', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'knife', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'bag', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'book', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'pen', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'school', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'hospital', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'park', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'store', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'restaurant', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'hotel', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'bank', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'library', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'market', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'pharmacy', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'cinema', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'museum', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'church', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'airport', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'office', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'bakery', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'driver', legacyCategory: 'Nouns (Things)', ownerCategory: 'Transport & Travel' },
    { term: 'person', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'man', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'woman', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'child', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'neighbor', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'customer', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'worker', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'boss', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'teacher', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'doctor', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'nurse', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'police officer', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'waiter', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'cook', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'farmer', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'artist', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'computer', legacyCategory: 'Nouns (Things)', ownerCategory: 'Technology & Media' },
    { term: 'television', legacyCategory: 'Nouns (Things)', ownerCategory: 'Technology & Media' },
  ],
  'Thematic duplicate report should document same-sense legacy Nouns duplicates without removing thematic words',
)
assert.deepEqual(
  getThematicDuplicateReport().ambiguousCandidates,
  [],
  'No ambiguous Nouns duplicates should be guessed for this fruit list',
)
assert.ok(
  categoryPicker.includes('selectedStaticLevel'),
  'CategoryPicker should expose level selection state for static leveled categories',
)
assert.ok(
  wizardState.includes("case 'ADD_VOCABULARY_ITEMS'") && wizardState.includes('wordsEqual(existing, item.targetTerm)'),
  'Static category metadata should dedupe at final merged chip/output level by target term',
)
assert.ok(
  wizardState.includes('selectedVocabularyItems') && wizardState.includes('category_vocabulary_items'),
  'Generation payload should keep selected category concept metadata alongside final word strings',
)
assert.ok(
  wizardState.includes("case 'ADD_WORDS'") && wizardState.includes('wordsEqual(existing, word)'),
  'Final duplicate prevention should remain at the merged chip/output level',
)

console.log('generate category picker flow checks passed')
