/**
 * Static validation for Guided Trophy Song catalog rows.
 *
 * Run: npx tsx scripts/test-guided-trophy-songs.ts
 */

import { existsSync } from 'node:fs'
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
assert('catalog has exactly six rows', GUIDED_TROPHY_SONGS.length === 6, GUIDED_TROPHY_SONGS.length)
assert(
  'catalog ids are unique',
  new Set(GUIDED_TROPHY_SONGS.map((row) => row.id)).size === GUIDED_TROPHY_SONGS.length,
  GUIDED_TROPHY_SONGS.map((row) => row.id),
)

for (const row of GUIDED_TROPHY_SONGS) {
  const wrappedMatches = Array.from(row.rawLyricsWithWrappers.matchAll(/<<([^<>]+)>>/g))
  const derived = deriveTrophySongClozePositions(row.rawLyricsWithWrappers)
  const allowedWords = new Set(row.trophyWords)

  assert(`${row.id} has five trophy words`, row.trophyWords.length === 5, row.trophyWords)
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
