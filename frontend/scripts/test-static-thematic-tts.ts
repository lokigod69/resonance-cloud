import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildStaticThematicAudioLookup,
  getStaticThematicAudio,
  buildStaticThematicPlaybackQuery,
} from '../src/lib/staticThematicAudio'
import {
  buildStaticThematicTtsInventory,
  writeStaticThematicTtsInventory,
} from './export-static-thematic-tts-inventory'

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['tts:static:inventory'],
  'tsx scripts/export-static-thematic-tts-inventory.ts',
  'package.json should expose the static thematic TTS inventory exporter',
)
assert.ok(
  existsSync(resolve(process.cwd(), 'scripts/export-static-thematic-tts-inventory.ts')),
  'static thematic TTS inventory exporter should exist',
)

const levelOne = buildStaticThematicTtsInventory({
  targetLanguage: 'en',
  category: 'animals',
  level: 1,
})

assert.equal(levelOne.length, 10, 'English Animals Level 1 should export 10 items')
assert.deepEqual(
  levelOne.slice(0, 4).map((item) => ({
    concept_id: item.concept_id,
    target_term: item.target_term,
    spoken_text: item.spoken_text,
  })),
  [
    { concept_id: 'animals.dog', target_term: 'dog', spoken_text: 'dog' },
    { concept_id: 'animals.cat', target_term: 'cat', spoken_text: 'cat' },
    { concept_id: 'animals.bird', target_term: 'bird', spoken_text: 'bird' },
    { concept_id: 'animals.fish', target_term: 'fish', spoken_text: 'fish' },
  ],
  'English spoken_text should be the bare English lemma from static data',
)
assert.ok(levelOne.every((item) => item.target_language_code === 'en'))
assert.ok(levelOne.every((item) => item.category_slug === 'animals'))
assert.ok(levelOne.every((item) => item.part_of_speech === 'noun'))

const cebuanoLevelOne = buildStaticThematicTtsInventory({
  targetLanguage: 'ceb',
  category: 'animals',
  level: 1,
})

assert.equal(cebuanoLevelOne.length, 10, 'Cebuano/Bisaya Animals Level 1 should export 10 items')
assert.deepEqual(
  cebuanoLevelOne.map((item) => ({
    concept_id: item.concept_id,
    english_qa_label: item.english_qa_label,
    target_term: item.target_term,
    spoken_text: item.spoken_text,
    target_language_code: item.target_language_code,
  })),
  [
    { concept_id: 'animals.dog', english_qa_label: 'dog', target_term: 'iro', spoken_text: 'iro', target_language_code: 'ceb' },
    { concept_id: 'animals.cat', english_qa_label: 'cat', target_term: 'iring', spoken_text: 'iring', target_language_code: 'ceb' },
    { concept_id: 'animals.bird', english_qa_label: 'bird', target_term: 'langgam', spoken_text: 'langgam', target_language_code: 'ceb' },
    { concept_id: 'animals.fish', english_qa_label: 'fish', target_term: 'isda', spoken_text: 'isda', target_language_code: 'ceb' },
    { concept_id: 'animals.horse', english_qa_label: 'horse', target_term: 'kabayo', spoken_text: 'kabayo', target_language_code: 'ceb' },
    { concept_id: 'animals.cow', english_qa_label: 'cow', target_term: 'baka', spoken_text: 'baka', target_language_code: 'ceb' },
    { concept_id: 'animals.pig', english_qa_label: 'pig', target_term: 'baboy', spoken_text: 'baboy', target_language_code: 'ceb' },
    { concept_id: 'animals.sheep', english_qa_label: 'sheep', target_term: 'karnero', spoken_text: 'karnero', target_language_code: 'ceb' },
    { concept_id: 'animals.goat', english_qa_label: 'goat', target_term: 'kanding', spoken_text: 'kanding', target_language_code: 'ceb' },
    { concept_id: 'animals.chicken', english_qa_label: 'chicken', target_term: 'manok', spoken_text: 'manok', target_language_code: 'ceb' },
  ],
  'Cebuano spoken_text should be the bare Cebuano/Bisaya term, not English',
)
assert.ok(!cebuanoLevelOne.some((item) => item.spoken_text === item.english_qa_label))
assert.equal(
  buildStaticThematicTtsInventory({ targetLanguage: 'cebuano', category: 'animals', level: 1 })[0].target_language_code,
  'ceb',
)
assert.equal(
  buildStaticThematicTtsInventory({ targetLanguage: 'bisaya', category: 'animals', level: 1 })[0].target_language_code,
  'ceb',
)
assert.equal(
  buildStaticThematicTtsInventory({ targetLanguage: 'sebuano', category: 'animals', level: 1 })[0].target_language_code,
  'ceb',
)

