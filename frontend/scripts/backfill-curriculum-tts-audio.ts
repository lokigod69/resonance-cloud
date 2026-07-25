import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import {
  buildStaticThematicPlaybackQuery,
  fetchStaticThematicPlayback,
  getStaticThematicAudio,
  getStaticThematicVoiceProfileKeys,
} from '../src/lib/staticThematicAudio.ts'

// Back-fill `words.tts_audio_url` for curriculum-imported rows from the
// static TTS library.
//
// Why this exists: `submit_curriculum_import` does not write tts_audio_url,
// and the frontend's post-import pass (attachStaticThematicAudioToImportedDeck)
// can only attach urls the import PAYLOAD already carried — which the level
// UI only resolves for some languages. The result is user word rows with null
// audio while `static_tts_playback` holds the real recording. Every surface
// then has to re-resolve it at play time, and any surface that forgets falls
// through to the browser's synthetic voice.
//
// Resolution mirrors the runtime exactly (lib/homeWordDetails.ts, the Surf
// deck adapter): metadata.curriculum's concept id → its category/level/target
// language → `static_tts_playback`, taking voices in
// getStaticThematicVoiceProfileKeys order so a back-filled row plays the same
// file the app would have chosen.
//
// Dry run by default. `--apply` writes. Writes are guarded by a
// `tts_audio_url is null` predicate on the UPDATE itself, so a row that gained
// real audio between the read and the write is never overwritten.
//
//   npx tsx scripts/backfill-curriculum-tts-audio.ts
//   npx tsx scripts/backfill-curriculum-tts-audio.ts --language ceb
//   npx tsx scripts/backfill-curriculum-tts-audio.ts --apply
//
// On this machine Supabase needs the system trust store:
//   NODE_OPTIONS=--use-system-ca npx tsx scripts/...

const PAGE_SIZE = 1000
const CONCEPT_CHUNK = 200
const UPDATE_CHUNK = 100

type WordRow = {
  id: string
  word: string | null
  tts_audio_url: string | null
  metadata: unknown
}

/** The (language, category, level) group a word's audio would live under. */
type Coordinate = {
  targetLanguageCode: string
  categorySlug: string
  level: number
  conceptId: string
}

type Candidate = {
  row: WordRow
  coordinate: Coordinate
}

function findString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0)
}

function readCurriculum(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const curriculum = (value as Record<string, unknown>).curriculum
  if (!curriculum || typeof curriculum !== 'object' || Array.isArray(curriculum)) return {}
  return curriculum as Record<string, unknown>
}

/** Same field precedence the runtime uses — source_* first (set by the
 * importer), then the plain names the curriculum data carries. */
export function coordinateFor(metadata: unknown): Coordinate | null {
  const curriculum = readCurriculum(metadata)
  const conceptId = findString(curriculum.source_concept_id, curriculum.concept_id, curriculum.entry_id)
  if (!conceptId) return null
  const categorySlug = findString(curriculum.source_category_slug, curriculum.category_slug)
    ?? (conceptId.includes('.') ? conceptId.slice(0, conceptId.indexOf('.')) : '')
  if (!categorySlug) return null
  const targetLanguageCode = findString(curriculum.source_target_language_code, curriculum.target_language_code)
  if (!targetLanguageCode) return null
  const level = [curriculum.source_level_number, curriculum.level]
    .find((value): value is number => typeof value === 'number' && Number.isFinite(value)) ?? 1
  return { targetLanguageCode, categorySlug, level, conceptId }
}

