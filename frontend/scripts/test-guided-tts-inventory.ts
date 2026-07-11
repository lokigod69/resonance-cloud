/**
 * Static tests for guided-tts-inventory.ts.
 *
 * Run: npx tsx scripts/test-guided-tts-inventory.ts
 */

import { GUIDED_LESSONS } from '../src/data/guidedLessons.ts'
import {
  DEFAULT_MODEL_ID,
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_VOICE_SETTINGS,
  NORMALIZATION_VERSION,
  buildCacheKey,
  buildInventory,
  buildStoragePath,
  extractLessonSurfaces,
  filterLessons,
  normalizeSpokenText,
  resolveVoiceProfile,
  textHash,
  voiceSettingsHash,
  type VoiceProfile,
} from './guided-tts-inventory.ts'

let passes = 0
let failures = 0

function assert(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1
    console.log(`  ok  ${name}`)
    return
  }
  failures += 1
  console.error(`  FAIL ${name}`)
  if (detail !== undefined) console.error('       ', detail)
}

function assertEqual<T>(name: string, actual: T, expected: T) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  assert(name, ok, ok ? undefined : { actual, expected })
}

const SETTINGS_HASH = voiceSettingsHash(DEFAULT_VOICE_SETTINGS as unknown as Record<string, unknown>)

function brightWistfulSharpProfiles(): VoiceProfile[] {
  return [
    {
      voice_profile_key: 'english_a1_bright_v1',
      target_language_code: 'en-US',
      vibe: 'bright',
      provider_voice_id: 'voice-bright',
      provider_model_id: DEFAULT_MODEL_ID,
      output_format: DEFAULT_OUTPUT_FORMAT,
      voice_settings: { ...DEFAULT_VOICE_SETTINGS },
      voice_settings_hash: SETTINGS_HASH,
      active: true,
    },
    {
      voice_profile_key: 'english_a1_wistful_v1',
      target_language_code: 'en-US',
      vibe: 'wistful',
      provider_voice_id: 'voice-wistful',
      provider_model_id: DEFAULT_MODEL_ID,
      output_format: DEFAULT_OUTPUT_FORMAT,
      voice_settings: { ...DEFAULT_VOICE_SETTINGS },
      voice_settings_hash: SETTINGS_HASH,
      active: true,
    },
    {
      voice_profile_key: 'english_a1_sharp_v1',
      target_language_code: 'en-US',
      vibe: 'sharp',
      provider_voice_id: 'voice-sharp',
      provider_model_id: DEFAULT_MODEL_ID,
      output_format: DEFAULT_OUTPUT_FORMAT,
      voice_settings: { ...DEFAULT_VOICE_SETTINGS },
      voice_settings_hash: SETTINGS_HASH,
      active: true,
    },
  ]
}

console.log('\n[normalization]')
assertEqual(
  'em-dash and smart quotes collapse to ascii',
  normalizeSpokenText('Sorry to ask —  do you happen to speak “English”?  '),
  'Sorry to ask - do you happen to speak "English"?',
)
assert(
  'text hash is stable across smart-punct variants',
  textHash('Sorry to ask — do you happen to speak English?') ===
    textHash('Sorry to ask - do you happen to speak English?'),
)

