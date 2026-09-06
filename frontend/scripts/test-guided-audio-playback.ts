/**
 * Static tests for Guided Today stored audio playback.
 *
 * Run: npx tsx scripts/test-guided-audio-playback.ts
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  clearGuidedAudioCache,
  playGuidedAudio,
  resolveGuidedAudio,
  stopGuidedAudio,
  type GuidedAudioLookupArgs,
  type GuidedAudioPlaybackRow,
} from '../src/lib/guidedAudio.ts'

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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve })
  return { promise, resolve }
}

function assertEqual<T>(name: string, actual: T, expected: T) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  assert(name, ok, ok ? undefined : { actual, expected })
}

function createPlaybackClient(rows: GuidedAudioPlaybackRow[]) {
  const calls: Array<{ table: string; filters: Record<string, string> }> = []

  return {
    calls,
    from(table: string) {
      const filters: Record<string, string> = {}
      const builder = {
        select() {
          return builder
        },
        eq(column: string, value: string) {
          filters[column] = value
          return builder
        },
        async maybeSingle() {
          calls.push({ table, filters: { ...filters } })
          const row = rows.find((candidate) => (
            candidate.path_id === filters.path_id
            && candidate.lesson_id === filters.lesson_id
            && candidate.vibe === filters.vibe
            && candidate.surface === filters.surface
            && candidate.surface_key === filters.surface_key
          ))

          return { data: row ?? null, error: null }
        },
      }
      return builder
    },
  }
}

function createLookup(overrides: Partial<GuidedAudioLookupArgs> = {}): GuidedAudioLookupArgs {
  return {
    pathId: 'english-a1-practical-1',
    lessonId: 'english-a1-practical-001-first-contact',
    vibe: 'bright',
    surface: 'corePhrase',
    surfaceKey: '__self',
    ...overrides,
  }
}

console.log('\n[resolver]')
{
  clearGuidedAudioCache()
  const client = createPlaybackClient([
    {
      path_id: 'english-a1-practical-1',
      lesson_id: 'english-a1-practical-001-first-contact',
      vibe: 'bright',
      surface: 'corePhrase',
      surface_key: '__self',
      public_url: 'https://example.test/core.mp3',
      duration_ms: 1320,
    },
  ])

  const first = await resolveGuidedAudio(createLookup(), { client })
  const second = await resolveGuidedAudio(createLookup(), { client })
  assertEqual('resolver returns ready URL when Supabase row exists', first, {
    kind: 'ready',
    url: 'https://example.test/core.mp3',
    durationMs: 1320,
  })
  assertEqual('resolver caches ready URL for the page session', second, first)
  assert('ready cache avoids a second Supabase read', client.calls.length === 1, client.calls)
}

{
  clearGuidedAudioCache()
  const client = createPlaybackClient([])
  const first = await resolveGuidedAudio(createLookup({ surface: 'chunk', surfaceKey: 'english' }), { client })
  const second = await resolveGuidedAudio(createLookup({ surface: 'chunk', surfaceKey: 'english' }), { client })
  assertEqual('resolver returns missing when row is absent', first, { kind: 'missing' })
  assertEqual('resolver caches missing result for the page session', second, first)
  assert('missing cache avoids a second Supabase read', client.calls.length === 1, client.calls)
}

{
  clearGuidedAudioCache()
  let reads = 0
  const client = {
    from() {
      const builder = {
        select() { return builder },
        eq() { return builder },
        abortSignal() { return builder },
        async maybeSingle() {
          reads += 1
          return reads === 1
            ? { data: null, error: { message: 'temporary transport failure' } }
            : {
                data: {
                  path_id: 'english-a1-practical-1',
                  lesson_id: 'english-a1-practical-001-first-contact',
                  vibe: 'bright',
                  surface: 'corePhrase',
                  surface_key: '__self',
                  public_url: 'https://example.test/recovered.mp3',
                  duration_ms: null,
                },
                error: null,
              }
        },
      }
      return builder
    },
  }
  assertEqual('transient resolver failure falls back for that attempt', await resolveGuidedAudio(createLookup(), { client }), { kind: 'missing' })
  assertEqual('transient resolver failure is not cached', await resolveGuidedAudio(createLookup(), { client }), {
    kind: 'ready',
    url: 'https://example.test/recovered.mp3',
    durationMs: undefined,
  })
  assert('resolver retries after transient failure', reads === 2, reads)
}

console.log('\n[playback fallback]')
{
  clearGuidedAudioCache()
  const client = createPlaybackClient([])
  const spoken: Array<{ text: string; lang: string | undefined }> = []
  const result = await playGuidedAudio({
    ...createLookup(),
    text: 'Hi there, do you speak English?',
    lang: 'en-US',
    client,
    speak: (text, lang) => spoken.push({ text, lang }),
    createAudio: () => {
      throw new Error('Audio should not be created on resolver miss')
    },
  })
  assertEqual('playback helper falls back to speech on miss', result, { kind: 'browser-fallback' })
  assertEqual('fallback speaks the original text and locale', spoken, [
    { text: 'Hi there, do you speak English?', lang: 'en-US' },
  ])
}

{
  clearGuidedAudioCache()
  const client = createPlaybackClient([
    {
      path_id: 'english-a1-practical-1',
      lesson_id: 'english-a1-practical-001-first-contact',
      vibe: 'bright',
      surface: 'corePhrase',
      surface_key: '__self',
      public_url: 'https://example.test/broken.mp3',
      duration_ms: null,
    },
  ])
  const spoken: string[] = []
  const result = await playGuidedAudio({
    ...createLookup(),
    text: 'Hi there, do you speak English?',
    client,
    speak: (text) => spoken.push(text),
    createAudio: (url) => createFailingAudio(url),
  })
  assertEqual('playback helper falls back to speech on audio error', result, { kind: 'browser-fallback' })
  assertEqual('audio error fallback speaks once', spoken, ['Hi there, do you speak English?'])
}


console.log('\n[playback lifecycle]')
{
  clearGuidedAudioCache()
  const pending = deferred<{ data: GuidedAudioPlaybackRow | null; error: null }>()
  const slowClient = {
    from() {
      const builder = {
        select() { return builder },
        eq() { return builder },
        abortSignal() { return builder },
        maybeSingle() { return pending.promise },
      }
      return builder
    },
  }
  const spoken: string[] = []
  const first = playGuidedAudio({
    ...createLookup(),
    text: 'first',
    client: slowClient,
    speak: (text) => spoken.push(text),
  })
  const second = await playGuidedAudio({
    ...createLookup({ surfaceKey: 'newer' }),
    text: 'second',
    client: createPlaybackClient([]),
    speak: (text) => spoken.push(text),
  })
  assertEqual('newer playback starts while an older lookup is pending', second, { kind: 'browser-fallback' })
  assertEqual('superseded lookup is cancelled', await first, { kind: 'cancelled' })
  assertEqual('superseded lookup never speaks stale text', spoken, ['second'])
}

{
  clearGuidedAudioCache()
  let speechCancels = 0
  await playGuidedAudio({
    ...createLookup(),
    text: 'browser fallback',
    client: createPlaybackClient([]),
    speak: () => undefined,
    cancelSpeech: () => { speechCancels += 1 },
  })
  stopGuidedAudio()
  assert('stopGuidedAudio cancels active browser speech', speechCancels === 1, speechCancels)
}

console.log('\n[frontend safety]')
{
  const sourcePath = fileURLToPath(new URL('../src/lib/guidedAudio.ts', import.meta.url))
  const source = readFileSync(sourcePath, 'utf8').toLowerCase()
  for (const forbidden of [
    'elevenlabs',
    'provider_voice_id',
    'guided_tts_assets',
    'guided_tts_generation_runs',
    'service_role',
    'api_key',
  ]) {
    assert(`guidedAudio.ts does not contain ${forbidden}`, !source.includes(forbidden))
  }
}

console.log('\n[A1P1 surface keys]')
{
  const lessonSource = readFileSync(
    fileURLToPath(new URL('../src/data/guidedLessonsAuthoring.ts', import.meta.url)),
    'utf8',
  )
  assert('A1P1 lesson 1 exists', lessonSource.includes('id: "english-a1-practical-001-first-contact"'))
  const expectedChunkKeys = {
    bright: ['hi-there', 'do-you-speak', 'english'],
    wistful: ['do-you-speak', 'a-little', 'english'],
    sharp: ['quick-question', 'do-you-speak', 'english'],
  }

  for (const [vibe, chunkKeys] of Object.entries(expectedChunkKeys)) {
    const variantSource = extractVariantSource(lessonSource, `${vibe}Lesson001`)
    assert(`${vibe} lesson 1 variant exists`, variantSource.length > 0)
    assert(`${vibe} corePhrase uses __self surface key`, variantSource.includes('corePhrase:'))
    assertEqual(
      `${vibe} chunks use phrase chunk ids as surface keys`,
      extractChunkIds(variantSource),
      chunkKeys,
    )
    assert(`${vibe} trophyWord uses __self surface key`, variantSource.includes('trophyWord:'))
  }
}

console.log('')
if (failures > 0) {
  console.error(`FAILED  ${passes} passed, ${failures} failed`)
  process.exit(1)
}
console.log(`${passes} passed, 0 failed`)

function createFailingAudio(src: string) {
  const listeners = new Map<string, Array<() => void>>()
  return {
    src,
    currentTime: 0,
    pause() {},
    addEventListener(type: string, listener: () => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener])
    },
    removeEventListener(type: string, listener: () => void) {
      listeners.set(type, (listeners.get(type) ?? []).filter((candidate) => candidate !== listener))
    },
    async play() {
      for (const listener of listeners.get('error') ?? []) listener()
      throw new Error('network failed')
    },
  } as unknown as HTMLAudioElement
}

function extractVariantSource(source: string, name: string) {
  const start = source.indexOf(`const ${name}:`)
  if (start < 0) return ''
  const nextVariant = source.indexOf('\nconst ', start + 1)
  return source.slice(start, nextVariant < 0 ? undefined : nextVariant)
}

function extractChunkIds(variantSource: string) {
  const chunksStart = variantSource.indexOf('chunks: [')
  const lessonItemsStart = variantSource.indexOf('lessonItems:', chunksStart)
  const chunksSource = variantSource.slice(chunksStart, lessonItemsStart)
  return Array.from(chunksSource.matchAll(/\{\s*id:\s*["']([^"']+)["']/g)).map((match) => match[1])
}
