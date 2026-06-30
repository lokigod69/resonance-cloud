import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = process.cwd()

function readSource(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function assertInOrder(source: string, needles: string[], label: string) {
  let cursor = -1
  for (const needle of needles) {
    const index = source.indexOf(needle, cursor + 1)
    assert.notEqual(index, -1, `${label}: missing "${needle}" after index ${cursor}`)
    cursor = index
  }
}

const songGeneration = readSource('src/lib/songGeneration.ts')
assert.match(songGeneration, /deckId\?: string/, 'level song submit input should carry optional deckId')
assert.match(songGeneration, /p_deck_id:\s*deckId\s*\?\?\s*null/, 'level song RPC should pass p_deck_id')

const modal = readSource('src/components/song-generation/LevelGenerateSongModal.tsx')
assert.match(modal, /deckId:\s*string/, 'level song modal should require a deckId prop')
const modalSubmitIndex = modal.indexOf('submitLevelMusicOnlyJob({')
assert.notEqual(modalSubmitIndex, -1, 'level song modal should submit through submitLevelMusicOnlyJob')
assert.notEqual(modal.indexOf('deckId,', modalSubmitIndex), -1, 'level song modal should submit deckId')

const levelDetail = readSource('src/pages/categories/LevelDetailPage.tsx')
assert.match(levelDetail, /const \[levelSongDeckId,\s*setLevelSongDeckId\]/, 'static level page should hold generated-song deck id state')
assertInOrder(
  levelDetail,
  [
    'const ensureStaticLevelImported = useCallback(async () => {',
    'getImportedCurriculumDeck',
    'importStaticCategoryLevel',
    'return deckId',
  ],
  'static level import guard',
)
assertInOrder(
  levelDetail,
  [
    'const handleGenerateLevelSong = useCallback(async () => {',
    'await ensureStaticLevelImported()',
    'setLevelSongDeckId(deckId)',
    'setLevelSongModalOpen(true)',
  ],
  'generate song import-before-modal flow',
)
assertInOrder(
  levelDetail,
  [
    'onClick={handleGenerateLevelSong}',
    '<LevelGenerateSongModal',
    'deckId={levelSongDeckId}',
  ],
  'level song modal wiring',
)

const migrationsDir = resolve(root, 'supabase/migrations')
const migrationName = readdirSync(migrationsDir)
  .filter((name) => /level_music.*deck_id.*\.sql$/.test(name))
  .sort()
  .at(-1)
assert.ok(migrationName, 'a level music deck_id migration should exist')

const migrationPath = join(migrationsDir, migrationName)
assert.ok(existsSync(migrationPath), 'level music deck_id migration should resolve')
const migration = readFileSync(migrationPath, 'utf8')

assert.match(
  migration,
  /drop function if exists public\.submit_level_music_only_job\(text, integer, text, jsonb, text, text, text, text, text\)/,
  'migration should remove the old RPC signature before creating the deck-aware one',
)
assert.match(
  migration,
  /create or replace function public\.submit_level_music_only_job\([\s\S]*p_deck_id uuid default null/,
  'migration should add optional p_deck_id to submit_level_music_only_job',
)
assert.match(migration, /v_deck public\.decks%rowtype/, 'migration should load the referenced deck row')
assert.match(migration, /from public\.decks[\s\S]*where id = p_deck_id[\s\S]*and user_id = v_user_id/, 'migration should validate deck ownership')
assert.match(migration, /source_kind is distinct from 'curriculum'/, 'migration should require curriculum decks')
assert.match(migration, /curriculum_category_slug is distinct from v_category_slug/, 'migration should validate deck category')
assert.match(migration, /curriculum_level is distinct from p_level_number/, 'migration should validate deck level')
assert.match(migration, /target_language is distinct from v_target_language/, 'migration should validate deck language')
assert.match(
  migration,
  /if p_deck_id is not null and v_existing_job\.deck_id is distinct from p_deck_id then[\s\S]*raise exception 'Deck does not match level song request'/,
  'migration should reject mismatched deck ids even on idempotent replay',
)
assert.match(migration, /deck_id,[\s\S]*values[\s\S]*v_deck_id/, 'migration should insert the validated deck id')
assert.match(migration, /'deck_id', v_job\.deck_id/, 'migration should return deck_id in the RPC JSON')
assert.match(migration, /notify pgrst, 'reload schema'/, 'migration should reload the PostgREST schema cache')
assert.match(
  migration,
  /grant execute on function public\.submit_level_music_only_job\(text, integer, text, jsonb, text, text, text, text, text, uuid\) to authenticated/,
  'migration should grant the new RPC signature to authenticated users',
)

console.log('test-level-song-auto-import-contract: OK')
