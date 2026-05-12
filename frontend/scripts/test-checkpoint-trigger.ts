/**
 * Static validation for Guided Today Quick Review checkpoint trigger behavior.
 *
 * Run: npx tsx scripts/test-checkpoint-trigger.ts
 */

import { getGuidedPathLessons, resolveGuidedLessonVariant } from '../src/data/guidedLessons.ts'
import {
  countCompletedGuidedCheckpointPaths,
  hasPendingGuidedCheckpoint,
} from '../src/lib/guidedCheckpoint.ts'
import { createEmptyTodayProgressState, markTodayLessonComplete, type TodayProgressState } from '../src/lib/todayProgress.ts'
import type { ActiveGuidedVibeId } from '../src/data/guidedVibes.ts'

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

const pathOneId = 'english-a1-practical-1'
const pathTwoId = 'english-a1-practical-2'

console.log('\n[path completion trigger]')
const emptyProgress = createEmptyTodayProgressState()
assert('empty progress has zero completed checkpoint paths', countCompletedGuidedCheckpointPaths(emptyProgress, 'bright') === 0)
assert('empty progress has no pending checkpoint', !hasPendingGuidedCheckpoint(emptyProgress, 'bright', 0))

const oneBrightPath = completePath(emptyProgress, pathOneId, 'bright')
assert('one fully completed active-vibe path counts as complete', countCompletedGuidedCheckpointPaths(oneBrightPath, 'bright') === 1)
assert('one completed path and zero checkpoints triggers Quick Review', hasPendingGuidedCheckpoint(oneBrightPath, 'bright', 0))
assert('one completed path and one checkpoint does not trigger another Quick Review', !hasPendingGuidedCheckpoint(oneBrightPath, 'bright', 1))

const nineOfSecondPath = completeLessons(oneBrightPath, pathTwoId, 'bright', 9)
assert('partial second path does not advance completed path count', countCompletedGuidedCheckpointPaths(nineOfSecondPath, 'bright') === 1)

const secondPathWistful = completePath(oneBrightPath, pathTwoId, 'wistful')
assert('path completed in another vibe does not count for active vibe', countCompletedGuidedCheckpointPaths(secondPathWistful, 'bright') === 1)
assert('same progress can trigger for the vibe that completed the second path', countCompletedGuidedCheckpointPaths(secondPathWistful, 'wistful') === 1)

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)

function completePath(state: TodayProgressState, pathId: string, vibeId: ActiveGuidedVibeId): TodayProgressState {
  return completeLessons(state, pathId, vibeId, getGuidedPathLessons(pathId).length)
}

function completeLessons(
  state: TodayProgressState,
  pathId: string,
  vibeId: ActiveGuidedVibeId,
  lessonCount: number,
): TodayProgressState {
  return getGuidedPathLessons(pathId).slice(0, lessonCount).reduce((nextState, definition) => (
    markTodayLessonComplete(nextState, resolveGuidedLessonVariant(definition, vibeId), minimalResult())
  ), state)
}

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
