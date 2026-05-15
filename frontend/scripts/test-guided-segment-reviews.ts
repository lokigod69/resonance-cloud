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
import {
  getGuidedSegmentSceneForLesson,
  getGuidedSegmentStory,
} from '../src/lib/guidedSegmentStories.ts'
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
  'english-a1-practical-4',
  'english-a1-practical-5',
]
const segmentStoryPathIds = pathIds

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
assert('review tiles are always rendered as clickable links', sliceBetween(overviewSource, 'function SegmentReviewTile', 'function RecommendedLessonPanel').includes('<Link') && !sliceBetween(overviewSource, 'function SegmentReviewTile', 'function RecommendedLessonPanel').includes('if (!isAvailable)'))
assert('review tiles no longer render visible progress text', !sliceBetween(overviewSource, 'function SegmentReviewTile', 'function RecommendedLessonPanel').includes('/5'))
assert('review tiles no longer render visible lock or not-ready state', !containsAny(sliceBetween(overviewSource, 'function SegmentReviewTile', 'function RecommendedLessonPanel'), ['aria-disabled', 'today.path.notReadyYet', '<Lock', 'today.path.startReview']))
assert('review assets are referenced by active vibe as WebPs', overviewSource.includes('${selectedVibeId}-review.webp') && overviewSource.includes('/guided/reviews/${assetName}'))
assert('review tile references complete WebP asset from segment review completion state', overviewSource.includes('readGuidedSegmentReviewRecord') && overviewSource.includes('${selectedVibeId}-review-complete.webp') && overviewSource.includes('data-review-complete'))
assert('review tiles no longer reference PNG review assets', !overviewSource.includes('-review.png'))
assert('CSS defines separated segment review tile styling', cssSource.includes('.today-segment-reviewTile') && cssSource.includes('.today-path-segmentGrid'))
assert('CSS constrains review banner size and keeps it object-contained', cssSource.includes('.today-segment-reviewImage') && cssSource.includes('max-height: 5.75rem') && cssSource.includes('max-width: min(100%, 42rem)') && cssSource.includes('object-fit: contain'))

console.log('\n[assets]')
for (const vibeId of ['bright', 'wistful', 'sharp'] as const) {
  const assetPath = fileURLToPath(new URL(`../public/guided/reviews/${vibeId}-review.webp`, import.meta.url))
  const completeAssetPath = fileURLToPath(new URL(`../public/guided/reviews/${vibeId}-review-complete.webp`, import.meta.url))
  const sourceAssetPath = fileURLToPath(new URL(`../public/guided/reviews/source/${vibeId}-review-source.webp`, import.meta.url))
  const completeSourceAssetPath = fileURLToPath(new URL(`../public/guided/reviews/source/${vibeId}-review-complete-source.webp`, import.meta.url))
  assert(`${vibeId} review asset exists`, existsSync(assetPath), assetPath)
  assert(`${vibeId} complete review asset exists`, existsSync(completeAssetPath), completeAssetPath)
  assert(`${vibeId} source review asset exists`, existsSync(sourceAssetPath), sourceAssetPath)
  assert(`${vibeId} complete source review asset exists`, existsSync(completeSourceAssetPath), completeSourceAssetPath)
  for (const [label, path] of [
    ['review asset', assetPath],
    ['complete review asset', completeAssetPath],
    ['source review asset', sourceAssetPath],
    ['complete source review asset', completeSourceAssetPath],
  ] as const) {
    if (!existsSync(path)) continue
    const bytes = readFileSync(path)
    assert(`${vibeId} ${label} is a WebP file`, bytes.subarray(0, 4).equals(Buffer.from('RIFF')) && bytes.subarray(8, 12).equals(Buffer.from('WEBP')))
    assert(`${vibeId} ${label} has a compact file size`, bytes.length > 25_000 && bytes.length < 250_000, bytes.length)
  }
}

