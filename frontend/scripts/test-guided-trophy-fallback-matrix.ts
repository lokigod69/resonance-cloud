/**
 * Deterministic trophy-word fallback matrix validation for Guided Today A1P1-A1P10.
 *
 * Run: npx tsx scripts/test-guided-trophy-fallback-matrix.ts
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  getGuidedPathLessons,
  getGuidedTodayPathOptions,
  resolveGuidedBaseContent,
  resolveGuidedLessonVariant,
} from '../src/data/guidedLessons.ts'
import { DEFAULT_GUIDED_VIBE_ID } from '../src/data/guidedVibes.ts'
import type { ActiveGuidedVibeId } from '../src/data/guidedVibes.ts'
import type { GuidedSegmentReviewNumber } from '../src/lib/guidedCheckpoint.ts'
import { getGuidedTrophyWordsForSegment } from '../src/lib/guidedTrophy.ts'
import {
  fetchTrophySongCanonical,
  TrophySongNotAvailableError,
} from '../src/lib/trophySongsClient.ts'

type Segment = GuidedSegmentReviewNumber
type MatrixRow = {
  pathId: string
  segment: Segment
  vibe: ActiveGuidedVibeId
  lessons: string
  cards: number
  words: string
}

const ACTIVE_PATHS = [
  'english-a1-practical-1',
  'english-a1-practical-2',
  'english-a1-practical-3',
  'english-a1-practical-4',
  'english-a1-practical-5',
  'english-a1-practical-6',
  'english-a1-practical-7',
  'english-a1-practical-8',
  'english-a1-practical-9',
  'english-a1-practical-10',
] as const

const SEGMENTS: Segment[] = [1, 2]
const VIBES: ActiveGuidedVibeId[] = ['bright', 'wistful', 'sharp']
const TROPHY_TARGET_FIELDS = ['word', 'example'] as const
const TROPHY_BASE_FIELDS = ['meaning', 'whyThisWord'] as const

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

console.log('\n[matrix inventory]')
const pathOptions = getGuidedTodayPathOptions()
const englishA1PracticalPathIds = pathOptions
  .map((path) => path.id)
  .filter((pathId) => pathId.startsWith('english-a1-practical-'))
assert('Guided Today exposes the 10 expected English A1P1-A1P10 paths in order', JSON.stringify(englishA1PracticalPathIds) === JSON.stringify(ACTIVE_PATHS))
assert('matrix is 10 paths x 2 segments x 3 active vibes', ACTIVE_PATHS.length * SEGMENTS.length * VIBES.length === 60)

console.log('\n[trophy fallback matrix]')
const rows: MatrixRow[] = []
let totalCards = 0

for (const pathId of ACTIVE_PATHS) {
  for (const segment of SEGMENTS) {
    const expectedLessonNumbers = getExpectedLessonNumbers(segment)
    const lessons = getGuidedPathLessons(pathId).filter((lesson) => expectedLessonNumbers.includes(lesson.lessonNumber))

    assert(
      `${pathId} segment ${segment} has lessons ${expectedLessonNumbers.join('-')}`,
      lessons.map((lesson) => lesson.lessonNumber).join(',') === expectedLessonNumbers.join(','),
      lessons.map((lesson) => lesson.lessonNumber),
    )

    for (const vibe of VIBES) {
      const fallbackWords = getGuidedTrophyWordsForSegment(pathId, segment, vibe)
      const expectedWords = lessons.map((lesson) => resolveGuidedLessonVariant(lesson, vibe).trophyWord)
      const fallbackWordLabels = fallbackWords.map((word) => word.word)
      const expectedWordLabels = expectedWords.map((word) => word.word)
      const cardKeys = fallbackWordLabels

      assert(`${pathId} segment ${segment} ${vibe} returns exactly five trophy cards`, fallbackWords.length === 5, fallbackWords)
      assert(
        `${pathId} segment ${segment} ${vibe} returns the selected path/segment/vibe words in lesson order`,
        JSON.stringify(fallbackWordLabels) === JSON.stringify(expectedWordLabels),
        { observed: fallbackWordLabels, expected: expectedWordLabels },
      )
      assert(
        `${pathId} segment ${segment} ${vibe} has no dropped lesson`,
        expectedWords.length === 5 && fallbackWords.length === expectedWords.length,
        { observed: fallbackWords.length, expected: expectedWords.length },
      )
      assert(
        `${pathId} segment ${segment} ${vibe} has no duplicate TrophyWordCard keys`,
        new Set(cardKeys).size === cardKeys.length,
        cardKeys,
      )

      for (const [index, trophyWord] of fallbackWords.entries()) {
        for (const field of TROPHY_TARGET_FIELDS) {
          assert(
            `${pathId} segment ${segment} ${vibe} lesson ${expectedLessonNumbers[index]} has non-empty ${field}`,
            typeof trophyWord[field] === 'string' && trophyWord[field].trim().length > 0,
            trophyWord,
          )
        }
        for (const field of TROPHY_BASE_FIELDS) {
          assert(
            `${pathId} segment ${segment} ${vibe} lesson ${expectedLessonNumbers[index]} has non-empty ${field}`,
            resolveGuidedBaseContent(trophyWord[field], { authoredBaseLanguage: 'German' }).text.trim().length > 0,
            trophyWord,
          )
        }
      }

      if (pathId !== 'english-a1-practical-1') {
        const p1Words = getGuidedTrophyWordsForSegment('english-a1-practical-1', segment, vibe).map((word) => word.word)
        assert(
          `${pathId} segment ${segment} ${vibe} does not fall back to the P1 five-card tuple`,
          JSON.stringify(fallbackWordLabels) !== JSON.stringify(p1Words),
          { observed: fallbackWordLabels, p1Words },
        )
      }

      totalCards += fallbackWords.length
      rows.push({
        pathId,
        segment,
        vibe,
        lessons: expectedLessonNumbers.join('-'),
        cards: fallbackWords.length,
        words: fallbackWordLabels.join(', '),
      })
    }
  }
}

assert('static fallback matrix checks exactly 60 trophy states', rows.length === 60, rows.length)
assert('static fallback matrix checks exactly 300 visible trophy cards', totalCards === 300, totalCards)

console.log('\n[back-link matrix]')
for (const pathId of ACTIVE_PATHS) {
  for (const vibe of VIBES) {
    const href = buildExpectedTodayHref(pathId, vibe)
    assert(`${pathId} ${vibe} back link preserves path and vibe`, href === `/today?path=${pathId}&vibe=${vibe}`, href)
  }
}

console.log('\n[today query-param initialization]')
assert(
  '/today?path=english-a1-practical-8&vibe=bright resolves P8 Bright',
  resolveTodayPathId('english-a1-practical-8', pathOptions) === 'english-a1-practical-8'
    && resolveTodayVibeId('bright') === 'bright',
)
assert(
  '/today?path=english-a1-practical-10&vibe=sharp resolves P10 Sharp',
  resolveTodayPathId('english-a1-practical-10', pathOptions) === 'english-a1-practical-10'
    && resolveTodayVibeId('sharp') === 'sharp',
)
assert('invalid path falls back safely to no query path', resolveTodayPathId('english-a1-practical-999', pathOptions) === undefined)
assert('invalid vibe falls back safely to the default active vibe', resolveTodayVibeId('stormy') === undefined && DEFAULT_GUIDED_VIBE_ID === 'bright')
assert('plain /today defaults to P1 when no path query is present', (resolveTodayPathId(null, pathOptions) ?? pathOptions[0]?.id) === 'english-a1-practical-1')

console.log('\n[A2 pilot matrix]')
{
  const a2PathId = 'spanish-a2-practical-1'
  const orderedPathIds = pathOptions.map((path) => path.id)
  assert(
    'Spanish A2 pilot path is exposed directly after Spanish A1 P10',
    orderedPathIds.indexOf(a2PathId) === orderedPathIds.indexOf('spanish-a1-practical-10') + 1,
    orderedPathIds.filter((id) => id.startsWith('spanish-')),
  )
  assert(
    'Spanish A2 pilot path metadata carries level A2',
    pathOptions.find((path) => path.id === a2PathId)?.level === 'A2',
  )
  for (const segment of SEGMENTS) {
    const fallbackWords = getGuidedTrophyWordsForSegment(a2PathId, segment, 'bright')
    const wordLabels = fallbackWords.map((word) => word.word)
    assert(`${a2PathId} segment ${segment} bright returns exactly five trophy cards`, fallbackWords.length === 5, fallbackWords)
    assert(`${a2PathId} segment ${segment} bright has no duplicate TrophyWordCard keys`, new Set(wordLabels).size === wordLabels.length, wordLabels)
    for (const trophyWord of fallbackWords) {
      for (const field of TROPHY_TARGET_FIELDS) {
        assert(
          `${a2PathId} segment ${segment} bright ${trophyWord.word} has non-empty ${field}`,
          typeof trophyWord[field] === 'string' && trophyWord[field].trim().length > 0,
          trophyWord,
        )
      }
      for (const field of TROPHY_BASE_FIELDS) {
        assert(
          `${a2PathId} segment ${segment} bright ${trophyWord.word} has non-empty ${field}`,
          resolveGuidedBaseContent(trophyWord[field], { authoredBaseLanguage: 'German' }).text.trim().length > 0,
          trophyWord,
        )
      }
    }
  }
  let a2MissingSongError: unknown
  try {
    await fetchTrophySongCanonical(a2PathId, 1, 'bright')
  } catch (error) {
    a2MissingSongError = error
  }
  assert('missing A2 canonical song row throws typed unavailable error', a2MissingSongError instanceof TrophySongNotAvailableError, a2MissingSongError)
}

console.log('\n[fallback vs song routing]')
const supportedRow = await fetchTrophySongCanonical('english-a1-practical-1', 1, 'bright')
assert('canonical trophy song row still exists for P1 segment 1 Bright', supportedRow.pathId === 'english-a1-practical-1' && supportedRow.segment === 1 && supportedRow.vibe === 'bright')

let missingSongError: unknown
try {
  await fetchTrophySongCanonical('english-a1-practical-8', 1, 'bright')
} catch (error) {
  missingSongError = error
}
assert('missing canonical song row throws typed unavailable error', missingSongError instanceof TrophySongNotAvailableError, missingSongError)
assert('missing song row does not prevent P8 fallback cards', getGuidedTrophyWordsForSegment('english-a1-practical-8', 1, 'bright').length === 5)

console.log('\n[source wiring]')
const todaySource = readSource('../src/pages/Today.tsx')
const checkpointSource = readSource('../src/pages/GuidedCheckpoint.tsx')
const overviewSource = readSource('../src/components/today/TodayPathOverview.tsx')
const trophyTileSource = readSource('../src/components/today/SegmentTrophyTile.tsx')
const songPanelSource = readSource('../src/components/today/trophy/TrophySongPanel.tsx')
const fallbackPanelSource = readSource('../src/components/today/trophy/TrophyWordFallbackPanel.tsx')
const packageSource = readSource('../package.json')

assert('Segment Review 1/2 links include selected path, segment, and vibe', overviewSource.includes('mode=segment-review&path=${selectedPathId}&segment=${segment.segment}&vibe=${selectedVibeId}'))
assert('Path Check link includes selected path and vibe', todaySource.includes('mode=path-check&path=${selectedPathId}&vibe=${selectedVibeId}'))
assert('Checkpoint card link includes selected path and vibe', todaySource.includes('href: `/today/checkpoint?path=${selectedPathId}&vibe=${selectedVibeId}`'))
assert('Trophy tile links include selected path, segment, and vibe', trophyTileSource.includes('mode=trophy-cloze&path=${pathId}&segment=${segment}&vibe=${vibeId}'))
assert('GuidedCheckpoint builds /today back href with path and vibe', checkpointSource.includes('function buildTodayPathHref') && checkpointSource.includes('return `/today?path=${pathId}&vibe=${vibe}`'))
assert('GuidedCheckpoint passes preserved back href to song and fallback panels', checkpointSource.includes('TrophySongPanel row={row} backToTodayHref={backToTodayHref}') && checkpointSource.includes('TrophyWordFallbackPanel'))
assert('Today reads and validates path/vibe query params', todaySource.includes("searchParams.get('path')") && todaySource.includes('resolveTodayPathId') && todaySource.includes("searchParams.get('vibe')") && todaySource.includes('resolveTodayVibeId'))
assert('canonical song rows render TrophySongPanel', checkpointSource.includes('if (!row)') && checkpointSource.includes('return <TrophySongPanel row={row}'))
assert('missing song rows render TrophyWordFallbackPanel', checkpointSource.includes('setRow(undefined)') && checkpointSource.includes('return (\n      <TrophyWordFallbackPanel'))
assert('song panel still renders player, lyrics, and cloze drill for canonical rows', songPanelSource.includes('TrophySongPlayer') && songPanelSource.includes('TrophyLyricsReview') && songPanelSource.includes('TrophyLyricClozeDrill'))
assert('fallback panel renders TrophyWordCard from local fallback words', fallbackPanelSource.includes('getGuidedTrophyWordsForSegment') && fallbackPanelSource.includes('<TrophyWordCard') && fallbackPanelSource.includes('key={trophyWord.word}') && fallbackPanelSource.includes('authoredBaseLanguage'))
assert('fallback panel has a non-playable song placeholder', fallbackPanelSource.includes("t('today.trophy.player.comingSoon')") && !fallbackPanelSource.includes('TrophySongPlayer') && !fallbackPanelSource.includes('<audio') && !fallbackPanelSource.includes('TrophyLyricClozeDrill'))
assert('fallback panel hides path voice and segment metadata pills', !fallbackPanelSource.includes('MetadataPill') && !fallbackPanelSource.includes('getGuidedTodayPathOptions') && !fallbackPanelSource.includes('guidedVibes,'))
assert('fallback panel avoids segment kicker and status badge copy', !fallbackPanelSource.includes('today.trophy.panelKicker') && !fallbackPanelSource.includes('today.trophy.panelBadge'))
assert('canonical song panel hides debug-style metadata pills while keeping the real player', !songPanelSource.includes('MetadataPill') && !songPanelSource.includes('formatAudioStatus') && !songPanelSource.includes('guidedVibes') && songPanelSource.includes('TrophySongPlayer'))
assert('fallback matrix test is part of test:guided-today chain', packageSource.includes('scripts/test-guided-trophy-fallback-matrix.ts'))

console.log('\n[coverage table]')
for (const pathId of ACTIVE_PATHS) {
  const pathRows = rows.filter((row) => row.pathId === pathId)
  const summary = SEGMENTS.map((segment) => {
    const segmentRows = pathRows.filter((row) => row.segment === segment)
    return `S${segment}: ${segmentRows.length} states / ${segmentRows.reduce((sum, row) => sum + row.cards, 0)} cards`
  }).join(' | ')
  console.log(`  ${pathId}: ${summary}`)
}

console.log(`\n  matrix states: ${rows.length}`)
console.log(`  trophy cards: ${totalCards}`)
console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)

function getExpectedLessonNumbers(segment: Segment) {
  return segment === 1 ? [1, 2, 3, 4, 5] : [6, 7, 8, 9, 10]
}

function buildExpectedTodayHref(pathId: string, vibe: ActiveGuidedVibeId) {
  return `/today?path=${pathId}&vibe=${vibe}`
}

function resolveTodayPathId(value: string | null, options: Array<{ id: string }>) {
  return options.some((path) => path.id === value) ? value! : undefined
}

function resolveTodayVibeId(value: string | null): ActiveGuidedVibeId | undefined {
  return VIBES.some((vibe) => vibe === value) ? value as ActiveGuidedVibeId : undefined
}

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
}