console.log('\n[cache key shape]')
const baseCacheKeyArgs = {
  provider: 'elevenlabs',
  target_language_code: 'en-US',
  provider_voice_id: 'voice-bright',
  provider_model_id: DEFAULT_MODEL_ID,
  output_format: DEFAULT_OUTPUT_FORMAT,
  settings_hash: SETTINGS_HASH,
  normalization_version: NORMALIZATION_VERSION,
  text_hash: textHash('English'),
}
assert(
  'cache key changes when voice_profile_key changes',
  buildCacheKey({ ...baseCacheKeyArgs, voice_profile_key: 'english_a1_bright_v1' }) !==
    buildCacheKey({ ...baseCacheKeyArgs, voice_profile_key: 'english_a1_bright_v2' }),
)
assert(
  'cache key changes when voice_settings_hash changes',
  buildCacheKey({ ...baseCacheKeyArgs, voice_profile_key: 'english_a1_bright_v1', settings_hash: 'aaaa' }) !==
    buildCacheKey({ ...baseCacheKeyArgs, voice_profile_key: 'english_a1_bright_v1', settings_hash: 'bbbb' }),
)
{
  const th = textHash('English')
  assertEqual(
    'storage path uses short settings hash and text hash',
    buildStoragePath({
      target_language_code: 'en-US',
      voice_profile_key: 'english_a1_bright_v1',
      provider_model_id: DEFAULT_MODEL_ID,
      output_format: DEFAULT_OUTPUT_FORMAT,
      settings_hash: '0123456789abcdef'.repeat(4),
      text_hash: th,
    }),
    `elevenlabs/en-US/english_a1_bright_v1/eleven_flash_v2_5/mp3_44100_128/0123456789ab/${th}.mp3`,
  )
}

console.log('\n[voice profile resolver]')
{
  const profiles = brightWistfulSharpProfiles()
  const r = resolveVoiceProfile(profiles, {
    target_language_code: 'en-US',
    vibe: 'bright',
    path_id: 'english-a1-practical-1',
    lesson_id: 'english-a1-practical-001-first-contact',
    surface: 'corePhrase',
  })
  assert('resolver picks the matching vibe profile', r !== null && r.voice_profile_key === 'english_a1_bright_v1')
}
{
  const r = resolveVoiceProfile([], {
    target_language_code: 'en-US',
    vibe: 'bright',
    path_id: 'english-a1-practical-1',
    lesson_id: 'english-a1-practical-001-first-contact',
    surface: 'corePhrase',
  })
  assert('resolver returns null when no profile matches', r === null)
}

console.log('\n[lesson surface extraction]')
const canaryLesson = filterLessons(GUIDED_LESSONS, {
  path_id: 'english-a1-practical-1',
  lesson_number: 1,
})[0]
assert('canary lesson is present in GUIDED_LESSONS', Boolean(canaryLesson))
{
  const rows = extractLessonSurfaces({
    lesson: canaryLesson!,
    vibes: ['bright', 'wistful', 'sharp'],
    surfaces: new Set(['corePhrase', 'chunks', 'trophyWord']),
    target_language_code: 'en-US',
  })
  const perVibe = { bright: 0, wistful: 0, sharp: 0 } as Record<string, number>
  for (const row of rows) perVibe[row.vibe] += 1
  assertEqual('canary emits 5 rows per vibe', perVibe, { bright: 5, wistful: 5, sharp: 5 })
}
{
  const rowsWithSpeak = extractLessonSurfaces({
    lesson: canaryLesson!,
    vibes: ['bright', 'wistful', 'sharp'],
    surfaces: new Set(['corePhrase', 'chunks', 'trophyWord', 'speak']),
    target_language_code: 'en-US',
  })
  const speakRows = rowsWithSpeak.filter((r) => r.surface === 'speakTarget')
  assert('speakTarget rows dedupe against corePhrase when normalized equal', speakRows.length === 0)
}
{
  const rows = extractLessonSurfaces({
    lesson: canaryLesson!,
    vibes: ['wistful'],
    surfaces: new Set(['corePhrase']),
    target_language_code: 'en-US',
  })
  const core = rows.find((r) => r.surface === 'corePhrase')
  assert(
    'wistful core phrase passes through normalization unchanged with 30 chars',
    core !== undefined &&
      core.source_text === 'Do you speak a little English?' &&
      core.normalized_text === 'Do you speak a little English?' &&
      core.normalized_text.length === 30,
  )
}