for (let lessonNumber = 1; lessonNumber <= 10; lessonNumber += 1) {
  const assetPath = fileURLToPath(new URL(`../public/guided/lesson-numbers/bright/${String(lessonNumber).padStart(2, '0')}.webp`, import.meta.url))
  assert(`bright lesson number ${lessonNumber} asset exists`, existsSync(assetPath), assetPath)
  if (!existsSync(assetPath)) continue
  const bytes = readFileSync(assetPath)
  assert(`bright lesson number ${lessonNumber} asset is WebP`, bytes.subarray(0, 4).equals(Buffer.from('RIFF')) && bytes.subarray(8, 12).equals(Buffer.from('WEBP')))
  assert(`bright lesson number ${lessonNumber} asset stays small`, bytes.length > 2_000 && bytes.length < 20_000, bytes.length)
}

for (let lessonNumber = 1; lessonNumber <= 10; lessonNumber += 1) {
  const assetPath = fileURLToPath(new URL(`../public/guided/lesson-numbers/wistful/${String(lessonNumber).padStart(2, '0')}.webp`, import.meta.url))
  assert(`wistful lesson number ${lessonNumber} asset exists`, existsSync(assetPath), assetPath)
  if (!existsSync(assetPath)) continue
  const bytes = readFileSync(assetPath)
  assert(`wistful lesson number ${lessonNumber} asset is WebP`, bytes.subarray(0, 4).equals(Buffer.from('RIFF')) && bytes.subarray(8, 12).equals(Buffer.from('WEBP')))
  assert(`wistful lesson number ${lessonNumber} asset stays small`, bytes.length > 1_000 && bytes.length < 20_000, bytes.length)
}

for (let lessonNumber = 1; lessonNumber <= 10; lessonNumber += 1) {
  const assetPath = fileURLToPath(new URL(`../public/guided/lesson-numbers/sharp/${String(lessonNumber).padStart(2, '0')}.webp`, import.meta.url))
  assert(`sharp lesson number ${lessonNumber} asset exists`, existsSync(assetPath), assetPath)
  if (!existsSync(assetPath)) continue
  const bytes = readFileSync(assetPath)
  assert(`sharp lesson number ${lessonNumber} asset is WebP`, bytes.subarray(0, 4).equals(Buffer.from('RIFF')) && bytes.subarray(8, 12).equals(Buffer.from('WEBP')))
  assert(`sharp lesson number ${lessonNumber} asset stays small`, bytes.length > 1_000 && bytes.length < 20_000, bytes.length)
}

console.log('\n[plan selection]')
for (const pathId of pathIds) {
  for (const segment of [1, 2] as const) {
    const expectedLessonNumbers = segment === 1 ? [1, 2, 3, 4, 5] : [6, 7, 8, 9, 10]
    const plan = buildGuidedSegmentReviewPlan(createEmptyTodayProgressState(), pathId, segment, 'bright', fixedRng())
    assert(`${pathId} Review ${segment} builds all five segment lessons without completion progress`, plan?.items.length === 5, plan)
    assert(`${pathId} Review ${segment} records the selected segment`, plan?.segment === segment, plan)
    assert(`${pathId} Review ${segment} samples only selected path`, plan?.items.every((item) => item.pathId === pathId) === true, plan)
    assert(`${pathId} Review ${segment} samples only lessons ${expectedLessonNumbers[0]}-${expectedLessonNumbers[4]}`, plan?.items.every((item) => expectedLessonNumbers.includes(lessonNumber(item.lessonId))) === true, plan?.items.map((item) => item.lessonId))
    assert(`${pathId} Review ${segment} keeps lessons in story order`, JSON.stringify(plan?.items.map((item) => lessonNumber(item.lessonId))) === JSON.stringify(expectedLessonNumbers), plan?.items.map((item) => item.lessonId))
    assert(`${pathId} Review ${segment} items have Type Recall cloze data`, plan?.items.every((item) => item.lesson.typeRecall.before !== undefined && item.lesson.typeRecall.after !== undefined && item.lesson.typeRecall.answer.length > 0) === true, plan)
    assert(`${pathId} Review ${segment} items have German cue data`, plan?.items.every((item) => item.lesson.corePhrase.baseText.length > 0) === true, plan)
    assert(`${pathId} Review ${segment} items have Speak cue data`, plan?.items.every((item) => item.lesson.speak.baseCue.length > 0 && item.lesson.speak.language.length > 0) === true, plan)
  }
}

