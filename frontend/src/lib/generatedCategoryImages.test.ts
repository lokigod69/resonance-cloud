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
assertEqual(hasGeneratedCategoryImages('places_buildings'), true, 'places and buildings generated image set is available')
assertEqual(hasGeneratedCategoryImages('transport_travel'), true, 'transport and travel generated image set is available')
assertEqual(hasGeneratedCategoryImages('jobs_people'), true, 'jobs and people generated image set is available')
assertEqual(hasGeneratedCategoryImages('feelings_states'), true, 'feelings and states generated image set is available')
assertEqual(hasGeneratedCategoryImages('education_learning'), true, 'education and learning generated image set is available')
assertEqual(hasGeneratedCategoryImages('sports_hobbies'), true, 'sports and hobbies generated image set is available')
assertEqual(hasGeneratedCategoryImages('music_instruments'), true, 'music and instruments generated image set is available')
assertEqual(hasGeneratedCategoryImages('arts_entertainment'), true, 'arts and entertainment generated image set is available')
assertEqual(hasGeneratedCategoryImages('technology_media'), true, 'technology and media generated image set is available')
assertEqual(hasGeneratedCategoryImages('money_shopping_services'), true, 'money shopping and services generated image set is available')

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
  generatedCategoryHeroImagePath('en', 'places_buildings'),
  '/curriculum/generated-categories/en/places_buildings/entries/school.webp',
  'builds places and buildings generated category hero path',
)

assertEqual(
  generatedCategoryHeroImagePath('en', 'transport_travel'),
  '/curriculum/generated-categories/en/transport_travel/entries/car.webp',
  'builds transport and travel generated category hero path',
)

assertEqual(
  generatedCategoryHeroImagePath('en', 'jobs_people'),
  '/curriculum/generated-categories/en/jobs_people/entries/person.webp',
  'builds jobs and people generated category hero path',
)

assertEqual(
  generatedCategoryHeroImagePath('en', 'feelings_states'),
  '/curriculum/generated-categories/en/feelings_states/entries/happy.webp',
  'builds feelings and states generated category hero path',
)

assertEqual(
  generatedCategoryHeroImagePath('en', 'education_learning'),
  '/curriculum/generated-categories/en/education_learning/entries/student.webp',
  'builds education and learning generated category hero path',
)

assertEqual(
  generatedCategoryHeroImagePath('en', 'sports_hobbies'),
  '/curriculum/generated-categories/en/sports_hobbies/entries/football.webp',
  'builds sports and hobbies generated category hero path',
)

assertEqual(
  generatedCategoryHeroImagePath('en', 'music_instruments'),
  '/curriculum/generated-categories/en/music_instruments/entries/piano.webp',
  'builds music and instruments generated category hero path',
)

assertEqual(
  generatedCategoryHeroImagePath('en', 'arts_entertainment'),
  '/curriculum/generated-categories/en/arts_entertainment/entries/painting.webp',
  'builds arts and entertainment generated category hero path',
)

assertEqual(
  generatedCategoryHeroImagePath('en', 'technology_media'),
  '/curriculum/generated-categories/en/technology_media/entries/computer.webp',
  'builds technology and media generated category hero path',
)

assertEqual(
  generatedCategoryHeroImagePath('en', 'money_shopping_services'),
  '/curriculum/generated-categories/en/money_shopping_services/entries/money.webp',
  'builds money shopping and services generated category hero path',
)
