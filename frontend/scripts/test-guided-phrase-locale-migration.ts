import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildGuidedPhraseLocalePatches,
  GUIDED_PHRASE_BASE_LOCALES,
  guidedPhraseOverlayKey,
  listUnexpectedOverlayFiles,
  renderGuidedPhraseLocaleMigration,
  type GuidedPhraseLocalePatch,
} from './generate-guided-phrase-locale-migration.ts'
import { buildGuidedPhraseCatalogRows } from './generate-guided-phrase-catalog-migration.ts'
import { GUIDED_LESSONS } from '../src/data/guidedLessonsAuthoring.ts'
import { collectGuidedBaseFields } from '../src/lib/guidedBaseFields.ts'
import { GUIDED_BASE_LOCALES } from '../src/lib/guidedBaseEditions.ts'

const base: Omit<GuidedPhraseLocalePatch, 'baseLanguage' | 'translation'> = {
  pathId: 'path-one',
  lessonId: 'lesson-one',
  vibe: 'bright',
  expectedContentHash: 'a'.repeat(64),
}
const sql = renderGuidedPhraseLocaleMigration([
  { ...base, baseLanguage: 'English', translation: 'Meaning' },
  { ...base, baseLanguage: 'French', translation: 'Sens' },
])

assert.equal(GUIDED_PHRASE_BASE_LOCALES.length, 12)
assert.deepEqual([...GUIDED_PHRASE_BASE_LOCALES].sort(), Object.values(GUIDED_BASE_LOCALES).sort())
assert.match(sql, /jsonb_object_agg\(base_language, translation order by base_language\)/)
assert.match(sql, /c\.translations \|\| p\.translations/)
assert.match(sql, /c\.content_hash is distinct from p\.expected_content_hash/)
assert.match(sql, /raise exception 'Guided phrase locale overlay is stale or unregistered/)
assert.match(sql, /where c\.translations ->> p\.base_language is distinct from p\.translation/)

const escapedSql = renderGuidedPhraseLocaleMigration([
  { ...base, baseLanguage: 'Italian', translation: "Cos'è questo? \nPercorso \\ locale" },
])
assert.ok(escapedSql.includes("E'Cos''è questo? \\nPercorso \\\\ locale'"), 'SQL exporter must escape controls without embedding trailing whitespace')

const activeCoreKeys = new Set(
  collectGuidedBaseFields(GUIDED_LESSONS, []).map((field) => field.key),
)
const catalogRows = buildGuidedPhraseCatalogRows()
assert.equal(catalogRows.length, 2700)
assert.ok(catalogRows.every((row) => activeCoreKeys.has(guidedPhraseOverlayKey(row.lessonId, row.vibe))))

const unexpected = listUnexpectedOverlayFiles(fileURLToPath(new URL('./fixtures/guided-base-file-names', import.meta.url)))
assert.deepEqual(unexpected, [])

const patches = buildGuidedPhraseLocalePatches()
assert.equal(patches.length, 32400)
const byteCompare = (left: string, right: string) => Buffer.compare(Buffer.from(left), Buffer.from(right))
patches.sort((left, right) =>
  byteCompare(left.pathId, right.pathId)
  || byteCompare(left.lessonId, right.lessonId)
  || byteCompare(left.vibe, right.vibe)
  || byteCompare(left.baseLanguage, right.baseLanguage),
)
const valueDigest = createHash('sha256').update(patches.map((patch) => [
  patch.pathId, patch.lessonId, patch.vibe, patch.baseLanguage,
  patch.translation, patch.expectedContentHash,
].join(String.fromCharCode(31))).join(String.fromCharCode(30))).digest('hex')
const rollbackSql = readFileSync(resolve(fileURLToPath(new URL('..', import.meta.url)), 'supabase/tests/20260907131000_guided_phrase_catalog_locales_integration_rollback.sql'), 'utf8')
assert.match(rollbackSql, new RegExp(valueDigest), 'Rollback integration test must pin the exact 32,400-value digest')
assert.match(rollbackSql, /New-base word lost canonical identity or exact registered audio provenance/)
assert.match(rollbackSql, /No-audio new-base word claimed audio or lost canonical provenance/)
assert.match(rollbackSql, /rollback;\s*$/)

console.log(`Guided phrase locale migration contract passed (${patches.length} values, ${valueDigest}).`)
