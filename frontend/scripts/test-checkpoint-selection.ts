/**
 * Static validation for Guided Today Quick Review checkpoint selection.
 *
 * Run: npx tsx scripts/test-checkpoint-selection.ts
 */

import { getGuidedPathLessons, resolveGuidedLessonVariant } from '../src/data/guidedLessons.ts'
import { buildGuidedCheckpointPlan, buildGuidedPathCheckPlan, buildGuidedSegmentReviewPlan } from '../src/lib/guidedCheckpoint.ts'
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

const pathIds = [
  'english-a1-practical-1',
  'english-a1-practical-2',
  'english-a1-practical-3',
]

console.log('\n[distribution]')
const onePathPlan = buildGuidedCheckpointPlan(completePaths(['bright']), 'bright', fixedRng())
assert('one completed path yields 8 checkpoint items', onePathPlan?.items.length === 8, onePathPlan)
assert('one completed path samples only that path', countByPath(onePathPlan).get(pathIds[0]!) === 8, countByPath(onePathPlan))

const twoPathPlan = buildGuidedCheckpointPlan(completePaths(['bright', 'bright']), 'bright', fixedRng())
assert('two completed paths yields 8 checkpoint items', twoPathPlan?.items.length === 8, twoPathPlan)
assert('two completed paths split 4/4', JSON.stringify(pathCounts(twoPathPlan)) === JSON.stringify([4, 4]), pathCounts(twoPathPlan))

const threePathPlan = buildGuidedCheckpointPlan(completePaths(['bright', 'bright', 'bright']), 'bright', fixedRng())
assert('three completed paths yields 8 checkpoint items', threePathPlan?.items.length === 8, threePathPlan)
assert('three completed paths split 3/3/2 with newest path on the floor', JSON.stringify(pathCounts(threePathPlan)) === JSON.stringify([3, 3, 2]), pathCounts(threePathPlan))
assert('multi-path checkpoint order avoids adjacent same-path items where possible', maxSamePathRun(threePathPlan) <= 1, threePathPlan?.items.map((item) => item.pathId))

console.log('\n[vibe filtering]')
const mixedVibeProgress = completePaths(['bright', 'wistful'])
const brightOnlyPlan = buildGuidedCheckpointPlan(mixedVibeProgress, 'bright', fixedRng())
assert('selection pool filters by active vibe only', JSON.stringify(pathCounts(brightOnlyPlan)) === JSON.stringify([8]), pathCounts(brightOnlyPlan))
assert('selected items preserve the active vibe', brightOnlyPlan?.items.every((item) => item.vibe === 'bright') === true, brightOnlyPlan)

console.log('\n[edge cases]')
const partialProgress = completePartialPath('bright', 7)
const partialPlan = buildGuidedCheckpointPlan(partialProgress, 'bright', fixedRng())
assert('pool under 8 items does not build a checkpoint plan', partialPlan === undefined, partialPlan)

console.log('\n[path check]')
const emptyProgressSnapshot = JSON.stringify(createEmptyTodayProgressState())
const pathCheckPlan = buildGuidedPathCheckPlan(pathIds[2]!, 'sharp', fixedRng())
assert('Path Check can build a plan without completed lessons', pathCheckPlan?.items.length === 8, pathCheckPlan)
assert('Path Check samples only the selected path', pathCheckPlan?.items.every((item) => item.pathId === pathIds[2]) === true, pathCheckPlan)
assert('Path Check preserves the selected active vibe', pathCheckPlan?.items.every((item) => item.vibe === 'sharp') === true, pathCheckPlan)
assert('Path Check plan building does not mutate lesson progress', JSON.stringify(createEmptyTodayProgressState()) === emptyProgressSnapshot)
assert('unknown Path Check path does not build a plan', buildGuidedPathCheckPlan('english-a1-practical-999', 'bright', fixedRng()) === undefined)

