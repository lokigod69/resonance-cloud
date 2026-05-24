import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { listCurriculumCategories } from '../src/data/curriculumCategories'
import { getPublicCategoryGroups, getStaticCategoryVocabularyItems } from '../src/data/categories'

const titlesBySlug = new Map(listCurriculumCategories().map((category) => [category.slug, category.title]))

assert.equal(titlesBySlug.get('familie_beziehungen'), 'Familie & Beziehungen')
assert.equal(titlesBySlug.get('zahlen_zeit'), 'Zahlen & Zeit')
assert.equal(titlesBySlug.get('substantive'), 'Substantive')
assert.equal(titlesBySlug.get('adjektive'), 'Adjektive')
assert.equal(titlesBySlug.get('verben'), 'Verben')

for (const title of titlesBySlug.values()) {
  assert.equal(title.includes('('), false, `category title should not contain a parenthetical: ${title}`)
  assert.equal(title.includes(')'), false, `category title should not contain a parenthetical: ${title}`)
}

const categoryListSource = readFileSync('src/pages/categories/CategoryListPage.tsx', 'utf8')
const staticThematicCategories = getPublicCategoryGroups()
  .flatMap((group) => group.categories)
  .filter((category) => category.staticWordLevels?.length)

assert.equal(staticThematicCategories.length, 19, 'Curriculum page should have the 19 thematic static packs available')
for (const id of ['animals', 'fruits', 'home_objects', 'technology_media', 'feelings_states', 'education_learning']) {
  assert.ok(staticThematicCategories.some((category) => category.id === id), `${id} thematic category should be available`)
}

assert.ok(
  categoryListSource.includes('getPublicCategoryGroups'),
  'CategoryListPage should read the same public thematic static category groups used by Generate',
)
assert.ok(
  categoryListSource.includes('categories.legacySectionTitle'),
  'CategoryListPage should label the legacy curriculum section instead of replacing it',
)
assert.ok(
  categoryListSource.includes('categories.thematicSectionTitle'),
  'CategoryListPage should render a dedicated thematic category section',
)
assert.ok(
  categoryListSource.includes("tp('categories.levelCount'"),
  'thematic category cards should show level count metadata',
)
assert.ok(
  categoryListSource.includes("tp('categories.entryCount'"),
  'thematic category cards should show word count metadata',
)
assert.ok(
  categoryListSource.includes('ThematicCategoryHero'),
  'thematic categories should use a deterministic fallback visual instead of requiring cover images',
)
assert.equal(
  categoryListSource.includes('/generate?category='),
  false,
  'thematic category cards should not route directly to Generate',
)
assert.ok(
  categoryListSource.includes('thematicCategoryHref') && categoryListSource.includes('/categories/'),
  'thematic category cards should open category detail routes',
)
assert.ok(
  categoryListSource.includes('categories.openCategoryAction'),
  'thematic category cards should use an open-category CTA instead of generation copy',
)
assert.equal(
  categoryListSource.includes('categories.generateFromThisCategory'),
  false,
  'thematic category cards should not label the primary action as generation',
)

const animals = staticThematicCategories.find((category) => category.id === 'animals')
assert.ok(animals)
assert.equal(getStaticCategoryVocabularyItems(animals).length, 100)

const nutsSeeds = staticThematicCategories.find((category) => category.id === 'nuts_seeds')
assert.ok(nutsSeeds)
assert.equal(nutsSeeds.staticWordLevels?.length, 5, 'variable-level thematic packs should remain supported on the page')

const categoryDetailSource = readFileSync('src/pages/categories/CategoryDetailPage.tsx', 'utf8')
assert.ok(
  categoryDetailSource.includes('getStaticCategoryById') && categoryDetailSource.includes('renderStaticCategoryDetail'),
  'CategoryDetailPage should support thematic static category detail pages',
)
assert.ok(
  categoryDetailSource.includes('getStaticCategorySelectedItems'),
  'thematic category detail should render target/helper-language word previews',
)
assert.ok(
  categoryDetailSource.includes('categories.generateDeckFromCategory'),
  'thematic category detail may expose generation only as a secondary explicit action',
)
assert.ok(
  categoryDetailSource.includes('/level/'),
  'thematic category levels should open level preview routes',
)

const levelDetailSource = readFileSync('src/pages/categories/LevelDetailPage.tsx', 'utf8')
assert.ok(
  levelDetailSource.includes('getStaticCategoryById') && levelDetailSource.includes('renderStaticLevelDetail'),
  'LevelDetailPage should support thematic static level preview pages',
)
assert.ok(
  levelDetailSource.includes('chair') === false,
  'level detail implementation should be data-driven, not hardcode Home & Objects sample words',
)
assert.ok(
  levelDetailSource.includes('categories.noStaticStudyDeck'),
  'static thematic levels should not fake study availability before a deck exists',
)
assert.ok(
  levelDetailSource.includes('categories.generateDeckFromLevel'),
  'static thematic levels should expose generation only as a secondary explicit action',
)

process.stdout.write('curriculum category display ok\n')
