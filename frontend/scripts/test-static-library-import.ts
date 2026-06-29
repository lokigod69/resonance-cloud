import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  getPublicCategoryGroups,
} from '../src/data/categories.ts'
import {
  buildStaticCategoryImportPayload,
  buildStaticCategoryLevelDeckName,
  importStaticCategoryLevel,
} from '../src/lib/curriculumDeckBridge.ts'

const animals = getPublicCategoryGroups()
  .flatMap((group) => group.categories)
  .find((category) => category.id === 'animals')

assert.ok(animals, 'Animals category should exist')

const payload = buildStaticCategoryImportPayload(animals, 1, 'English', 'German')

assert.equal(payload.length, 10, 'Animals Level 1 import should create one 10-word deck payload')
assert.deepEqual(
  payload.slice(0, 4).map((entry) => entry.term),
  ['dog', 'cat', 'bird', 'fish'],
  'payload terms should be selected target-language words',
)
assert.deepEqual(
  payload.slice(0, 4).map((entry) => entry.translation),
  ['Hund', 'Katze', 'Vogel', 'Fisch'],
  'payload translations should use helper/base language',
)

for (const entry of payload) {
  assert.equal(entry.status, undefined, 'payload should leave status decisions to the static import RPC contract')
  assert.ok(entry.thumbnail_url?.startsWith('/curriculum/generated-categories/en/animals/entries/'), `${entry.term} should use generated static image assets`)
  assert.ok(
    existsSync(resolve(process.cwd(), `public${entry.thumbnail_url}`)),
    `${entry.term} image URL should resolve in public assets`,
  )
  assert.equal(entry.metadata?.source, 'static_thematic_library', `${entry.term} should identify static library source`)
  assert.equal(entry.metadata?.category_slug, 'animals', `${entry.term} should preserve category slug`)
  assert.equal(entry.metadata?.source_category_slug, 'animals', `${entry.term} should preserve source category slug`)
  assert.equal(entry.metadata?.level, 1, `${entry.term} should preserve level`)
  assert.equal(entry.metadata?.source_level_number, 1, `${entry.term} should preserve source level number`)
  assert.ok(entry.metadata?.source_concept_id, `${entry.term} should preserve source concept id`)
  assert.equal(entry.metadata?.target_language, 'English', `${entry.term} should preserve target language`)
  assert.equal(entry.metadata?.source_target_language_code, 'en', `${entry.term} should preserve source target language code`)
  assert.equal(entry.metadata?.helper_language, 'German', `${entry.term} should preserve helper language`)
}

const cebuanoPayloadWithAudio = buildStaticCategoryImportPayload(
  animals,
  1,
  'Bisaya',
  'English',
  new Map([
    [
      'animals.dog',
      {
        target_language_code: 'ceb',
        category_slug: 'animals',
        level_number: 1,
        concept_id: 'animals.dog',
        spoken_text: 'iro',
        public_url: 'https://cdn.example/static/ceb/animals.dog.mp3',
        duration_ms: 603,
        audio_version: 1,
        voice_profile_key: 'static_thematic_ceb_yumi_raw_v1',
        qa_status: 'ready',
      },
    ],
  ]),
)
const cebuanoDog = cebuanoPayloadWithAudio[0]
assert.equal(cebuanoDog.term, 'iro', 'Cebuano/Bisaya import should use target-language terms')
assert.equal(cebuanoDog.translation, 'dog', 'Cebuano/Bisaya import should use helper-language translations')
assert.equal(
  cebuanoDog.tts_audio_url,
  'https://cdn.example/static/ceb/animals.dog.mp3',
  'static category import should copy canonical static public URL into the existing deck audio field',
)
assert.equal(
  cebuanoDog.metadata?.static_tts_public_url,
  'https://cdn.example/static/ceb/animals.dog.mp3',
  'static category import should preserve canonical static public URL in metadata',
)
assert.equal(
  cebuanoDog.metadata?.static_tts_voice_profile_key,
  'static_thematic_ceb_yumi_raw_v1',
  'static category import should preserve canonical static voice profile key in metadata',
)

assert.equal(
  buildStaticCategoryLevelDeckName('Animals', 1),
  'Animals · Level 1',
  'English static deck name should be category plus level',
)
assert.equal(
  buildStaticCategoryLevelDeckName('Tiere', 1),
  'Tiere · Level 1',
  'German static deck name should use visible category label plus level',
)

const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = []
const fakeSupabase = {
  async rpc(name: string, args: Record<string, unknown>) {
    rpcCalls.push({ name, args })
    return { data: '00000000-0000-0000-0000-000000000123', error: null }
  },
}

const deckId = await importStaticCategoryLevel(
  fakeSupabase as never,
  animals,
  1,
  'English',
  'German',
  buildStaticCategoryLevelDeckName('Animals', 1),
)

assert.equal(deckId, '00000000-0000-0000-0000-000000000123', 'static import should return created deck id')
assert.equal(rpcCalls.length, 1, 'static import should make exactly one backend call')
assert.equal(rpcCalls[0].name, 'submit_curriculum_import', 'static import should use no-credit curriculum import RPC')
assert.equal(rpcCalls[0].args.p_category_slug, 'animals', 'static import should pass category slug')
assert.equal(rpcCalls[0].args.p_level_number, 1, 'static import should pass one selected level')
assert.equal(rpcCalls[0].args.p_level_name, 'Animals · Level 1', 'static import should pass deck name')
assert.equal(rpcCalls[0].args.p_target_language, 'English', 'static import should preserve selected target language')
assert.equal((rpcCalls[0].args.p_entries as unknown[]).length, 10, 'static import should create one level deck payload')
assert.notEqual(rpcCalls[0].name, 'submit_generation', 'static import must not call paid generation RPC')

console.log('test-static-library-import: OK')
