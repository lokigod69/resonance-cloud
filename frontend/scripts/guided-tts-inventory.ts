/**
 * Guided Today TTS inventory builder — frontend wrapper.
 *
 * Reads lesson data from `src/data/guidedLessons.ts`, optionally accepts a
 * `--voice-profiles <path-to-json>` file with active guided_voice_profiles
 * rows, and prints a JSON inventory of every (path, lesson, vibe, surface,
 * surface_key) row Guided Today would need to generate.
 *
 * Behavior:
 *   * No provider calls.
 *   * No storage writes.
 *   * No database writes.
 *   * `--dry-run` is the only mode in PR #1. The flag exists for CLI
 *     parity with the future `--commit` path but is a no-op today.
 *
 * Examples:
 *   npx tsx scripts/guided-tts-inventory.ts \
 *     --path english-a1-practical-1 \
 *     --lesson 1 \
 *     --vibes bright,wistful,sharp \
 *     --surfaces corePhrase,chunks,trophyWord \
 *     --dry-run
 *
 *   npx tsx scripts/guided-tts-inventory.ts \
 *     --lesson-id english-a1-practical-001-first-contact \
 *     --voice-profiles ./voice-profiles.canary.json
 */

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GUIDED_LESSONS,
  getGuidedPathMetadata,
  loadAllGuidedLessons,
  loadGuidedLessonsForPath,
  type GuidedLessonDefinition,
  type GuidedLessonVibeVariant,
} from '../src/data/guidedLessons.ts'
import { ACTIVE_GUIDED_VIBE_IDS, type ActiveGuidedVibeId } from '../src/data/guidedVibes.ts'

export const NORMALIZATION_VERSION = 'v1'
export const DEFAULT_PROVIDER = 'elevenlabs'
export const DEFAULT_MODEL_ID = 'eleven_flash_v2_5'
export const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128'
export const DEFAULT_VOICE_SETTINGS = {
  stability: 0.75,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
} as const

export const VALID_SURFACES = ['corePhrase', 'chunks', 'trophyWord', 'speak'] as const
export type RequestedSurface = (typeof VALID_SURFACES)[number]
export type EmittedSurface = 'corePhrase' | 'chunk' | 'trophyWord' | 'speakTarget'

export type VoiceProfile = {
  voice_profile_key: string
  provider?: string
  target_language_code: string
  vibe: ActiveGuidedVibeId | null
  scope_path_id?: string | null
  scope_lesson_id?: string | null
  scope_surface?: string | null
  provider_voice_id: string
  provider_model_id?: string
  output_format?: string
  voice_settings?: Record<string, unknown>
  voice_settings_hash: string
  assignment_version?: number
  active?: boolean
  priority?: number
}

export type SurfaceRow = {
  path_id: string
  lesson_id: string
  lesson_number: number
  vibe: ActiveGuidedVibeId
  surface: EmittedSurface
  surface_key: string
  source_text: string
  normalized_text: string
  text_hash: string
  target_language_code: string
}

export type InventoryItem = SurfaceRow & {
  status: 'ready' | 'missing' | 'missing_voice_profile'
  voice_profile_key: string | null
  provider_voice_id: string | null
  provider_model_id: string | null
  output_format: string | null
  voice_settings_hash: string | null
  cache_key: string | null
  storage_path: string | null
  character_count: number
  asset_id: string | null
}

export type PerVoiceSummary = {
  voice_profile_key: string
  provider_voice_id: string | null
  provider_model_id: string | null
  output_format: string | null
  character_count: number
  unique_texts: number
  ready: number
  missing: number
}

export type Inventory = {
  normalization_version: string
  totals: {
    rows: number
    ready: number
    missing: number
    missing_voice_profile: number
    unique_normalized_texts: number
    unique_cache_keys: number
    duplicates_skipped: number
    estimated_provider_calls: number
    estimated_provider_characters: number
    total_character_count_all_voices: number
  }
  per_voice: PerVoiceSummary[]
  voices_unresolved: Array<{ target_language_code: string; vibe: string; surface: string }>
  items: InventoryItem[]
}

// ---------------------------------------------------------------------------
// Normalization (parity with src/services/guided_tts/inventory.py)
// ---------------------------------------------------------------------------

