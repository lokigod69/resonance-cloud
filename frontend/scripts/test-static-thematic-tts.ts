import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildStaticThematicAudioLookup,
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

const allAnimals = buildStaticThematicTtsInventory({
  targetLanguage: 'en',
  category: 'animals',
  allLevels: true,
})
assert.equal(allAnimals.length, 100, 'English Animals all-level export should include 100 words')

assert.throws(
  () => buildStaticThematicTtsInventory({ targetLanguage: 'de', category: 'animals', level: 1 }),
  /Only English/,
  'exporter should reject non-English pilot requests',
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
})
assert.equal(query.table, 'static_tts_playback')
assert.deepEqual(query.filters, {
  target_language_code: 'en',
  category_slug: 'animals',
  level_number: 1,
})
assert.deepEqual(query.conceptIds, ['animals.dog', 'animals.cat'])

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
])
assert.equal(lookup.get('animals.dog')?.public_url, 'https://cdn.example/animals.dog.mp3')
assert.equal(lookup.get('animals.cat'), undefined, 'missing audio should stay absent from lookup')

process.stdout.write('test-static-thematic-tts: OK\n')
