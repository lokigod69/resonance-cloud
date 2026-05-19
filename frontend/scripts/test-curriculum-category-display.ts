import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { listCurriculumCategories } from '../src/data/curriculumCategories'

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
assert.equal(
  categoryListSource.includes("tp('categories.levelCount'"),
  false,
  'category list cards should not render level-count chips',
)
assert.equal(
  categoryListSource.includes("tp('categories.entryCount'"),
  false,
  'category list cards should not render word-count chips',
)

const categoryDetailSource = readFileSync('src/pages/categories/CategoryDetailPage.tsx', 'utf8')
assert.equal(
  categoryDetailSource.includes("tp('categories.entryCount'"),
  false,
  'category detail level rows should not render word-count text',
)

process.stdout.write('curriculum category display ok\n')