const SMART_PUNCT: Record<string, string> = {
  '‘': "'", '’': "'", '‚': "'", '‛': "'", '′': "'",
  '“': '"', '”': '"', '„': '"', '‟': '"', '″': '"',
  '‐': '-', '‑': '-', '‒': '-', '–': '-', '—': '-',
  '―': '-', '−': '-',
  ' ': ' ', ' ': ' ',
}

export function normalizeSpokenText(input: string): string {
  if (!input) return ''
  let out = ''
  for (const ch of input) {
    out += SMART_PUNCT[ch] ?? ch
  }
  return out.replace(/\s+/g, ' ').trim()
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function textHash(input: string): string {
  return sha256Hex(normalizeSpokenText(input))
}

function canonicalJson(obj: Record<string, unknown>): string {
  const sortedKeys = Object.keys(obj).sort()
  const parts = sortedKeys.map((key) => {
    const value = obj[key]
    return `${JSON.stringify(key)}:${JSON.stringify(value)}`
  })
  return `{${parts.join(',')}}`
}

export function voiceSettingsHash(settings: Record<string, unknown>): string {
  return sha256Hex(canonicalJson(settings))
}

export function buildCacheKey(args: {
  provider: string
  target_language_code: string
  voice_profile_key: string
  provider_voice_id: string
  provider_model_id: string
  output_format: string
  settings_hash: string
  normalization_version: string
  text_hash: string
}): string {
  const payload = [
    args.provider,
    args.target_language_code,
    args.voice_profile_key,
    args.provider_voice_id,
    args.provider_model_id,
    args.output_format,
    args.settings_hash,
    args.normalization_version,
    args.text_hash,
  ].join('|')
  return sha256Hex(payload)
}

function safeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]+/g, '_')
}

export function buildStoragePath(args: {
  target_language_code: string
  voice_profile_key: string
  provider_model_id: string
  output_format: string
  settings_hash: string
  text_hash: string
}): string {
  return `elevenlabs/${safeSegment(args.target_language_code)}/${safeSegment(args.voice_profile_key)}/${safeSegment(args.provider_model_id)}/${safeSegment(args.output_format)}/${args.settings_hash.slice(0, 12)}/${args.text_hash}.mp3`
}

// ---------------------------------------------------------------------------
// Voice profile resolver (parity with Python)
// ---------------------------------------------------------------------------

function specificity(profile: VoiceProfile): number {
  let score = 0
  if (profile.scope_surface) score += 1
  if (profile.scope_lesson_id) score += 2
  if (profile.scope_path_id) score += 4
  if (profile.vibe !== null && profile.vibe !== undefined) score += 8
  return score
}

function profileMatches(
  profile: VoiceProfile,
  args: { target_language_code: string; vibe: string; path_id: string; lesson_id: string; surface: string },
): boolean {
  if (profile.active === false) return false
  if (profile.target_language_code !== args.target_language_code) return false
  if (profile.vibe !== null && profile.vibe !== undefined && profile.vibe !== args.vibe) return false
  if (profile.scope_path_id && profile.scope_path_id !== args.path_id) return false
  if (profile.scope_lesson_id && profile.scope_lesson_id !== args.lesson_id) return false
  if (profile.scope_surface && profile.scope_surface !== args.surface) return false
  return true
}

export function resolveVoiceProfile(
  profiles: VoiceProfile[],
  args: { target_language_code: string; vibe: string; path_id: string; lesson_id: string; surface: string },
): VoiceProfile | null {
  const candidates = profiles.filter((p) => profileMatches(p, args))
  if (candidates.length === 0) return null
  candidates.sort((a, b) => {
    const da = specificity(b) - specificity(a)
    if (da !== 0) return da
    return (a.priority ?? 100) - (b.priority ?? 100)
  })
  return candidates[0]
}

// ---------------------------------------------------------------------------
// Lesson surface extraction
// ---------------------------------------------------------------------------