function groupKey(coordinate: Coordinate): string {
  return `${coordinate.targetLanguageCode}:${coordinate.categorySlug}:${coordinate.level}`
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** Every audio-less word row carrying curriculum metadata. Paged — this table
 * is the whole user corpus, not one deck. */
async function readAudiolessCurriculumWords(supabase: SupabaseClient): Promise<WordRow[]> {
  const rows: WordRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('words')
      .select('id, word, tts_audio_url, metadata')
      .is('tts_audio_url', null)
      .not('metadata->curriculum', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`words page ${from}: ${error.message}`)
    const page = (data ?? []) as WordRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}

/** Resolve each group's concepts against the playback library, in the app's
 * own voice-preference order. Returns url by word id. */
async function resolveUrls(
  supabase: SupabaseClient,
  candidates: Candidate[],
): Promise<{ urlByWordId: Map<string, string>; missingByGroup: Map<string, number> }> {
  const urlByWordId = new Map<string, string>()
  const missingByGroup = new Map<string, number>()
  const groups = new Map<string, Candidate[]>()
  for (const candidate of candidates) {
    const key = groupKey(candidate.coordinate)
    groups.set(key, [...(groups.get(key) ?? []), candidate])
  }

  for (const [key, members] of groups) {
    const { targetLanguageCode, categorySlug, level } = members[0].coordinate
    const voiceProfileKeys = getStaticThematicVoiceProfileKeys({ targetLanguageCode, categorySlug })
    const conceptIds = [...new Set(members.map((member) => member.coordinate.conceptId))]
    let resolved = 0

    for (const conceptChunk of chunk(conceptIds, CONCEPT_CHUNK)) {
      const lookup = await fetchStaticThematicPlayback(
        supabase,
        buildStaticThematicPlaybackQuery({
          targetLanguageCode,
          categorySlug,
          levelNumber: level,
          conceptIds: conceptChunk,
          voiceProfileKeys,
        }),
      )
      for (const member of members) {
        if (!conceptChunk.includes(member.coordinate.conceptId)) continue
        for (const voiceProfileKey of voiceProfileKeys ?? [undefined]) {
          const hit = getStaticThematicAudio(lookup, member.coordinate.conceptId, voiceProfileKey)
          if (hit?.public_url) {
            urlByWordId.set(member.row.id, hit.public_url)
            resolved += 1
            break
          }
        }
      }
    }
    if (resolved < members.length) missingByGroup.set(key, members.length - resolved)
  }

  return { urlByWordId, missingByGroup }
}

async function applyUpdates(
  supabase: SupabaseClient,
  urlByWordId: Map<string, string>,
): Promise<{ updated: number; failures: string[] }> {
  // One UPDATE per distinct url (rows sharing a concept share a file), each
  // still guarded by `tts_audio_url is null`.
  const idsByUrl = new Map<string, string[]>()
  urlByWordId.forEach((url, id) => idsByUrl.set(url, [...(idsByUrl.get(url) ?? []), id]))

  const generatedAt = new Date().toISOString()
  let updated = 0
  const failures: string[] = []

  for (const [url, ids] of idsByUrl) {
    for (const idChunk of chunk(ids, UPDATE_CHUNK)) {
      const { data, error } = await supabase
        .from('words')
        .update({ tts_audio_url: url, tts_status: 'ready', tts_generated_at: generatedAt })
        .in('id', idChunk)
        .is('tts_audio_url', null)
        .select('id')
      if (error) {
        failures.push(`${url}: ${error.message}`)
        continue
      }
      updated += (data ?? []).length
    }
  }

  return { updated, failures }
}

function loadEnv(file: string) {
  if (!fs.existsSync(file)) return
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const idx = line.indexOf('=')
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      apply: { type: 'boolean', default: false },
      language: { type: 'string' },
      report: { type: 'string' },
    },
  })

  loadEnv(path.resolve('.env.local'))
  loadEnv(path.resolve('.env'))
  loadEnv(path.resolve('..', '.env'))

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY')
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  console.log(`[backfill-tts] ${values.apply ? 'APPLY' : 'dry run'}${values.language ? ` · language=${values.language}` : ''}`)

  const rows = await readAudiolessCurriculumWords(supabase)
  console.log(`[backfill-tts] audio-less curriculum word rows: ${rows.length}`)

  const candidates: Candidate[] = []
  let noCoordinate = 0
  for (const row of rows) {
    const coordinate = coordinateFor(row.metadata)
    if (!coordinate) {
      noCoordinate += 1
      continue
    }
    if (values.language && coordinate.targetLanguageCode !== values.language) continue
    candidates.push({ row, coordinate })
  }
  console.log(`[backfill-tts] resolvable coordinates: ${candidates.length} (${noCoordinate} rows carry no concept id)`)

  const byLanguage = new Map<string, number>()
  for (const candidate of candidates) {
    const code = candidate.coordinate.targetLanguageCode
    byLanguage.set(code, (byLanguage.get(code) ?? 0) + 1)
  }
  console.log(`[backfill-tts] by target language: ${[...byLanguage].map(([code, count]) => `${code}=${count}`).join(' ') || '—'}`)

  const { urlByWordId, missingByGroup } = await resolveUrls(supabase, candidates)
  console.log(`[backfill-tts] matched in the static library: ${urlByWordId.size} of ${candidates.length}`)

  const unmatchedByLanguage = new Map<string, number>()
  for (const candidate of candidates) {
    if (urlByWordId.has(candidate.row.id)) continue
    const code = candidate.coordinate.targetLanguageCode
    unmatchedByLanguage.set(code, (unmatchedByLanguage.get(code) ?? 0) + 1)
  }
  if (unmatchedByLanguage.size > 0) {
    console.log(`[backfill-tts] no library recording (left alone): ${[...unmatchedByLanguage].map(([code, count]) => `${code}=${count}`).join(' ')}`)
    const worst = [...missingByGroup].sort((a, b) => b[1] - a[1]).slice(0, 8)
    for (const [key, count] of worst) console.log(`[backfill-tts]   ${key}: ${count} unmatched`)
  }

  // The exact set this run would touch, written BEFORE any update — every
  // listed row had a null url, so reverting is `set tts_audio_url = null` over
  // these ids and nothing else.
  if (values.report) {
    const report = [...urlByWordId].map(([id, url]) => {
      const candidate = candidates.find((item) => item.row.id === id)
      return { id, word: candidate?.row.word ?? null, coordinate: candidate?.coordinate ?? null, url }
    })
    fs.writeFileSync(values.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(`[backfill-tts] report → ${values.report} (${report.length} rows)`)
  }

  if (!values.apply) {
    const sample = [...urlByWordId].slice(0, 5)
    for (const [id, url] of sample) {
      const row = candidates.find((candidate) => candidate.row.id === id)
      console.log(`[backfill-tts]   would set ${row?.row.word ?? id} → ${url}`)
    }
    console.log('[backfill-tts] dry run — nothing written. Re-run with --apply.')
    return
  }

  const { updated, failures } = await applyUpdates(supabase, urlByWordId)
  console.log(`[backfill-tts] rows updated: ${updated}`)
  if (failures.length > 0) {
    console.log(`[backfill-tts] ${failures.length} update(s) failed:`)
    for (const failure of failures.slice(0, 10)) console.log(`[backfill-tts]   ${failure}`)
    process.exitCode = 1
  }

  const { count, error } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .is('tts_audio_url', null)
    .not('metadata->curriculum', 'is', null)
  if (error) throw new Error(`verification count: ${error.message}`)
  console.log(`[backfill-tts] audio-less curriculum rows remaining: ${count}`)
}

main().catch((error) => {
  console.error('[backfill-tts] fatal:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
