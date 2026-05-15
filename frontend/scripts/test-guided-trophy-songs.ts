/**
 * Static validation for Guided Trophy Song catalog rows.
 *
 * Run: npx tsx scripts/test-guided-trophy-songs.ts
 */

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  GUIDED_TROPHY_SONGS,
  deriveTrophySongClozePositions,
  guidedTrophySongCandidateStorageKey,
  readGuidedTrophySongCandidate,
  resolveGuidedTrophySongCandidate,
  writeGuidedTrophySongCandidate,
} from '../src/data/guidedTrophySongs.ts'

let failures = 0
let passes = 0

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

console.log('\n[guided trophy song catalog]')
assert('catalog has exactly twelve rows', GUIDED_TROPHY_SONGS.length === 12, GUIDED_TROPHY_SONGS.length)
assert(
  'catalog ids are unique',
  new Set(GUIDED_TROPHY_SONGS.map((row) => row.id)).size === GUIDED_TROPHY_SONGS.length,
  GUIDED_TROPHY_SONGS.map((row) => row.id),
)
assert(
  'A1P1 still has six rows',
  GUIDED_TROPHY_SONGS.filter((row) => row.pathId === 'english-a1-practical-1').length === 6,
  GUIDED_TROPHY_SONGS.map((row) => row.id),
)
assert(
  'A1P2 has six rows',
  GUIDED_TROPHY_SONGS.filter((row) => row.pathId === 'english-a1-practical-2').length === 6,
  GUIDED_TROPHY_SONGS.map((row) => row.id),
)
assert(
  'A1P3-A1P5 trophy songs are not generated in this pass',
  GUIDED_TROPHY_SONGS.every((row) => ['english-a1-practical-1', 'english-a1-practical-2'].includes(row.pathId)),
  GUIDED_TROPHY_SONGS.map((row) => row.pathId),
)

const expectedTrophyWords = new Map<string, string[]>([
  ['english-a1-practical-1-segment-1-bright-trophy-song', ['delighted', 'marvelous', 'glad', 'eager', 'splendid']],
  ['english-a1-practical-1-segment-2-bright-trophy-song', ['ready', 'lovely', 'charming', 'wonderful', 'brilliant']],
  ['english-a1-practical-1-segment-1-wistful-trophy-song', ['gently', 'slowly', 'lost', 'quiet', 'perhaps']],
  ['english-a1-practical-1-segment-2-wistful-trophy-song', ['almost', 'soft', 'again', 'a little', 'lingering']],
  ['english-a1-practical-1-segment-1-sharp-trophy-song', ['clear', 'quick', 'straight', 'ready', 'exactly']],
  ['english-a1-practical-1-segment-2-sharp-trophy-song', ['certain', 'focused', 'decided', 'settled', 'done']],
  ['english-a1-practical-2-segment-1-bright-trophy-song', ['happy', 'warm', 'right', 'fine', 'fresh']],
  ['english-a1-practical-2-segment-2-bright-trophy-song', ['easy', 'neat', 'kind', 'sure', 'cheerful']],
  ['english-a1-practical-2-segment-1-wistful-trophy-song', ['maybe', 'kindly', 'somewhere', 'either', 'anywhere']],
  ['english-a1-practical-2-segment-2-wistful-trophy-song', ['carefully', 'near', 'calm', 'simple', 'patient']],
  ['english-a1-practical-2-segment-1-sharp-trophy-song', ['short', 'spelling', 'sign', 'option', 'stock']],
  ['english-a1-practical-2-segment-2-sharp-trophy-song', ['now', 'printed', 'direct', 'correct', 'wait']],
])

const manifestEntries = [
  ...readManifest('a1p1'),
  ...readManifest('a1p2'),
]