const secondSegmentProgress = createEmptyTodayProgressState()
const secondSegmentPlan = buildGuidedSegmentReviewPlan(secondSegmentProgress, pathIds[3]!, 2, 'sharp', fixedRng())
assert('Review 2 builds all five segment lessons without completion progress', secondSegmentPlan?.items.length === 5, secondSegmentPlan)
assert('Review 2 samples only A1 Practical 4 when selected', secondSegmentPlan?.items.every((item) => item.pathId === pathIds[3]) === true, secondSegmentPlan)
assert('Review 2 samples only lessons 6-10', secondSegmentPlan?.items.every((item) => lessonNumber(item.lessonId) >= 6 && lessonNumber(item.lessonId) <= 10) === true, secondSegmentPlan?.items.map((item) => item.lessonId))
assert('Review 2 keeps lessons in story order 6-10', JSON.stringify(secondSegmentPlan?.items.map((item) => lessonNumber(item.lessonId))) === JSON.stringify([6, 7, 8, 9, 10]), secondSegmentPlan?.items.map((item) => item.lessonId))
assert('Segment Review preserves selected active vibe', secondSegmentPlan?.items.every((item) => item.vibe === 'sharp') === true, secondSegmentPlan)
assert('Segment Review samples the full segment even when only two lessons are complete', buildGuidedSegmentReviewPlan(completeLessons(pathIds[0]!, 'bright', 1, 2), pathIds[0]!, 1, 'bright', fixedRng())?.items.length === 5)
assert('Segment Review is available with no completed lessons in the selected segment/vibe', buildGuidedSegmentReviewPlan(createEmptyTodayProgressState(), pathIds[0]!, 1, 'bright', fixedRng())?.items.length === 5)
assert('A1 Practical 5 Segment Review is available with no completed lessons in the selected segment/vibe', buildGuidedSegmentReviewPlan(createEmptyTodayProgressState(), pathIds[4]!, 2, 'wistful', fixedRng())?.items.length === 5)
assert('Segment Review rejects unknown segment ids', buildGuidedSegmentReviewPlan(secondSegmentProgress, pathIds[0]!, 3, 'sharp', fixedRng()) === undefined)

console.log('\n[segment story scaffold]')
for (const pathId of segmentStoryPathIds) {
  for (const segment of [1, 2] as const) {
    const story = getGuidedSegmentStory(pathId, segment)
    assert(`${pathId} segment ${segment} has a story title`, typeof story?.title === 'string' && story.title.length > 0)
    assert(`${pathId} segment ${segment} has a story intro`, typeof story?.intro === 'string' && story.intro.length > 0)
    assert(`${pathId} segment ${segment} has five beats`, story?.beats.length === 5, story?.beats)
    const expectedLessonNumbers = segment === 1 ? [1, 2, 3, 4, 5] : [6, 7, 8, 9, 10]
    assert(
      `${pathId} segment ${segment} beats cover all five lesson numbers in order`,
      JSON.stringify(story?.beats.map((beat) => beat.lessonNumber)) === JSON.stringify(expectedLessonNumbers),
      story?.beats.map((beat) => beat.lessonNumber),
    )
    for (const lessonNumberInSegment of expectedLessonNumbers) {
      const scene = getGuidedSegmentSceneForLesson(pathId, segment, lessonNumberInSegment)
      assert(`${pathId} segment ${segment} lesson ${lessonNumberInSegment} has a scene line`, typeof scene === 'string' && scene.length > 0)
    }
  }
}
assert('unknown path has no segment story (falls back gracefully)', getGuidedSegmentStory('english-a1-practical-99', 1) === undefined)
assert('A1 Practical 4 Segment Review route uses story copy', getGuidedSegmentStory(pathIds[3]!, 1) !== undefined && buildGuidedSegmentReviewPlan(createEmptyTodayProgressState(), pathIds[3]!, 1, 'bright', fixedRng())?.items.length === 5)
assert('A1 Practical 5 Segment Review route uses story copy', getGuidedSegmentStory(pathIds[4]!, 2) !== undefined && buildGuidedSegmentReviewPlan(createEmptyTodayProgressState(), pathIds[4]!, 2, 'sharp', fixedRng())?.items.length === 5)