console.log('\n[segment review]')
const segmentOnePlan = buildGuidedSegmentReviewPlan(createEmptyTodayProgressState(), pathIds[0]!, 1, 'bright', fixedRng())
assert('Segment Review 1 builds all five lessons without completion progress', segmentOnePlan?.items.length === 5, segmentOnePlan)
assert('Segment Review 1 samples only selected path', segmentOnePlan?.items.every((item) => item.pathId === pathIds[0]) === true, segmentOnePlan)
assert('Segment Review 1 samples only lessons 1-5', segmentOnePlan?.items.every((item) => lessonNumber(item.lessonId) >= 1 && lessonNumber(item.lessonId) <= 5) === true, segmentOnePlan?.items.map((item) => item.lessonId))
assert('Segment Review preserves selected active vibe', segmentOnePlan?.items.every((item) => item.vibe === 'bright') === true, segmentOnePlan)
const segmentTwoProgress = createEmptyTodayProgressState()
const segmentTwoPlan = buildGuidedSegmentReviewPlan(segmentTwoProgress, pathIds[1]!, 2, 'sharp', fixedRng())
assert('Segment Review 2 builds all five lessons without completion progress', segmentTwoPlan?.items.length === 5, segmentTwoPlan)
assert('Segment Review 2 samples only lessons 6-10', segmentTwoPlan?.items.every((item) => lessonNumber(item.lessonId) >= 6 && lessonNumber(item.lessonId) <= 10) === true, segmentTwoPlan?.items.map((item) => item.lessonId))
assert('Segment Review samples the full segment before the whole path is complete', buildGuidedSegmentReviewPlan(completePartialPath('bright', 2), pathIds[0]!, 1, 'bright', fixedRng())?.items.length === 5)
assert('Segment Review is available before any selected segment lessons are complete', buildGuidedSegmentReviewPlan(createEmptyTodayProgressState(), pathIds[0]!, 1, 'bright', fixedRng())?.items.length === 5)

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)

function completePaths(vibesByPath: ActiveGuidedVibeId[]): TodayProgressState {
  return vibesByPath.reduce((state, vibeId, index) => completePath(state, pathIds[index]!, vibeId), createEmptyTodayProgressState())
}

function completePartialPath(vibeId: ActiveGuidedVibeId, lessonCount: number): TodayProgressState {
  return getGuidedPathLessons(pathIds[0]!)
    .slice(0, lessonCount)
    .reduce((state, definition) => (
      markTodayLessonComplete(state, resolveGuidedLessonVariant(definition, vibeId), minimalResult())
    ), createEmptyTodayProgressState())
}

function completePath(state: TodayProgressState, pathId: string, vibeId: ActiveGuidedVibeId): TodayProgressState {
  return getGuidedPathLessons(pathId).reduce((nextState, definition) => (
    markTodayLessonComplete(nextState, resolveGuidedLessonVariant(definition, vibeId), minimalResult())
  ), state)
}

function countByPath(plan: ReturnType<typeof buildGuidedCheckpointPlan>) {
  const counts = new Map<string, number>()
  for (const item of plan?.items ?? []) {
    counts.set(item.pathId, (counts.get(item.pathId) ?? 0) + 1)
  }
  return counts
}

function pathCounts(plan: ReturnType<typeof buildGuidedCheckpointPlan>) {
  const counts = countByPath(plan)
  return pathIds.map((pathId) => counts.get(pathId) ?? 0).filter((count) => count > 0)
}

function maxSamePathRun(plan: ReturnType<typeof buildGuidedCheckpointPlan>) {
  let maxRun = 0
  let currentRun = 0
  let currentPath = ''
  for (const item of plan?.items ?? []) {
    if (item.pathId === currentPath) {
      currentRun += 1
    } else {
      currentPath = item.pathId
      currentRun = 1
    }
    maxRun = Math.max(maxRun, currentRun)
  }
  return maxRun
}

function lessonNumber(lessonId: string) {
  const match = lessonId.match(/-(\d{3})-/)
  return match ? Number.parseInt(match[1]!, 10) : 0
}

function fixedRng() {
  let value = 0.17
  return () => {
    value = (value * 3.91) % 1
    return value
  }
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