export function extractLessonSurfaces(args: {
  lesson: GuidedLessonDefinition
  vibes: ActiveGuidedVibeId[]
  surfaces: Set<RequestedSurface>
  target_language_code: string
}): SurfaceRow[] {
  const { lesson, vibes, surfaces, target_language_code } = args
  const rows: SurfaceRow[] = []

  const makeRow = (vibe: ActiveGuidedVibeId, surface: EmittedSurface, surface_key: string, text: string) => {
    const normalized = normalizeSpokenText(text)
    rows.push({
      path_id: lesson.pathId,
      lesson_id: lesson.id,
      lesson_number: lesson.lessonNumber,
      vibe,
      surface,
      surface_key,
      source_text: text,
      normalized_text: normalized,
      text_hash: sha256Hex(normalized),
      target_language_code,
    })
  }

  for (const vibe of vibes) {
    const variant = lesson.vibeVariants[vibe] as GuidedLessonVibeVariant | undefined
    if (!variant) continue

    const corePhrase = variant.corePhrase?.targetText ?? ''
    const normalizedCore = normalizeSpokenText(corePhrase)

    if (surfaces.has('corePhrase') && corePhrase) {
      makeRow(vibe, 'corePhrase', '__self', corePhrase)
    }

    if (surfaces.has('chunks')) {
      for (const chunk of variant.chunks ?? []) {
        if (!chunk?.id || !chunk?.targetText) continue
        makeRow(vibe, 'chunk', chunk.id, chunk.targetText)
      }
    }

    if (surfaces.has('trophyWord')) {
      const trophy = variant.trophyWord?.word ?? ''
      if (trophy) {
        makeRow(vibe, 'trophyWord', '__self', trophy)
      }
    }

    if (surfaces.has('speak')) {
      const speakPhrase = variant.speakTarget?.targetPhrase ?? ''
      if (speakPhrase) {
        const normalizedSpeak = normalizeSpokenText(speakPhrase)
        if (normalizedSpeak && normalizedSpeak !== normalizedCore) {
          makeRow(vibe, 'speakTarget', '__self', speakPhrase)
        }
      }
    }
  }

  return rows
}

// ---------------------------------------------------------------------------
// Inventory builder
// ---------------------------------------------------------------------------

export function buildInventory(args: {
  lessons: GuidedLessonDefinition[]
  voice_profiles: VoiceProfile[]
  existing_assets_by_cache_key?: Record<string, { id?: string; status?: string }>
  vibes: ActiveGuidedVibeId[]
  surfaces: Set<RequestedSurface>
  target_language_code: string
}): Inventory {
  const existing = args.existing_assets_by_cache_key ?? {}
  const items: InventoryItem[] = []
  const unresolved: Set<string> = new Set()

  for (const lesson of args.lessons) {
    const rows = extractLessonSurfaces({
      lesson,
      vibes: args.vibes,
      surfaces: args.surfaces,
      target_language_code: args.target_language_code,
    })

    for (const row of rows) {
      const profile = resolveVoiceProfile(args.voice_profiles, {
        target_language_code: row.target_language_code,
        vibe: row.vibe,
        path_id: row.path_id,
        lesson_id: row.lesson_id,
        surface: row.surface,
      })

      if (!profile) {
        unresolved.add(`${row.target_language_code}|${row.vibe}|${row.surface}`)
        items.push({
          ...row,
          status: 'missing_voice_profile',
          voice_profile_key: null,
          provider_voice_id: null,
          provider_model_id: null,
          output_format: null,
          voice_settings_hash: null,
          cache_key: null,
          storage_path: null,
          character_count: row.normalized_text.length,
          asset_id: null,
        })
        continue
      }

      const ck = buildCacheKey({
        provider: profile.provider ?? DEFAULT_PROVIDER,
        target_language_code: row.target_language_code,
        voice_profile_key: profile.voice_profile_key,
        provider_voice_id: profile.provider_voice_id,
        provider_model_id: profile.provider_model_id ?? DEFAULT_MODEL_ID,
        output_format: profile.output_format ?? DEFAULT_OUTPUT_FORMAT,
        settings_hash: profile.voice_settings_hash,
        normalization_version: NORMALIZATION_VERSION,
        text_hash: row.text_hash,
      })
      const sp = buildStoragePath({
        target_language_code: row.target_language_code,
        voice_profile_key: profile.voice_profile_key,
        provider_model_id: profile.provider_model_id ?? DEFAULT_MODEL_ID,
        output_format: profile.output_format ?? DEFAULT_OUTPUT_FORMAT,
        settings_hash: profile.voice_settings_hash,
        text_hash: row.text_hash,
      })
      const cached = existing[ck]
      const status: InventoryItem['status'] =
        cached && cached.status === 'ready' ? 'ready' : 'missing'

      items.push({
        ...row,
        status,
        voice_profile_key: profile.voice_profile_key,
        provider_voice_id: profile.provider_voice_id,
        provider_model_id: profile.provider_model_id ?? DEFAULT_MODEL_ID,
        output_format: profile.output_format ?? DEFAULT_OUTPUT_FORMAT,
        voice_settings_hash: profile.voice_settings_hash,
        cache_key: ck,
        storage_path: sp,
        character_count: row.normalized_text.length,
        asset_id: status === 'ready' ? cached?.id ?? null : null,
      })
    }
  }

  return summarize(items, unresolved)
}

