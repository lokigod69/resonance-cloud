import assert from 'node:assert/strict'
import {
  getCurriculumCategoryBySlug,
  getCurriculumLevel,
  getCurriculumGloss,
  listCurriculumCategories,
  profileBaseLanguageToIso,
} from '../src/data/curriculumCategories'

const categories = listCurriculumCategories()

assert.equal(categories.length, 5)
assert.deepEqual(
  categories.map((category) => category.slug),
  ['familie_beziehungen', 'zahlen_zeit', 'substantive', 'adjektive', 'verben'],
)

const countsBySlug = new Map(categories.map((category) => [category.slug, category.totalEntries]))
assert.equal(countsBySlug.get('familie_beziehungen'), 30)
assert.equal(countsBySlug.get('zahlen_zeit'), 70)
assert.equal(countsBySlug.get('substantive'), 100)
assert.equal(countsBySlug.get('adjektive'), 100)
assert.equal(countsBySlug.get('verben'), 100)

const zahlenZeit = getCurriculumCategoryBySlug('zahlen_zeit')
assert.ok(zahlenZeit)
assert.equal(zahlenZeit.levelCount, 5)
assert.deepEqual(zahlenZeit.levels.map((level) => level.entries.length), [10, 19, 10, 10, 21])

const missingCategory = getCurriculumCategoryBySlug('not_real')
assert.equal(missingCategory, null)

const levelFive = getCurriculumLevel('zahlen_zeit', '5')
assert.ok(levelFive)
assert.equal(levelFive.entries.length, 21)
assert.equal(getCurriculumLevel('zahlen_zeit', '0'), null)
assert.equal(getCurriculumLevel('zahlen_zeit', 'abc'), null)
assert.equal(getCurriculumLevel('zahlen_zeit', '6'), null)
assert.equal(getCurriculumLevel('zahlen_zeit', '01'), null)
assert.equal(getCurriculumLevel('zahlen_zeit', '1.0'), null)
assert.equal(getCurriculumLevel('zahlen_zeit', '1e0'), null)

const firstFamilyEntry = getCurriculumLevel('familie_beziehungen', '1')?.entries[0]
assert.ok(firstFamilyEntry)
assert.equal(getCurriculumGloss(firstFamilyEntry, 'de'), 'der Vater')
assert.equal(getCurriculumGloss(firstFamilyEntry, 'fr'), 'der Vater')

assert.equal(profileBaseLanguageToIso('German'), 'de')
assert.equal(profileBaseLanguageToIso('English'), 'en')
assert.equal(profileBaseLanguageToIso(null), 'en')

process.stdout.write('curriculum category helpers ok\n')
