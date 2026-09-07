import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildGuidedPhraseCatalogRows, renderGuidedPhraseCatalogMigration } from './generate-guided-phrase-catalog-migration.ts'

let passed = 0
let failed = 0
function assert(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed += 1
    console.log(`  ok  ${name}`)
  } else {
    failed += 1
    console.error(`  FAIL ${name}`)
    if (detail !== undefined) console.error(detail)
  }
}

const rows = buildGuidedPhraseCatalogRows()
const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260907130000_guided_phrase_catalog.sql', import.meta.url))
const identityMigrationPath = fileURLToPath(new URL('../supabase/migrations/20260907133000_guided_tts_catalog_identity.sql', import.meta.url))
const baselinePath = fileURLToPath(new URL('../supabase/migrations/20260517010000_guided_tts_v1.sql', import.meta.url))
const migration = readFileSync(migrationPath, 'utf8')
const identityMigration = readFileSync(identityMigrationPath, 'utf8')
const baseline = readFileSync(baselinePath, 'utf8')
const coordinates = rows.map((row) => `${row.pathId}|${row.lessonId}|${row.vibe}`)
const translationShapes = rows.reduce<Record<string, number>>((counts, row) => {
  const shape = Object.keys(row.translations).sort().join('+')
  counts[shape] = (counts[shape] ?? 0) + 1
  return counts
}, {})

assert('catalog contains every active authored phrase coordinate', rows.length === 2700, rows.length)
assert('catalog coordinates are unique', new Set(coordinates).size === rows.length)
assert('catalog has no empty phrase or target language', rows.every((row) => row.phrase.length > 0 && row.targetLanguage.length > 0))
assert('catalog target codes cover all twelve guided languages', new Set(rows.map((row) => row.targetLanguageCode)).size === 12)
assert('catalog maps authored Cebuano to the canonical product name Bisaya', rows.filter((row) => row.targetLanguageCode === 'ceb-PH').every((row) => row.targetLanguage === 'Bisaya'))
assert('catalog retains the current verified translation coverage exactly', JSON.stringify(translationShapes) === JSON.stringify({ 'English+German': 2000, German: 400, English: 300 }), translationShapes)
assert('every row registers its authored explanation language', rows.every((row) => Boolean(row.translations[row.authoredBaseLanguage]?.trim())))
assert('every row has a deterministic SHA-256 content hash', rows.every((row) => /^[0-9a-f]{64}$/.test(row.contentHash)))
assert('committed catalog migration is generated deterministically', migration === renderGuidedPhraseCatalogMigration())
assert('catalog table is private from browser roles', migration.includes('revoke all on public.guided_phrase_catalog from public, anon, authenticated'))
assert('RPC validates the catalog before taking a deck lock', migration.indexOf('from public.guided_phrase_catalog c') < migration.indexOf('pg_advisory_xact_lock'))
assert('RPC requires a registered base-language translation', migration.includes('v_catalog.translations ->> v_base'))
assert('catalog redeploy preserves verified locale overlays only while authored content is unchanged', migration.includes('guided_phrase_catalog.translations || excluded.translations') && migration.includes('when guided_phrase_catalog.content_hash is distinct from excluded.content_hash'))
assert('RPC verifies optional audio against the canonical phrase and target code', migration.includes('v_audio_target is distinct from v_catalog.target_language_code') && migration.includes('btrim(v_audio_source) is distinct from v_catalog.phrase'))
assert('saved metadata records the immutable catalog content hash', migration.includes("'catalog_hash',v_catalog.content_hash"))
assert('restored Guided TTS baseline uses an RLS-invoker playback view', baseline.includes('with (security_invoker = true) as'))
assert('additive migration also repairs the production playback view security mode', migration.includes('create or replace view public.guided_tts_playback\nwith (security_invoker = true) as'))
assert('audio identity accepts only an exact BCP-47 code or its exact primary subtag', identityMigration.includes("lower(btrim(v_audio_target)) = split_part(lower(btrim(v_catalog.target_language_code)), '-', 1)"))
assert('audio identity rejects null language codes', identityMigration.includes('or not coalesce((') && identityMigration.includes('), false)'))
assert('audio identity still requires the exact canonical phrase', identityMigration.includes('btrim(v_audio_source) is distinct from v_catalog.phrase'))
assert('mismatched audio usage is archived privately before unlinking', identityMigration.indexOf('insert into public.guided_tts_asset_usage_quarantine') < identityMigration.indexOf('delete from public.guided_tts_asset_usages') && identityMigration.includes('revoke all on table public.guided_tts_asset_usage_quarantine from public, anon, authenticated'))
assert('quarantine leaves the underlying recording asset intact', !identityMigration.includes('delete from public.guided_tts_assets'))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