function summarize(items: InventoryItem[], unresolved: Set<string>): Inventory {
  const readyCount = items.filter((i) => i.status === 'ready').length
  const missingCount = items.filter((i) => i.status === 'missing').length
  const unresolvedCount = items.filter((i) => i.status === 'missing_voice_profile').length

  const seenCacheKeys = new Set<string>()
  let duplicatesSkipped = 0
  const perVoice = new Map<string, PerVoiceSummary>()

  for (const item of items) {
    if (item.status === 'missing_voice_profile') continue
    if (!item.cache_key || !item.voice_profile_key) continue
    if (seenCacheKeys.has(item.cache_key)) {
      duplicatesSkipped += 1
      continue
    }
    seenCacheKeys.add(item.cache_key)
    let entry = perVoice.get(item.voice_profile_key)
    if (!entry) {
      entry = {
        voice_profile_key: item.voice_profile_key,
        provider_voice_id: item.provider_voice_id,
        provider_model_id: item.provider_model_id,
        output_format: item.output_format,
        character_count: 0,
        unique_texts: 0,
        ready: 0,
        missing: 0,
      }
      perVoice.set(item.voice_profile_key, entry)
    }
    entry.character_count += item.character_count
    entry.unique_texts += 1
    if (item.status === 'ready') entry.ready += 1
    else entry.missing += 1
  }

  const uniqueTextsIgnoringVoice = new Set(items.map((i) => i.text_hash)).size
  const estimatedCalls = [...perVoice.values()].reduce((acc, e) => acc + e.missing, 0)
  const totalChars = [...perVoice.values()].reduce((acc, e) => acc + e.character_count, 0)
  const estimatedChars = items
    .filter((i) => i.status === 'missing')
    .reduce((acc, i) => acc + i.character_count, 0)

  return {
    normalization_version: NORMALIZATION_VERSION,
    totals: {
      rows: items.length,
      ready: readyCount,
      missing: missingCount,
      missing_voice_profile: unresolvedCount,
      unique_normalized_texts: uniqueTextsIgnoringVoice,
      unique_cache_keys: seenCacheKeys.size,
      duplicates_skipped: duplicatesSkipped,
      estimated_provider_calls: estimatedCalls,
      estimated_provider_characters: estimatedChars,
      total_character_count_all_voices: totalChars,
    },
    per_voice: [...perVoice.values()].sort((a, b) => a.voice_profile_key.localeCompare(b.voice_profile_key)),
    voices_unresolved: [...unresolved].sort().map((entry) => {
      const [target_language_code, vibe, surface] = entry.split('|')
      return { target_language_code, vibe, surface }
    }),
    items,
  }
}