console.log('\n[A1P1 canary inventory]')
{
  const inventory = buildInventory({
    lessons: [canaryLesson!],
    voice_profiles: brightWistfulSharpProfiles(),
    vibes: ['bright', 'wistful', 'sharp'],
    surfaces: new Set(['corePhrase', 'chunks', 'trophyWord']),
    target_language_code: 'en-US',
  })

  assert('canary rows count is 15', inventory.totals.rows === 15)
  assert('all 15 rows are missing on first run', inventory.totals.missing === 15)
  assert('no voice profile is unresolved', inventory.totals.missing_voice_profile === 0)
  assert('15 unique cache keys', inventory.totals.unique_cache_keys === 15)
  assert('12 unique normalized texts ignoring voice', inventory.totals.unique_normalized_texts === 12)
  assert('estimated 15 provider calls', inventory.totals.estimated_provider_calls === 15)
  assert('estimated 202 provider characters', inventory.totals.estimated_provider_characters === 202)

  const byKey = new Map(inventory.per_voice.map((entry) => [entry.voice_profile_key, entry]))
  assert('bright per-voice character count is 63', byKey.get('english_a1_bright_v1')?.character_count === 63)
  assert('wistful per-voice character count is 63', byKey.get('english_a1_wistful_v1')?.character_count === 63)
  assert('sharp per-voice character count is 76', byKey.get('english_a1_sharp_v1')?.character_count === 76)
  for (const [key, entry] of byKey) {
    assert(`${key} unique texts = 5`, entry.unique_texts === 5)
    assert(`${key} missing = 5`, entry.missing === 5)
    assert(`${key} ready = 0`, entry.ready === 0)
  }
}

{
  const inventory = buildInventory({
    lessons: [canaryLesson!],
    voice_profiles: [],
    vibes: ['bright', 'wistful', 'sharp'],
    surfaces: new Set(['corePhrase', 'chunks', 'trophyWord']),
    target_language_code: 'en-US',
  })
  assert('no profiles -> all rows missing_voice_profile', inventory.totals.missing_voice_profile === 15)
  assert('no profiles -> zero provider calls estimated', inventory.totals.estimated_provider_calls === 0)
  assert('no profiles -> zero provider characters estimated', inventory.totals.estimated_provider_characters === 0)
}

{
  const profiles = brightWistfulSharpProfiles().slice(0, 1) // bright only
  const inventory = buildInventory({
    lessons: [canaryLesson!],
    voice_profiles: profiles,
    vibes: ['bright', 'wistful', 'sharp'],
    surfaces: new Set(['corePhrase', 'chunks', 'trophyWord']),
    target_language_code: 'en-US',
  })
  assert('partial profiles: bright (5) resolves and wistful + sharp (10) do not', inventory.totals.missing === 5)
  assert('partial profiles: 10 rows are missing_voice_profile', inventory.totals.missing_voice_profile === 10)
}

{
  const profiles = brightWistfulSharpProfiles()
  const ck = buildCacheKey({
    provider: 'elevenlabs',
    target_language_code: 'en-US',
    voice_profile_key: 'english_a1_bright_v1',
    provider_voice_id: 'voice-bright',
    provider_model_id: DEFAULT_MODEL_ID,
    output_format: DEFAULT_OUTPUT_FORMAT,
    settings_hash: SETTINGS_HASH,
    normalization_version: NORMALIZATION_VERSION,
    text_hash: textHash('English'),
  })
  const inventory = buildInventory({
    lessons: [canaryLesson!],
    voice_profiles: profiles,
    existing_assets_by_cache_key: {
      [ck]: { id: 'asset-001', status: 'ready' },
    },
    vibes: ['bright', 'wistful', 'sharp'],
    surfaces: new Set(['corePhrase', 'chunks', 'trophyWord']),
    target_language_code: 'en-US',
  })
  assert('cache hit reduces estimated provider calls by 1', inventory.totals.estimated_provider_calls === 14)
  assert('cache hit reduces estimated characters by 7 ("English")', inventory.totals.estimated_provider_characters === 202 - 7)
  assert('cache hit reports asset_id', inventory.items.some((i) => i.status === 'ready' && i.asset_id === 'asset-001'))
}

console.log('')
if (failures > 0) {
  console.error(`FAILED  ${passes} passed, ${failures} failed`)
  process.exit(1)
}
console.log(`${passes} passed, 0 failed`)
