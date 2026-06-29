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

assert.throws(
  () => buildStaticThematicTtsInventory({ targetLanguage: 'not-a-language', category: 'animals', level: 1 }),
  /Unsupported target language/,
  'exporter should reject unsupported target-language requests',
)
assert.throws(
  () => buildStaticThematicTtsInventory({ targetLanguage: 'en', category: 'fruits', level: 1 }),
  /Only the Animals category/,
  'exporter should reject non-Animals pilot requests',
)
assert.throws(
  () => writeStaticThematicTtsInventory([{ ...levelOne[0] }, { ...levelOne[0] }]),
  /Duplicate concept_id/,
  'exporter should catch duplicate concept ids before writing',
)

const query = buildStaticThematicPlaybackQuery({
  targetLanguageCode: 'en',
  categorySlug: 'animals',
  levelNumber: 1,
  conceptIds: ['animals.dog', 'animals.cat'],
  voiceProfileKeys: ['static_thematic_en_animals_elisa_raw_v1', 'static_thematic_en_animals_serafina_raw_v1'],
})
assert.equal(query.table, 'static_tts_playback')
assert.deepEqual(query.filters, {
  target_language_code: 'en',
  category_slug: 'animals',
  level_number: 1,
})
assert.deepEqual(query.conceptIds, ['animals.dog', 'animals.cat'])
assert.deepEqual(query.voiceProfileKeys, ['static_thematic_en_animals_elisa_raw_v1', 'static_thematic_en_animals_serafina_raw_v1'])

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