const allAnimals = buildStaticThematicTtsInventory({
  targetLanguage: 'en',
  category: 'animals',
  allLevels: true,
})
assert.equal(allAnimals.length, 100, 'English Animals all-level export should include 100 words')

const cebuanoFruitsLevelTwo = buildStaticThematicTtsInventory({
  targetLanguage: 'ceb',
  category: 'fruits',
  level: 2,
})
assert.equal(cebuanoFruitsLevelTwo.length, 10, 'Cebuano/Bisaya Fruits Level 2 should export 10 items')
assert.equal(
  cebuanoFruitsLevelTwo.find((item) => item.concept_id === 'fruits.blueberry')?.spoken_text,
  'blueberry',
  'Cebuano/Bisaya export should allow same-as-English terms when static data explicitly supplies them',
)

const indonesianLevelOne = buildStaticThematicTtsInventory({
  targetLanguage: 'id',
  category: 'animals',
  level: 1,
})
assert.equal(indonesianLevelOne.length, 10, 'Indonesian Animals Level 1 should export 10 items')
assert.deepEqual(
  indonesianLevelOne.map((item) => ({
    concept_id: item.concept_id,
    english_qa_label: item.english_qa_label,
    spoken_text: item.spoken_text,
    target_language_code: item.target_language_code,
  })),
  [
    { concept_id: 'animals.dog', english_qa_label: 'dog', spoken_text: 'anjing', target_language_code: 'id' },
    { concept_id: 'animals.cat', english_qa_label: 'cat', spoken_text: 'kucing', target_language_code: 'id' },
    { concept_id: 'animals.bird', english_qa_label: 'bird', spoken_text: 'burung', target_language_code: 'id' },
    { concept_id: 'animals.fish', english_qa_label: 'fish', spoken_text: 'ikan', target_language_code: 'id' },
    { concept_id: 'animals.horse', english_qa_label: 'horse', spoken_text: 'kuda', target_language_code: 'id' },
    { concept_id: 'animals.cow', english_qa_label: 'cow', spoken_text: 'sapi', target_language_code: 'id' },
    { concept_id: 'animals.pig', english_qa_label: 'pig', spoken_text: 'babi', target_language_code: 'id' },
    { concept_id: 'animals.sheep', english_qa_label: 'sheep', spoken_text: 'domba', target_language_code: 'id' },
    { concept_id: 'animals.goat', english_qa_label: 'goat', spoken_text: 'kambing', target_language_code: 'id' },
    { concept_id: 'animals.chicken', english_qa_label: 'chicken', spoken_text: 'ayam', target_language_code: 'id' },
  ],
  'Indonesian spoken_text should be the bare Indonesian term, not English',
)
assert.ok(!indonesianLevelOne.some((item) => item.spoken_text === item.english_qa_label))

const germanLevelOne = buildStaticThematicTtsInventory({
  targetLanguage: 'de',
  category: 'animals',
  level: 1,
})
assert.equal(germanLevelOne.length, 10, 'German Animals Level 1 should export 10 items')
assert.deepEqual(
  germanLevelOne.slice(0, 4).map((item) => ({
    concept_id: item.concept_id,
    english_qa_label: item.english_qa_label,
    spoken_text: item.spoken_text,
    target_language_code: item.target_language_code,
  })),
  [
    { concept_id: 'animals.dog', english_qa_label: 'dog', spoken_text: 'Hund', target_language_code: 'de' },
    { concept_id: 'animals.cat', english_qa_label: 'cat', spoken_text: 'Katze', target_language_code: 'de' },
    { concept_id: 'animals.bird', english_qa_label: 'bird', spoken_text: 'Vogel', target_language_code: 'de' },
    { concept_id: 'animals.fish', english_qa_label: 'fish', spoken_text: 'Fisch', target_language_code: 'de' },
  ],
  'German spoken_text should preserve the existing German static term',
)
assert.ok(!germanLevelOne.some((item) => item.spoken_text === item.english_qa_label))

const spanishLevelOne = buildStaticThematicTtsInventory({
  targetLanguage: 'es',
  category: 'animals',
  level: 1,
})
assert.equal(spanishLevelOne.length, 10, 'Spanish Animals Level 1 should export 10 items')
assert.deepEqual(
  spanishLevelOne.slice(0, 4).map((item) => ({
    concept_id: item.concept_id,
    english_qa_label: item.english_qa_label,
    spoken_text: item.spoken_text,
    target_language_code: item.target_language_code,
  })),
  [
    { concept_id: 'animals.dog', english_qa_label: 'dog', spoken_text: 'perro', target_language_code: 'es' },
    { concept_id: 'animals.cat', english_qa_label: 'cat', spoken_text: 'gato', target_language_code: 'es' },
    { concept_id: 'animals.bird', english_qa_label: 'bird', spoken_text: 'pájaro', target_language_code: 'es' },
    { concept_id: 'animals.fish', english_qa_label: 'fish', spoken_text: 'pez', target_language_code: 'es' },
  ],
  'Spanish spoken_text should preserve the existing Spanish static term',
)
assert.ok(!spanishLevelOne.some((item) => item.spoken_text === item.english_qa_label))