export function filterLessons(
  lessons: GuidedLessonDefinition[],
  args: { path_id?: string; lesson_number?: number; lesson_id?: string },
): GuidedLessonDefinition[] {
  return lessons.filter((lesson) => {
    if (args.path_id && lesson.pathId !== args.path_id) return false
    if (args.lesson_number !== undefined && lesson.lessonNumber !== args.lesson_number) return false
    if (args.lesson_id && lesson.id !== args.lesson_id) return false
    return true
  })
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

type ParsedArgs = {
  pathId?: string
  lessonId?: string
  lessonNumber?: number
  vibes: ActiveGuidedVibeId[]
  surfaces: Set<RequestedSurface>
  voiceProfilesPath?: string
  pretty: boolean
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {
    vibes: [...ACTIVE_GUIDED_VIBE_IDS],
    surfaces: new Set<RequestedSurface>(['corePhrase', 'chunks', 'trophyWord']),
    pretty: true,
  }

  const consumeValue = (flag: string, current: string, next?: string): string => {
    if (current.includes('=')) {
      return current.split('=').slice(1).join('=')
    }
    if (next === undefined) {
      throw new Error(`${flag} requires a value`)
    }
    return next
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      // PR #1 has no other mode; the flag is accepted for CLI parity.
      continue
    }
    if (arg === '--no-pretty') {
      out.pretty = false
      continue
    }
    if (arg.startsWith('--path')) {
      const value = consumeValue('--path', arg, argv[i + 1])
      if (!arg.includes('=')) i += 1
      out.pathId = value
      continue
    }
    if (arg.startsWith('--lesson-id')) {
      const value = consumeValue('--lesson-id', arg, argv[i + 1])
      if (!arg.includes('=')) i += 1
      out.lessonId = value
      continue
    }
    if (arg.startsWith('--lesson')) {
      const value = consumeValue('--lesson', arg, argv[i + 1])
      if (!arg.includes('=')) i += 1
      const num = Number.parseInt(value, 10)
      if (Number.isNaN(num)) {
        throw new Error(`--lesson expected an integer; got ${value}`)
      }
      out.lessonNumber = num
      continue
    }
    if (arg.startsWith('--vibes')) {
      const value = consumeValue('--vibes', arg, argv[i + 1])
      if (!arg.includes('=')) i += 1
      const vibes = value.split(',').map((v) => v.trim()).filter(Boolean)
      for (const v of vibes) {
        if (!ACTIVE_GUIDED_VIBE_IDS.includes(v as ActiveGuidedVibeId)) {
          throw new Error(`--vibes contains unknown vibe ${v}`)
        }
      }
      out.vibes = vibes as ActiveGuidedVibeId[]
      continue
    }
    if (arg.startsWith('--surfaces')) {
      const value = consumeValue('--surfaces', arg, argv[i + 1])
      if (!arg.includes('=')) i += 1
      const surfaces = value.split(',').map((s) => s.trim()).filter(Boolean) as RequestedSurface[]
      for (const s of surfaces) {
        if (!VALID_SURFACES.includes(s)) {
          throw new Error(`--surfaces contains unknown surface ${s}`)
        }
      }
      out.surfaces = new Set(surfaces)
      continue
    }
    if (arg.startsWith('--voice-profiles')) {
      const value = consumeValue('--voice-profiles', arg, argv[i + 1])
      if (!arg.includes('=')) i += 1
      out.voiceProfilesPath = value
      continue
    }
    throw new Error(`Unknown CLI argument: ${arg}`)
  }

  return out
}

function loadVoiceProfiles(filePath: string): VoiceProfile[] {
  const raw = readFileSync(resolvePath(filePath), 'utf-8')
  const parsed = JSON.parse(raw) as VoiceProfile[]
  if (!Array.isArray(parsed)) {
    throw new Error(`--voice-profiles file must contain a JSON array, got ${typeof parsed}`)
  }
  return parsed
}

async function runCli(argv: string[]): Promise<number> {
  let parsed: ParsedArgs
  try {
    parsed = parseArgs(argv)
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`)
    return 2
  }

  if (parsed.pathId) {
    if (getGuidedPathMetadata(parsed.pathId)) await loadGuidedLessonsForPath(parsed.pathId)
  } else {
    await loadAllGuidedLessons()
  }

  const filteredLessons = filterLessons(GUIDED_LESSONS, {
    path_id: parsed.pathId,
    lesson_number: parsed.lessonNumber,
    lesson_id: parsed.lessonId,
  })

  if (filteredLessons.length === 0) {
    process.stderr.write('No lessons matched the requested scope.\n')
    return 1
  }

  const voiceProfiles: VoiceProfile[] = parsed.voiceProfilesPath
    ? loadVoiceProfiles(parsed.voiceProfilesPath)
    : []

  const inventory = buildInventory({
    lessons: filteredLessons,
    voice_profiles: voiceProfiles,
    vibes: parsed.vibes,
    surfaces: parsed.surfaces,
    target_language_code: 'en-US',
  })

  const output = parsed.pretty
    ? JSON.stringify(inventory, null, 2)
    : JSON.stringify(inventory)
  process.stdout.write(`${output}\n`)

  if (inventory.totals.missing_voice_profile > 0) {
    process.stderr.write(
      `WARNING: ${inventory.totals.missing_voice_profile} row(s) have no voice profile. ` +
        `Seed guided_voice_profiles before running --commit (PR #2).\n`,
    )
  }
  return 0
}

const isDirectInvocation = (() => {
  const argv1 = process.argv[1] ?? ''
  return resolvePath(argv1).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()
})()

if (isDirectInvocation) {
  const code = await runCli(process.argv.slice(2))
  if (code !== 0) process.exit(code)
}
