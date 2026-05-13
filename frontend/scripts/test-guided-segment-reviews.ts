/**
 * Static validation for Guided Today in-path segment reviews.
 *
 * Run: npx tsx scripts/test-guided-segment-reviews.ts
 */

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getGuidedPathLessons, resolveGuidedLessonVariant } from '../src/data/guidedLessons.ts'
import {
  buildGuidedSegmentReviewPlan,
  completeGuidedSegmentReview,
  guidedSegmentReviewKey,
  readGuidedSegmentReviewRecord,
} from '../src/lib/guidedCheckpoint.ts'
import { createEmptyTodayProgressState, markTodayLessonComplete } from '../src/lib/todayProgress.ts'
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

console.log('\n[overview source]')
const overviewSource = readSource('../src/components/today/TodayPathOverview.tsx')
const todaySource = readSource('../src/pages/Today.tsx')
const checkpointSource = readSource('../src/pages/GuidedCheckpoint.tsx')
const checkpointLibSource = readSource('../src/lib/guidedCheckpoint.ts')
const cssSource = readSource('../src/components/today/Today.css')

assert('Today header no longer renders the visible Path Check button', !sliceBetween(overviewSource, '<div className="today-path-actions', '<GuidedPathDirectory').includes("today.path.pathCheck"))
assert('Today still passes Path Check href for the path directory diagnostic', todaySource.includes('pathCheckHref=') && todaySource.includes('mode=path-check'))
assert('overview renders segment review nodes', overviewSource.includes('SegmentReviewTile') && overviewSource.includes('today.path.reviewOne') && overviewSource.includes('today.path.reviewTwo'))
assert('overview references lessons 1-5 for Review 1', overviewSource.includes('start: 1') && overviewSource.includes('end: 5'))
assert('overview references lessons 6-10 for Review 2', overviewSource.includes('start: 6') && overviewSource.includes('end: 10'))
assert('review nodes do not reuse normal lesson-card styling as their primary hook', overviewSource.includes('today-segment-review') && !sliceBetween(overviewSource, 'function SegmentReviewTile', 'function RecommendedLessonPanel').includes('today-path-card'))
assert('review tile links use segment-review route mode', overviewSource.includes('mode=segment-review') && overviewSource.includes('segment=${segment.segment}'))
assert('review tiles show segment progress', overviewSource.includes('completedCount') && overviewSource.includes('/5'))
assert('review tile locked state has no navigation', overviewSource.includes('aria-disabled') && overviewSource.includes('today.path.notReadyYet'))
assert('review assets are referenced by active vibe', overviewSource.includes('/guided/reviews/${selectedVibeId}-review.webp'))
assert('CSS defines separated segment review tile styling', cssSource.includes('.today-segment-reviewTile') && cssSource.includes('.today-path-segmentGrid'))