const frenchLevelOne = buildStaticThematicTtsInventory({
  targetLanguage: 'fr',
  category: 'animals',
  level: 1,
})
assert.equal(frenchLevelOne.length, 10, 'French Animals Level 1 should export 10 items')
assert.deepEqual(
  frenchLevelOne.slice(0, 4).map((item) => ({
    concept_id: item.concept_id,
    english_qa_label: item.english_qa_label,
    spoken_text: item.spoken_text,
    target_language_code: item.target_language_code,
  })),
  [
    { concept_id: 'animals.dog', english_qa_label: 'dog', spoken_text: 'chien', target_language_code: 'fr' },
    { concept_id: 'animals.cat', english_qa_label: 'cat', spoken_text: 'chat', target_language_code: 'fr' },
    { concept_id: 'animals.bird', english_qa_label: 'bird', spoken_text: 'oiseau', target_language_code: 'fr' },
    { concept_id: 'animals.fish', english_qa_label: 'fish', spoken_text: 'poisson', target_language_code: 'fr' },
  ],
  'French spoken_text should preserve the existing French static term',
)
assert.ok(!frenchLevelOne.some((item) => item.spoken_text === item.english_qa_label))

const koreanLevelOne = buildStaticThematicTtsInventory({
  targetLanguage: 'ko',
  category: 'animals',
  level: 1,
})
assert.equal(koreanLevelOne.length, 10, 'Korean Animals Level 1 should export 10 items')
assert.deepEqual(
  koreanLevelOne.slice(0, 4).map((item) => ({
    concept_id: item.concept_id,
    english_qa_label: item.english_qa_label,
    spoken_text: item.spoken_text,
    target_language_code: item.target_language_code,
  })),
  [
    { concept_id: 'animals.dog', english_qa_label: 'dog', spoken_text: '개', target_language_code: 'ko' },
    { concept_id: 'animals.cat', english_qa_label: 'cat', spoken_text: '고양이', target_language_code: 'ko' },
    { concept_id: 'animals.bird', english_qa_label: 'bird', spoken_text: '새', target_language_code: 'ko' },
    { concept_id: 'animals.fish', english_qa_label: 'fish', spoken_text: '물고기', target_language_code: 'ko' },
  ],
  'Korean spoken_text should preserve the existing Korean static term',
)
assert.ok(!koreanLevelOne.some((item) => item.spoken_text === item.english_qa_label))

const cebuanoAllCategories = buildStaticThematicTtsInventory({
  targetLanguage: 'ceb',
  allCategories: true,
  allLevels: true,
})
assert.equal(cebuanoAllCategories.length, 1850, 'Cebuano/Bisaya all-category export should include every public static thematic item')
assert.ok(cebuanoAllCategories.every((item) => item.target_language_code === 'ceb'))
assert.ok(cebuanoAllCategories.every((item) => item.category_slug))
assert.ok(cebuanoAllCategories.every((item) => Number.isInteger(item.level_number) && item.level_number > 0))
assert.ok(cebuanoAllCategories.every((item) => item.spoken_text.trim().length > 0))
assert.equal(
  new Set(cebuanoAllCategories.map((item) => `${item.target_language_code}|${item.category_slug}|${item.concept_id}`)).size,
  cebuanoAllCategories.length,
  'all-category export should not duplicate concept ids within a target language/category',
)

assert.throws(
  () => buildStaticThematicTtsInventory({ targetLanguage: 'not-a-language', category: 'animals', level: 1 }),
  /Unsupported target language/,
  'exporter should reject unsupported target-language requests',
)
assert.throws(
  () => writeStaticThematicTtsInventory([{ ...levelOne[0] }, { ...levelOne[0] }]),
  /Duplicate concept_id/,
  'exporter should catch duplicate concept ids before writing',
)

const query = buildStaticThematicPlaybackQuery({
  targetLanguageCode: 'ceb',
  categorySlug: 'fruits',
  levelNumber: 1,
  conceptIds: ['fruits.apple', 'fruits.banana'],
  voiceProfileKeys: ['static_thematic_ceb_yumi_raw_v1'],
})
assert.equal(query.table, 'static_tts_playback')
assert.deepEqual(query.filters, {
  target_language_code: 'ceb',
  category_slug: 'fruits',
  level_number: 1,
})
assert.deepEqual(query.conceptIds, ['fruits.apple', 'fruits.banana'])
assert.deepEqual(query.voiceProfileKeys, ['static_thematic_ceb_yumi_raw_v1'])

