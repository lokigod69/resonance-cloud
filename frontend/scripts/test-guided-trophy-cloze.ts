/**
 * Static and behavioral validation for Guided Today trophy cloze reviews.
 *
 * Run: npx tsx scripts/test-guided-trophy-cloze.ts
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { guidedAnswerMatches } from '../src/data/guidedLessons.ts'
import {
  fetchTrophySongCanonical,
  TrophySongNotAvailableError,
} from '../src/lib/trophySongsClient.ts'
import {
  getTrophyClozeAcceptedAnswers,
  guidedTrophyClozeKey,
  readGuidedTrophyClozeRecord,
  writeGuidedTrophyClozeRecord,
  type GuidedTrophyClozeRecord,
} from '../src/lib/guidedTrophy.ts'

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

console.log('\n[storage key and record]')
assert(
  'trophy cloze key is path/vibe/segment scoped',
  guidedTrophyClozeKey('english-a1-practical-1', 'bright', 1) === 'guided_trophy_cloze_english-a1-practical-1_bright_1',
)

const originalWindow = globalThis.window
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: createMemoryStorage() },
  configurable: true,
})

try {
  const record: GuidedTrophyClozeRecord = {
    completedAt: '2026-05-14T00:00:00.000Z',
    pathId: 'english-a1-practical-1',
    segment: 1,
    vibe: 'bright',
    linesAttempted: 5,
    wordsAttempted: 5,
    correctCount: 4,
    items: [
      { lineIndex: 0, word: 'delighted', attempts: 1, firstTryCorrect: true, correct: true },
      { lineIndex: 1, word: 'marvelous', attempts: 1, firstTryCorrect: true, correct: true },
      { lineIndex: 2, word: 'glad', attempts: 2, firstTryCorrect: false, correct: true },
      { lineIndex: 3, word: 'eager', attempts: 1, firstTryCorrect: true, correct: true },
      { lineIndex: 4, word: 'splendid', attempts: 1, firstTryCorrect: false, correct: false },
    ],
  }

  writeGuidedTrophyClozeRecord(record)
  assert(
    'trophy cloze record writes only the trophy namespace key',
    window.localStorage.key(0) === guidedTrophyClozeKey(record.pathId, record.vibe, record.segment),
    window.localStorage.key(0),
  )
  assert(
    'trophy cloze record round-trips from localStorage',
    readGuidedTrophyClozeRecord(record.pathId, record.vibe, record.segment)?.correctCount === 4,
  )
} finally {
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    configurable: true,
  })
}

console.log('\n[mock trophy client]')
const supportedRow = await fetchTrophySongCanonical('english-a1-practical-1', 1, 'bright')
assert('mock client returns the supported canonical trophy row', supportedRow.pathId === 'english-a1-practical-1' && supportedRow.segment === 1 && supportedRow.vibe === 'bright', supportedRow)
assert(
  'mock client resolves Bright trophy words from lessons 1-5',
  JSON.stringify(supportedRow.trophyWords) === JSON.stringify(['delighted', 'marvelous', 'glad', 'eager', 'splendid']),
  supportedRow.trophyWords,
)
assert('mock client keeps audio null in V1 mock mode', supportedRow.audioPublicUrl === null)
assert('mock client returns five lyric lines and five cloze positions', supportedRow.lyricsDisplay.split('\n').length === 5 && supportedRow.clozePositions.length === 5, supportedRow)
assert(
  'cloze positions point at the literal trophy words in their lyric lines',
  supportedRow.clozePositions.every((position) => {
    const line = supportedRow.lyricsDisplay.split('\n')[position.lineIndex] ?? ''
    return line.slice(position.startChar, position.endChar) === position.word
  }),
  supportedRow.clozePositions,
)

let unsupportedError: unknown
try {
  await fetchTrophySongCanonical('english-a1-practical-1', 2, 'bright')
} catch (error) {
  unsupportedError = error
}
assert('mock client throws typed unavailable error for unsupported tuples', unsupportedError instanceof TrophySongNotAvailableError, unsupportedError)

console.log('\n[answer matching]')
const accepted = getTrophyClozeAcceptedAnswers('Splendid!')
assert('cloze accepted answers include original, lowercase, punctuation-stripped, and lowercase-punctuation-stripped variants', JSON.stringify(accepted) === JSON.stringify(['Splendid!', 'splendid!', 'Splendid', 'splendid']), accepted)
assert('guidedAnswerMatches accepts original trophy word variant', guidedAnswerMatches('Splendid!', accepted))
assert('guidedAnswerMatches accepts lowercase trophy word variant', guidedAnswerMatches('splendid!', accepted))
assert('guidedAnswerMatches accepts punctuation-stripped trophy word variant', guidedAnswerMatches('Splendid', accepted))
assert('guidedAnswerMatches accepts lowercase punctuation-stripped trophy word variant', guidedAnswerMatches('splendid', accepted))

console.log('\n[source wiring]')
const overviewSource = readSource('../src/components/today/TodayPathOverview.tsx')
const trophyTileSource = readSource('../src/components/today/SegmentTrophyTile.tsx')
const checkpointSource = readSource('../src/pages/GuidedCheckpoint.tsx')
const cssSource = readSource('../src/components/today/Today.css')
const translationsSource = readSource('../src/lib/translations.ts')
const packageSource = readSource('../package.json')

assert('overview imports and renders SegmentTrophyTile beside existing review tiles', overviewSource.includes('SegmentTrophyTile') && overviewSource.includes('today-path-reviewPair'))
assert('trophy tile uses trophy-cloze checkpoint route mode', trophyTileSource.includes('mode=trophy-cloze') && trophyTileSource.includes('segment=${segment}') && trophyTileSource.includes('vibe=${vibeId}'))
assert('checkpoint route detects trophy-cloze mode without removing existing modes', checkpointSource.includes("checkpointMode === 'trophy-cloze'") && checkpointSource.includes("checkpointMode === 'segment-review'") && checkpointSource.includes("checkpointMode === 'path-check'"))
assert('checkpoint route renders TrophySongPanel for trophy mode', checkpointSource.includes('TrophySongPanel') && checkpointSource.includes('fetchTrophySongCanonical'))
assert('trophy tile and panel styling are present', cssSource.includes('.today-segment-trophyTile') && cssSource.includes('.today-trophy-clozeInput'))
assert('English and German trophy translations are present', countOccurrences(translationsSource, "'today.trophy.tileTitle'") >= 2 && translationsSource.includes("'today.trophy.player.play'"))
assert('guided trophy cloze test is part of test:guided-today chain', packageSource.includes('scripts/test-guided-trophy-cloze.ts'))

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
}

function countOccurrences(value: string, needle: string) {
  return value.split(needle).length - 1
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
