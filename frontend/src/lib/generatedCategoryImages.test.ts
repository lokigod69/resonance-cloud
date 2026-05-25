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
assertEqual(hasGeneratedCategoryImages('food_drinks'), true, 'food and drinks generated image set is available')
assertEqual(hasGeneratedCategoryImages('nature_weather'), true, 'nature and weather generated image set is available')
assertEqual(hasGeneratedCategoryImages('jobs_people'), true, 'jobs and people generated image set is available')

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

assertEqual(
  generatedCategoryHeroImagePath('en', 'food_drinks'),
  '/curriculum/generated-categories/en/food_drinks/entries/bread.webp',
  'builds food and drinks generated category hero path',
)

assertEqual(
  generatedCategoryHeroImagePath('en', 'nature_weather'),
  '/curriculum/generated-categories/en/nature_weather/entries/sun.webp',
  'builds nature and weather generated category hero path',
)

assertEqual(
  generatedCategoryHeroImagePath('en', 'jobs_people'),
  '/curriculum/generated-categories/en/jobs_people/entries/person.webp',
  'builds jobs and people generated category hero path',
)
