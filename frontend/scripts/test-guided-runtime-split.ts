/**
 * Proves the deferred runtime corpus is semantically identical to the authored
 * source while each language remains independently loadable.
 *
 * Run: npx tsx scripts/test-guided-runtime-split.ts
 */

import {
  GUIDED_LESSONS as AUTHORED_GUIDED_LESSONS,
  getGuidedTodayPathOptions as getAuthoredGuidedTodayPathOptions,
  resolveGuidedLessonVariant as resolveAuthoredGuidedLessonVariant,
} from '../src/data/guidedLessonsAuthoring.ts'
import {
  GUIDED_LESSONS,
  getGuidedPathLessonIds,
  getGuidedTodayPathOptions,
  isGuidedLanguageLoaded,
  loadAllGuidedLessons,
  loadGuidedLessonsForLanguage,
} from '../src/data/guidedLessons.ts'
import { countCompletedGuidedCheckpointPaths } from '../src/lib/guidedCheckpoint.ts'
import { createEmptyTodayProgressState, markTodayLessonComplete } from '../src/lib/todayProgress.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function serialize(value: unknown): string {
  return JSON.stringify(value)
}

assert(GUIDED_LESSONS.length === 0, 'Importing the runtime facade must not eagerly load lesson bodies.')
assert(
  serialize(getGuidedTodayPathOptions()) === serialize(getAuthoredGuidedTodayPathOptions()),
  'Generated path metadata must exactly match the authored path index.',
)
for (const path of getAuthoredGuidedTodayPathOptions()) {
  const authoredLessonIds = AUTHORED_GUIDED_LESSONS
    .filter((lesson) => lesson.pathId === path.id)
    .sort((left, right) => left.lessonNumber - right.lessonNumber)
    .map((lesson) => lesson.id)
  assert(
    serialize(getGuidedPathLessonIds(path.id)) === serialize(authoredLessonIds),
    `Generated lesson ID index differs for ${path.id}.`,
  )
}

const firstPathId = getAuthoredGuidedTodayPathOptions()[0]?.id
assert(firstPathId, 'Authored guided paths must not be empty.')
let completedPathProgress = createEmptyTodayProgressState()
for (const lesson of AUTHORED_GUIDED_LESSONS.filter((entry) => entry.pathId === firstPathId)) {
  completedPathProgress = markTodayLessonComplete(
    completedPathProgress,
    resolveAuthoredGuidedLessonVariant(lesson, 'bright'),
    {
      buildAttempts: 1,
      typeAttempts: 1,
      typeUsedFallback: false,
      speakAttempts: 0,
      speakTranscriptMatch: 0,
      speakPassed: false,
      knownMarkedCount: 0,
    },
  )
}
assert(
  countCompletedGuidedCheckpointPaths(completedPathProgress, 'bright') === 1,
  'Checkpoint eligibility must use the lesson-ID index before any lesson body is loaded.',
)

const authoredFrench = AUTHORED_GUIDED_LESSONS.filter((lesson) => lesson.targetLanguage === 'French')
await loadGuidedLessonsForLanguage('French')
assert(isGuidedLanguageLoaded('French'), 'The requested language should be marked as loaded.')
assert(!isGuidedLanguageLoaded('German'), 'Loading French must not load another language corpus.')
assert(
  serialize(GUIDED_LESSONS) === serialize(authoredFrench),
  'The independently loaded French corpus must exactly match its authored lessons and order.',
)

await loadGuidedLessonsForLanguage('French')
assert(
  GUIDED_LESSONS.length === authoredFrench.length,
  'Loading the same language twice must not duplicate lessons.',
)

await loadAllGuidedLessons()
const authoredById = new Map(AUTHORED_GUIDED_LESSONS.map((lesson) => [lesson.id, serialize(lesson)]))
const runtimeById = new Map(GUIDED_LESSONS.map((lesson) => [lesson.id, serialize(lesson)]))

assert(runtimeById.size === GUIDED_LESSONS.length, 'Runtime lesson IDs must remain unique.')
assert(authoredById.size === AUTHORED_GUIDED_LESSONS.length, 'Authored lesson IDs must remain unique.')
assert(runtimeById.size === authoredById.size, 'Runtime and authored corpora must contain the same lesson count.')

for (const [lessonId, authoredLesson] of authoredById) {
  assert(runtimeById.get(lessonId) === authoredLesson, `Runtime lesson ${lessonId} differs from authored content.`)
}

console.log(`Guided runtime split: ${runtimeById.size} lesson bodies and ${getGuidedTodayPathOptions().length} path metadata entries match authored source.`)
