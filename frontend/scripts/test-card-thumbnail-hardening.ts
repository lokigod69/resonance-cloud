import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

const migration = read('supabase/migrations/20260907106000_card_thumbnails_and_bounded_deck_mutations.sql')
assert.match(migration, /add column if not exists card_thumbnail_url text/)
assert.match(migration, /before update of card_thumbnail_url on public\.words/)
assert.match(migration, /phase1e_queue_card_thumbnail_cleanup/)
assert.equal(
  [...migration.matchAll(/status in \('pending', 'approved', 'processing'\)/g)].length,
  2,
  'both learner deck-delete RPCs should reject every active generation state',
)
assert.equal(
  [...migration.matchAll(/must contain at most 500 items/g)].length,
  3,
  'curriculum import, imageless import, and imageless append should all be capped',
)
assert.doesNotMatch(
  migration,
  /grant execute on function public\.submit_imageless_import[^\n]+to authenticated, anon/,
  'the replacement must not restore anonymous import execution',
)

const rollbackTest = read('supabase/tests/20260907106000_card_thumbnail_and_deck_mutation_integration_rollback.sql')
assert.match(rollbackTest, /generate_series\(1, 500\)/, 'rollback test should accept the exact item cap')
assert.match(rollbackTest, /v_appended <> 500/, 'rollback test should execute the exact-cap append body')
for (const [code, canonical] of [['pl', 'Polish'], ['ru', 'Russian'], ['ja', 'Japanese']]) {
  assert.match(
    rollbackTest,
    new RegExp(`normalize_language_value\\('${code}'\\) <> '${canonical}'`),
    `rollback test should verify ${code} normalization`,
  )
}

const imageUrls = read('src/lib/imageUrls.ts')
assert.match(
  imageUrls,
  /getCardPreviewUrl[\s\S]*publicAssetUrl\(cardThumbnailUrl\) \|\| publicAssetUrl\(fullImageUrl\)/,
  'preview helper should prefer WebP and fall back to the legacy/full image',
)

for (const page of ['src/pages/Decks.tsx', 'src/pages/DecksPG.tsx']) {
  const source = read(page)
  assert.match(source, /select\('deck_id, thumbnail_url, card_thumbnail_url'\)/, `${page} query`)
  assert.match(source, /getCardPreviewUrl\(w\.card_thumbnail_url, w\.thumbnail_url\)/, `${page} fallback`)
}

for (const page of ['src/pages/DeckView.tsx', 'src/pages/DeckViewPG.tsx']) {
  const source = read(page)
  assert.match(
    source,
    /getCardPreviewUrl\(word\.card_thumbnail_url, word\.thumbnail_url\)/,
    `${page} card tile`,
  )
}

const studySession = read('src/hooks/useStudySession.ts')
assert.match(studySession, /thumbnail_url, card_thumbnail_url, tts_audio_url/)
const orbDock = read('src/components/OrbDock.tsx')
assert.match(orbDock, /getCardPreviewUrl\(word\.card_thumbnail_url, word\.thumbnail_url\)/)

const deleteAccount = read('api/delete-account.ts')
assert.match(deleteAccount, /select\('id,video_url,thumbnail_url,card_thumbnail_url,/)
assert.match(deleteAccount, /addStorageUrl\(objectsByBucket, 'videos', row\.card_thumbnail_url\)/)

for (const detailSurface of [
  'src/components/deck/CardWordViewerModal.tsx',
  'src/components/study/canvas/EmberCanvas.tsx',
  'src/pages/SharePage.tsx',
]) {
  assert.match(
    read(detailSurface),
    /getCardFullUrl/,
    `${detailSurface} should continue using the full card image`,
  )
}

console.log('card thumbnail and bounded deck mutation contracts passed')