console.log('\n[assets]')
for (const vibeId of ['bright', 'wistful', 'sharp'] as const) {
  const assetPath = fileURLToPath(new URL(`../public/guided/reviews/${vibeId}-review.webp`, import.meta.url))
  assert(`${vibeId} review asset exists`, existsSync(assetPath), assetPath)
  if (existsSync(assetPath)) {
    const bytes = readFileSync(assetPath)
    assert(`${vibeId} review asset is a WebP file`, bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP')
    assert(`${vibeId} review asset has a reasonable file size`, bytes.length > 1000 && bytes.length < 180_000, bytes.length)
  }
}

console.log('\n[plan selection]')
for (const pathId of pathIds) {
  const progress = completeLessons(pathId, 'bright', 1, 5)
  const plan = buildGuidedSegmentReviewPlan(progress, pathId, 1, 'bright', fixedRng())
  assert(`${pathId} Review 1 builds from completed segment lessons`, plan?.items.length === 5, plan)
  assert(`${pathId} Review 1 samples only selected path`, plan?.items.every((item) => item.pathId === pathId) === true, plan)
  assert(`${pathId} Review 1 samples only lessons 1-5`, plan?.items.every((item) => lessonNumber(item.lessonId) >= 1 && lessonNumber(item.lessonId) <= 5) === true, plan?.items.map((item) => item.lessonId))
}

const secondSegmentProgress = completeLessons(pathIds[1]!, 'sharp', 6, 10)
const secondSegmentPlan = buildGuidedSegmentReviewPlan(secondSegmentProgress, pathIds[1]!, 2, 'sharp', fixedRng())
assert('Review 2 samples only lessons 6-10', secondSegmentPlan?.items.every((item) => lessonNumber(item.lessonId) >= 6 && lessonNumber(item.lessonId) <= 10) === true, secondSegmentPlan?.items.map((item) => item.lessonId))
assert('Segment Review preserves selected active vibe', secondSegmentPlan?.items.every((item) => item.vibe === 'sharp') === true, secondSegmentPlan)
assert('Segment Review can build before the full path is complete', buildGuidedSegmentReviewPlan(completeLessons(pathIds[0]!, 'bright', 1, 2), pathIds[0]!, 1, 'bright', fixedRng())?.items.length === 2)
assert('Segment Review is unavailable with no completed lessons in the selected segment/vibe', buildGuidedSegmentReviewPlan(createEmptyTodayProgressState(), pathIds[0]!, 1, 'bright', fixedRng()) === undefined)
assert('Segment Review rejects unknown segment ids', buildGuidedSegmentReviewPlan(secondSegmentProgress, pathIds[0]!, 3, 'sharp', fixedRng()) === undefined)

console.log('\n[route and prompt]')
assert('checkpoint route detects segment-review mode', checkpointSource.includes('mode') && checkpointSource.includes('segment-review'))
assert('checkpoint route uses Segment Review plan builder', checkpointSource.includes('buildGuidedSegmentReviewPlan'))
assert('Segment Review completion does not call normal checkpoint storage writer', checkpointSource.includes('completeGuidedSegmentReview') && checkpointSource.includes('isSegmentReviewMode') && checkpointSource.includes('completeGuidedCheckpoint(selectedVibeId'))
assert('Segment Review type step uses Type Recall before/input/after shape', checkpointSource.includes('item.lesson.typeRecall.before') && checkpointSource.includes('item.lesson.typeRecall.after'))
assert('Segment Review prompt uses the dedicated phrase completion copy', checkpointSource.includes('today.checkpoint.segmentTypePrompt'))
assert('Segment Review shows German cue separately', checkpointSource.includes('today.checkpoint.germanCue') && checkpointSource.includes('item.lesson.corePhrase.baseText'))
assert('Path Check keeps a diagnostic label', checkpointSource.includes('today.checkpoint.pathCheckDiagnostic') || checkpointSource.includes('pathCheckHeading'))
assert('checkpoint lib exports Segment Review plan builder', checkpointLibSource.includes('export function buildGuidedSegmentReviewPlan'))

console.log('\n[segment completion storage]')
const originalWindow = globalThis.window
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: createMemoryStorage() },
  configurable: true,
})

try {
  const reviewed = secondSegmentPlan?.items.map((item, index) => ({
    lessonId: item.lessonId,
    pathId: item.pathId,
    vibe: item.vibe,
    firstTryCorrect: index !== 1,
    needsReview: index === 1,
  })) ?? []
  const beforeProgress = JSON.stringify(secondSegmentProgress)
  const record = completeGuidedSegmentReview(pathIds[1]!, 2, 'sharp', reviewed, new Date('2026-05-13T00:00:00.000Z'))
  assert('Segment Review writes a separate local summary key', window.localStorage.getItem(guidedSegmentReviewKey(pathIds[1]!, 2, 'sharp')) !== null)
  assert('Segment Review record round-trips from storage', readGuidedSegmentReviewRecord(pathIds[1]!, 2, 'sharp')?.itemsReviewed === record.itemsReviewed)
  assert('Segment Review completion does not mutate lesson progress', JSON.stringify(secondSegmentProgress) === beforeProgress)
} finally {
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    configurable: true,
  })
}

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)

function completeLessons(pathId: string, vibeId: ActiveGuidedVibeId, fromLesson: number, toLesson: number) {
  return getGuidedPathLessons(pathId)
    .filter((lesson) => lesson.lessonNumber >= fromLesson && lesson.lessonNumber <= toLesson)
    .reduce((state, definition) => (
      markTodayLessonComplete(state, resolveGuidedLessonVariant(definition, vibeId), minimalResult())
    ), createEmptyTodayProgressState())
}

function lessonNumber(lessonId: string) {
  const match = lessonId.match(/-(\d{3})-/)
  return match ? Number.parseInt(match[1]!, 10) : 0
}

function fixedRng() {
  let value = 0.29
  return () => {
    value = (value * 3.71) % 1
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

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
}

function sliceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0) return ''
  const endIndex = source.indexOf(end, startIndex)
  if (endIndex < 0) return ''
  return source.slice(startIndex, endIndex)
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
