import {
  curriculumCategoryHeroPath,
  curriculumEntryImagePath,
  normalizeCurriculumTerm,
} from './curriculumImagePath'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

assertEqual(normalizeCurriculumTerm('father'), 'father', 'keeps simple lowercase terms')
assertEqual(normalizeCurriculumTerm('Father'), 'father', 'lowercases terms')
assertEqual(normalizeCurriculumTerm('father-in-law'), 'father-in-law', 'preserves hyphenated terms')
assertEqual(normalizeCurriculumTerm("mother's day"), 'mothers-day', 'drops apostrophes and hyphenates spaces')
assertEqual(normalizeCurriculumTerm('Großmutter'), 'grossmutter', 'normalizes German sharp s')

assertEqual(
  curriculumEntryImagePath('en', 'familie_beziehungen', 'father'),
  '/curriculum/categories/en/familie_beziehungen/entries/father.webp',
  'builds curriculum entry image path',
)

assertEqual(
  curriculumCategoryHeroPath('en', 'familie_beziehungen'),
  '/curriculum/categories/en/familie_beziehungen/hero.webp',
  'builds curriculum category hero path',
)