console.log('\n[route and prompt]')
assert('checkpoint route detects segment-review mode', checkpointSource.includes('mode') && checkpointSource.includes('segment-review'))
assert('checkpoint route uses Segment Review plan builder', checkpointSource.includes('buildGuidedSegmentReviewPlan'))
assert('Segment Review completion does not call normal checkpoint storage writer', checkpointSource.includes('completeGuidedSegmentReview') && checkpointSource.includes('isSegmentReviewMode') && checkpointSource.includes('completeGuidedCheckpoint(selectedVibeId'))
assert('Segment Review type step uses Type Recall before/input/after shape', checkpointSource.includes('item.lesson.typeRecall.before') && checkpointSource.includes('item.lesson.typeRecall.after'))
assert('Segment Review type step handles empty-before and empty-after layouts', checkpointSource.includes('data-empty-before={!hasBefore}') && checkpointSource.includes('data-empty-after={!hasAfter}'))
assert('Enter key can continue after type feedback', checkpointSource.includes('KeyboardEvent<HTMLFormElement>') && checkpointSource.includes("event.key !== 'Enter'") && checkpointSource.includes('onAdvance()'))
assert('Segment Review type action continues with Weiter instead of Speak', checkpointSource.includes("t('today.checkpoint.next')") && !sliceBetween(checkpointSource, 'function CheckpointTypeStep', 'function TypeRecallPhrase').includes("t('today.checkpoint.speak')"))
assert('Speak step removes non-evaluation copy and extra cue label', !checkpointSource.includes('Sprechen wird hier nicht bewertet') && !sliceBetween(checkpointSource, 'function CheckpointSpeakStep', 'function CheckpointSummary').includes('today.checkpoint.speakCue'))
assert('completion summary includes missed-item review data', checkpointSource.includes('getMissedSummaryItems') && checkpointSource.includes('today.checkpoint.practiceAgainTitle') && checkpointSource.includes('item.lesson.typeRecall.answer'))
assert('Segment Review prompt uses the dedicated phrase completion copy', checkpointSource.includes('today.checkpoint.segmentTypePrompt'))
assert('Segment Review shows German cue separately', checkpointSource.includes('today.checkpoint.germanCue') && checkpointSource.includes('item.lesson.corePhrase.baseText'))
assert('Path Check keeps a diagnostic label', checkpointSource.includes('today.checkpoint.pathCheckDiagnostic') || checkpointSource.includes('pathCheckHeading'))
assert('checkpoint lib exports Segment Review plan builder', checkpointLibSource.includes('export function buildGuidedSegmentReviewPlan'))
assert('Segment Review imports the story scaffold helpers', checkpointSource.includes("from '@/lib/guidedSegmentStories'") && checkpointSource.includes('getGuidedSegmentStory') && checkpointSource.includes('getGuidedSegmentSceneForLesson'))
assert('Segment Review renders the story intro in the header', checkpointSource.includes('data-segment-story-intro') && checkpointSource.includes('segmentStory.intro'))
assert('Segment Review renders the per-lesson scene line above the phrase', checkpointSource.includes('data-segment-story-scene') && checkpointSource.includes('segmentScene'))
assert('Segment Review type input uses the new "Fehlenden Teil einsetzen" placeholder key', checkpointSource.includes('today.checkpoint.segmentInputPlaceholder'))
assert('Segment Review compact feedback only renders the answer pill on wrong, no big correctFirstTry banner', !sliceBetween(checkpointSource, 'function CheckpointTypeStep', 'function TypeRecallPhrase').includes("t('today.checkpoint.correctFirstTry')"))

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
  const record = completeGuidedSegmentReview(pathIds[3]!, 2, 'sharp', reviewed, new Date('2026-05-13T00:00:00.000Z'))
  assert('Segment Review writes a separate local summary key', window.localStorage.getItem(guidedSegmentReviewKey(pathIds[3]!, 2, 'sharp')) !== null)
  assert('Segment Review record round-trips from storage', readGuidedSegmentReviewRecord(pathIds[3]!, 2, 'sharp')?.itemsReviewed === record.itemsReviewed)
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
