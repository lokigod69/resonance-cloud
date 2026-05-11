/**
 * Static validation for Guided Today path overview status behavior.
 *
 * Run: npx tsx scripts/test-guided-today-path-overview.ts
 */

import {
  ACTIVE_GUIDED_VIBE_IDS,
  FUTURE_GUIDED_VIBE_IDS,
} from '../src/data/guidedVibes.ts'
import {
  getGuidedPathOverview,
  getGuidedPathLessons,
  resolveGuidedLessonVariant,
} from '../src/data/guidedLessons.ts'
import {
  createEmptyTodayProgressState,
  markTodayLessonComplete,
  restartTodayLessonProgress,
} from '../src/lib/todayProgress.ts'
import {
  getSelectedGuidedVibe,
  setSelectedGuidedVibe,
  todayGuidedVibeKey,
} from '../src/lib/todayVibe.ts'

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

const pathId = 'english-a1-practical'
const lessons = getGuidedPathLessons(pathId)
const firstLessonDefinition = lessons[0]
const secondLessonDefinition = lessons[1]

if (!firstLessonDefinition || !secondLessonDefinition) {
  throw new Error('Expected at least two Guided Today lessons for path overview checks.')
}

const firstLesson = resolveGuidedLessonVariant(firstLessonDefinition, 'bright')
const secondLesson = resolveGuidedLessonVariant(secondLessonDefinition, 'bright')

console.log('\n[path overview status]')
const emptyOverview = getGuidedPathOverview(pathId, createEmptyTodayProgressState(), 'bright')
assert('overview exposes 10 lessons', emptyOverview.lessons.length === 10, emptyOverview.lessons.length)
assert('empty progress recommends lesson 1', emptyOverview.recommendedLesson?.id === firstLesson.id, emptyOverview.recommendedLesson?.id)
assert('empty progress is not path complete', !emptyOverview.isComplete)
assert('lesson 1 is current with empty progress', emptyOverview.lessons[0]?.status === 'current', emptyOverview.lessons[0])
assert('lesson 2 is not started with empty progress', emptyOverview.lessons[1]?.status === 'not-started', emptyOverview.lessons[1])

const completedFirst = markTodayLessonComplete(createEmptyTodayProgressState(), firstLesson, minimalResult())
const afterFirstOverview = getGuidedPathOverview(pathId, completedFirst, 'bright')
assert('first incomplete advances to lesson 2 after lesson 1 completion', afterFirstOverview.recommendedLesson?.id === secondLesson.id, afterFirstOverview.recommendedLesson?.id)
assert('lesson 1 card is complete after completion', afterFirstOverview.lessons[0]?.status === 'complete', afterFirstOverview.lessons[0])
assert('lesson 2 card is current after lesson 1 completion', afterFirstOverview.lessons[1]?.status === 'current', afterFirstOverview.lessons[1])
assert('lesson 3 card is not started after lesson 1 completion', afterFirstOverview.lessons[2]?.status === 'not-started', afterFirstOverview.lessons[2])

let allCompleteProgress = createEmptyTodayProgressState()
for (const lessonDefinition of lessons) {
  allCompleteProgress = markTodayLessonComplete(
    allCompleteProgress,
    resolveGuidedLessonVariant(lessonDefinition, 'bright'),
    minimalResult(),
  )
}
const allCompleteOverview = getGuidedPathOverview(pathId, allCompleteProgress, 'sharp')
assert('all-complete state is detectable', allCompleteOverview.isComplete)
assert('all-complete state has no recommended lesson', allCompleteOverview.recommendedLesson === undefined, allCompleteOverview.recommendedLesson)
assert('all cards are complete when path is complete', allCompleteOverview.lessons.every((lesson) => lesson.status === 'complete'), allCompleteOverview.lessons)

console.log('\n[pure selection and restart behavior]')
const progressBeforeSelection = JSON.stringify(completedFirst)
getGuidedPathOverview(pathId, completedFirst, 'wistful', secondLesson.id)
assert('lesson selection does not mutate progress', JSON.stringify(completedFirst) === progressBeforeSelection, completedFirst)

const completedTwo = markTodayLessonComplete(completedFirst, secondLesson, minimalResult())
const restartedSecond = restartTodayLessonProgress(completedTwo, secondLesson)
assert('restart clears selected lesson progress', !restartedSecond.courses[pathId]?.completedLessonIds.includes(secondLesson.id), restartedSecond)
assert('restart does not clear other completed lessons', restartedSecond.courses[pathId]?.completedLessonIds.includes(firstLesson.id) === true, restartedSecond)

console.log('\n[vibe behavior]')
const originalWindow = globalThis.window
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: createMemoryStorage() },
  configurable: true,
})

try {
  const progressBeforeVibe = JSON.stringify(completedFirst)
  setSelectedGuidedVibe(pathId, 'sharp')
  assert('active vibe switch persists selected voice', getSelectedGuidedVibe(pathId) === 'sharp')
  assert('vibe switch does not mutate progress', JSON.stringify(completedFirst) === progressBeforeVibe, completedFirst)
  for (const futureVibeId of FUTURE_GUIDED_VIBE_IDS) {
    setSelectedGuidedVibe(pathId, futureVibeId)
    assert(`${futureVibeId} remains non-selectable`, getSelectedGuidedVibe(pathId) === 'bright')
  }
  assert('only active launch vibes are selectable', JSON.stringify(ACTIVE_GUIDED_VIBE_IDS) === JSON.stringify(['bright', 'wistful', 'sharp']), ACTIVE_GUIDED_VIBE_IDS)
  assert('vibe storage key remains path-scoped', todayGuidedVibeKey(pathId) === 'resonance_guided_vibe__english-a1-practical')
} finally {
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    configurable: true,
  })
}

console.log('\n[privacy]')
const storedResultJson = JSON.stringify(completedTwo.courses[pathId]?.lessons[firstLesson.id]?.result)
assert('no raw typed answers are stored', !containsAny(storedResultJson, ['typedAnswer', 'typeAnswer', 'typedRecallAnswer', 'rawAnswer']), completedTwo)
assert('no raw speech transcripts are stored', !containsAny(storedResultJson, ['speechTranscript', 'transcriptText', 'rawTranscript']), completedTwo)

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)

function minimalResult() {
  return {
    buildAttempts: 1,
    typeAttempts: 1,
    typeUsedFallback: false,
    speakAttempts: 0,
    speakTranscriptMatch: 0,
    speakPassed: false,
    knownMarkedCount: 0,
  }
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
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