const germanKeys = buildStaticThematicPlaybackQuery({
  targetLanguageCode: 'de',
  categorySlug: 'animals',
  levelNumber: 1,
  conceptIds: ['animals.dog'],
  voiceProfileKeys: [
    'static_thematic_de_laura_raw_v1',
    'static_thematic_de_william_raw_v1',
    'static_thematic_de_helmut_raw_v1',
    'static_thematic_de_enniah_raw_v1',
  ],
})
assert.deepEqual(germanKeys.voiceProfileKeys, [
  'static_thematic_de_laura_raw_v1',
  'static_thematic_de_william_raw_v1',
  'static_thematic_de_helmut_raw_v1',
  'static_thematic_de_enniah_raw_v1',
])

const spanishKeys = buildStaticThematicPlaybackQuery({
  targetLanguageCode: 'es',
  categorySlug: 'animals',
  levelNumber: 1,
  conceptIds: ['animals.dog'],
  voiceProfileKeys: [
    'static_thematic_es_lia_raw_v1',
    'static_thematic_es_veronica_raw_v1',
    'static_thematic_es_el_farao_raw_v1',
    'static_thematic_es_david_raw_v1',
  ],
})
assert.deepEqual(spanishKeys.voiceProfileKeys, [
  'static_thematic_es_lia_raw_v1',
  'static_thematic_es_veronica_raw_v1',
  'static_thematic_es_el_farao_raw_v1',
  'static_thematic_es_david_raw_v1',
])

const frenchKeys = buildStaticThematicPlaybackQuery({
  targetLanguageCode: 'fr',
  categorySlug: 'animals',
  levelNumber: 1,
  conceptIds: ['animals.dog'],
  voiceProfileKeys: [
    'static_thematic_fr_lilly_raw_v1',
    'static_thematic_fr_stephyra_raw_v1',
    'static_thematic_fr_guillaume_raw_v1',
    'static_thematic_fr_adam_raw_v1',
  ],
})
assert.deepEqual(frenchKeys.voiceProfileKeys, [
  'static_thematic_fr_lilly_raw_v1',
  'static_thematic_fr_stephyra_raw_v1',
  'static_thematic_fr_guillaume_raw_v1',
  'static_thematic_fr_adam_raw_v1',
])

const koreanKeys = buildStaticThematicPlaybackQuery({
  targetLanguageCode: 'ko',
  categorySlug: 'animals',
  levelNumber: 1,
  conceptIds: ['animals.dog'],
  voiceProfileKeys: [
    'static_thematic_ko_jini_raw_v1',
    'static_thematic_ko_yuna_raw_v1',
    'static_thematic_ko_kanna_raw_v1',
    'static_thematic_ko_selly_raw_v1',
    'static_thematic_ko_emily_raw_v1',
    'static_thematic_ko_sola_raw_v1',
  ],
})
assert.deepEqual(koreanKeys.voiceProfileKeys, [
  'static_thematic_ko_jini_raw_v1',
  'static_thematic_ko_yuna_raw_v1',
  'static_thematic_ko_kanna_raw_v1',
  'static_thematic_ko_selly_raw_v1',
  'static_thematic_ko_emily_raw_v1',
  'static_thematic_ko_sola_raw_v1',
])

const lookup = buildStaticThematicAudioLookup([
  {
    target_language_code: 'en',
    category_slug: 'animals',
    level_number: 1,
    concept_id: 'animals.dog',
    spoken_text: 'dog',
    public_url: 'https://cdn.example/animals.dog.mp3',
    duration_ms: 412,
    audio_version: 1,
    voice_profile_key: 'static_thematic_en_animals_v1',
    qa_status: 'ready',
  },
  {
    target_language_code: 'en',
    category_slug: 'animals',
    level_number: 1,
    concept_id: 'animals.dog',
    spoken_text: 'dog',
    public_url: 'https://cdn.example/animals.dog.serafina.mp3',
    duration_ms: 812,
    audio_version: 1,
    voice_profile_key: 'static_thematic_en_animals_serafina_raw_v1',
    qa_status: 'ready',
  },
])
assert.equal(getStaticThematicAudio(lookup, 'animals.dog')?.public_url, 'https://cdn.example/animals.dog.mp3')
assert.equal(
  getStaticThematicAudio(lookup, 'animals.dog', 'static_thematic_en_animals_serafina_raw_v1')?.public_url,
  'https://cdn.example/animals.dog.serafina.mp3',
)
assert.equal(getStaticThematicAudio(lookup, 'animals.cat'), undefined, 'missing audio should stay absent from lookup')

process.stdout.write('test-static-thematic-tts: OK\n')
