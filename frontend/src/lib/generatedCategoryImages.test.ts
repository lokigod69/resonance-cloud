import {
  generatedCategoryEntryImagePath,
  generatedCategoryHeroImagePath,
  hasGeneratedCategoryImages,
} from './generatedCategoryImages'

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

assertEqual(hasGeneratedCategoryImages('vegetables'), true, 'vegetables generated image set is available')
assertEqual(hasGeneratedCategoryImages('food_drinks'), false, 'food and drinks is not marked available without a full medium set')

assertEqual(
  generatedCategoryEntryImagePath('en', 'vegetables', 'green bean'),
  '/curriculum/generated-categories/en/vegetables/entries/green-bean.webp',
  'builds generated category entry path',
)

assertEqual(
  generatedCategoryHeroImagePath('en', 'fruits'),
  '/curriculum/generated-categories/en/fruits/entries/apple.webp',
  'builds generated category hero path',
)