for (const row of GUIDED_TROPHY_SONGS) {
  const wrappedMatches = Array.from(row.rawLyricsWithWrappers.matchAll(/<<([^<>]+)>>/g))
  const derived = deriveTrophySongClozePositions(row.rawLyricsWithWrappers)
  const allowedWords = new Set(row.trophyWords)
  const expectedWords = expectedTrophyWords.get(row.id)

  assert(`${row.id} has five trophy words`, row.trophyWords.length === 5, row.trophyWords)
  assert(`${row.id} has expected trophy words`, JSON.stringify(row.trophyWords) === JSON.stringify(expectedWords), row.trophyWords)
  assert(`${row.id} raw lyrics have exactly five wrapped occurrences`, wrappedMatches.length === 5, wrappedMatches.map((match) => match[1]))
  assert(
    `${row.id} every wrapped word belongs to trophy words`,
    wrappedMatches.every((match) => allowedWords.has((match[1] ?? '').toLowerCase())),
    wrappedMatches.map((match) => match[1]),
  )
  assert(`${row.id} provider lyrics strip wrappers`, !row.providerLyrics.includes('<<') && !row.providerLyrics.includes('>>'))
  assert(`${row.id} display lyrics strip wrappers`, !row.displayLyrics.includes('<<') && !row.displayLyrics.includes('>>'))
  assert(`${row.id} German translation exists`, row.lyricsTranslationDe.trim().length > 0)
  assert(`${row.id} cloze positions are derivable`, JSON.stringify(row.clozePositions) === JSON.stringify(derived), { actual: row.clozePositions, derived })
  assert(`${row.id} audio is ready`, row.audioStatus === 'ready')
  assert(`${row.id} ready rows have audioPublicUrl`, row.audioStatus !== 'ready' || Boolean(row.audioPublicUrl))
  assert(`${row.id} generated rows expose candidate A`, Boolean(row.audioCandidates.A?.publicUrl), row.audioCandidates)
  assert(`${row.id} generated rows expose candidate B`, Boolean(row.audioCandidates.B?.publicUrl), row.audioCandidates)
  assert(`${row.id} active candidate defaults to A`, row.activeCandidateDefault === 'A', row.activeCandidateDefault)
  assert(`${row.id} audioPublicUrl points to candidate A`, row.audioPublicUrl === row.audioCandidates.A?.publicUrl, row)
  assert(
    `${row.id} referenced MP3 exists under frontend/public`,
    row.audioStatus !== 'ready' || Boolean(row.audioPublicUrl && existsSync(publicPath(row.audioPublicUrl))),
    row.audioPublicUrl,
  )
  assert(
    `${row.id} candidate B MP3 exists under frontend/public`,
    Boolean(row.audioCandidates.B?.publicUrl && existsSync(publicPath(row.audioCandidates.B.publicUrl))),
    row.audioCandidates.B,
  )
  assert(`${row.id} manifest entry exists`, manifestEntries.some((entry) => entry.catalogId === row.id && entry.providerStatus === 'success'), row.id)
}

console.log('\n[candidate selection]')
const candidateRow = GUIDED_TROPHY_SONGS[0]
assert('candidate storage key is catalog scoped', guidedTrophySongCandidateStorageKey(candidateRow.id) === `guided_trophy_song_candidate_${candidateRow.id}`)
assert('resolver keeps available candidate B', resolveGuidedTrophySongCandidate(candidateRow.audioCandidates, 'B', 'A') === 'B')
assert('resolver falls back to A when candidate B is missing', resolveGuidedTrophySongCandidate({ A: candidateRow.audioCandidates.A }, 'B', 'A') === 'A')
assert('resolver falls back to A for invalid stored value', resolveGuidedTrophySongCandidate(candidateRow.audioCandidates, 'C', 'A') === 'A')

const originalWindow = globalThis.window
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: createMemoryStorage() },
  configurable: true,
})
try {
  assert('missing stored candidate resolves to default A', readGuidedTrophySongCandidate(candidateRow.id, candidateRow.audioCandidates, 'A') === 'A')
  writeGuidedTrophySongCandidate(candidateRow.id, 'B')
  assert('stored candidate B persists locally', readGuidedTrophySongCandidate(candidateRow.id, candidateRow.audioCandidates, 'A') === 'B')
  window.localStorage.setItem(guidedTrophySongCandidateStorageKey(candidateRow.id), 'invalid')
  assert('invalid stored candidate falls back to default A', readGuidedTrophySongCandidate(candidateRow.id, candidateRow.audioCandidates, 'A') === 'A')
} finally {
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    configurable: true,
  })
}

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)

function publicPath(audioPublicUrl: string) {
  const relativePublicPath = audioPublicUrl.replace(/^\//, '')
  return fileURLToPath(new URL(`../public/${relativePublicPath}`, import.meta.url))
}

function readManifest(assetCollection: 'a1p1' | 'a1p2') {
  const manifestPath = fileURLToPath(new URL(`../public/guided/trophy-songs/${assetCollection}/manifest.json`, import.meta.url))
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    entries?: Array<{ catalogId: string; providerStatus: string }>
  }
  return manifest.entries ?? []
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
}
