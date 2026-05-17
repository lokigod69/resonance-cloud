/**
 * Static validation for Guided Today path directory behavior.
 *
 * Run: npx tsx scripts/test-guided-path-directory.ts
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  getGuidedPathLessons,
  getGuidedPathOverview,
  getGuidedTodayPathOptions,
} from '../src/data/guidedLessons.ts'
import {
  buildGuidedCheckpointPlan,
  buildGuidedPathCheckPlan,
  buildGuidedSegmentReviewPlan,
} from '../src/lib/guidedCheckpoint.ts'
import { createEmptyTodayProgressState } from '../src/lib/todayProgress.ts'

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

const englishPathIds = getGuidedTodayPathOptions()
  .filter((path) => path.targetLanguage === 'English')
  .map((path) => path.id)
const pathIds = englishPathIds

const directorySource = readSource('../src/components/today/GuidedPathDirectory.tsx')
const pathLabelSource = readSource('../src/lib/guidedPathLabels.ts')
const overviewSource = readSource('../src/components/today/TodayPathOverview.tsx')
const todaySource = readSource('../src/pages/Today.tsx')
const checkpointSource = readSource('../src/pages/GuidedCheckpoint.tsx')
const checkpointLibSource = readSource('../src/lib/guidedCheckpoint.ts')
const cssSource = readSource('../src/components/today/Today.css')

console.log('\n[path directory source]')
assert('directory component source exists', directorySource.length > 0)
const directoryPathIds = unique(Array.from(directorySource.matchAll(/'english-a1-practical-\d+'/g), ([match]) => match.slice(1, -1)))
assert(
  'directory exposes every English A1 Practical path from metadata',
  englishPathIds.every((pathId) => directoryPathIds.includes(pathId))
    && directoryPathIds.every((pathId) => englishPathIds.includes(pathId)),
  { observed: directoryPathIds, expected: englishPathIds },
)
assert('directory does not expose future A1/A2 paths', !containsAny(directorySource, ['english-a1-practical-11', 'english-a2-', 'category-practice', 'language-expansion']))
for (const label of ['English A1 P1', 'English A1 P2', 'English A1 P3', 'English A1 P4', 'English A1 P5', 'English A1 P6', 'English A1 P7', 'English A1 P8', 'English A1 P9', 'English A1 P10']) {
  assert(`directory exposes compact chooser label ${label}`, pathLabelSource.includes(label))
}
assert('directory intentionally hides path subtitles', !directorySource.includes('path.subtitle'))
assert('directory shows compact progress instead of language or subtitle copy', directorySource.includes("t('today.path.compactProgress'") && !directorySource.includes('baseLanguage'))
assert('directory includes lightweight category group structure', containsAny(directorySource, ['categoryLabel', 'directoryGroup', 'today.path.directoryGroupPractical']))
assert('directory is rendered as an accessible dialog', directorySource.includes('role="dialog"') && directorySource.includes('aria-modal="true"'))
assert('directory closes when a path is selected', directorySource.includes('onSelectPath(path.id)') && directorySource.includes('onClose()'))
assert('directory path rows are keyboard-focusable buttons', directorySource.includes('<button') && directorySource.includes('focus-visible:ring'))
assert('directory has mobile sheet and desktop panel styling hooks', cssSource.includes('.today-path-directoryOverlay') && cssSource.includes('@media (max-width: 640px)'))

console.log('\n[exposed path behavior]')
const emptyProgress = createEmptyTodayProgressState()
for (const pathId of pathIds) {
  const lessons = getGuidedPathLessons(pathId)
  assert(`${pathId} has 10 lessons`, lessons.length === 10, lessons.length)
  assert(`${pathId} overview loads the same 10 lessons`, getGuidedPathOverview(pathId, emptyProgress, 'bright').lessons.length === 10)
  assert(`${pathId} Path Check samples only the selected path`, buildGuidedPathCheckPlan(pathId, 'sharp', fixedRng())?.items.every((item) => item.pathId === pathId) === true)
  for (const segment of [1, 2] as const) {
    const segmentPlan = buildGuidedSegmentReviewPlan(emptyProgress, pathId, segment, 'wistful', fixedRng())
    assert(`${pathId} Segment Review ${segment} has five lessons`, segmentPlan?.items.length === 5, segmentPlan)
    assert(`${pathId} Segment Review ${segment} samples only the selected path`, segmentPlan?.items.every((item) => item.pathId === pathId) === true, segmentPlan)
  }
}
assert('Quick Review remains unavailable with no completed path', buildGuidedCheckpointPlan(emptyProgress, 'bright', fixedRng()) === undefined)

console.log('\n[header integration]')
assert('overview imports path directory component', overviewSource.includes("GuidedPathDirectory"))
assert('overview no longer defines inline PathSwitcher', !overviewSource.includes('function PathSwitcher'))
assert('overview no longer renders permanent path chip row', !overviewSource.includes('today-path-switcher'))
assert('overview renders compact Change path trigger', overviewSource.includes("today.path.changePath") && overviewSource.includes('setDirectoryOpen(true)'))
assert('Today page passes Path Check href into overview', todaySource.includes('pathCheckHref=') && todaySource.includes('mode=path-check'))
assert('Today page reads selected path from validated query params', todaySource.includes('useSearchParams') && todaySource.includes("searchParams.get('path')") && todaySource.includes('resolveTodayPathId') && todaySource.includes('pathOptions.some'))
assert('Today page reads selected active vibe from query params', todaySource.includes("searchParams.get('vibe')") && todaySource.includes('resolveTodayVibeId'))
assert('Quick Review checkpoint link preserves current path and vibe for back navigation', todaySource.includes('path=${selectedPathId}') && todaySource.includes('vibe=${selectedVibeId}'))
assert('main Today header no longer renders Path Check as a visible action', !sliceBetween(overviewSource, '<div className="today-path-actions', '<GuidedPathDirectory').includes('today.path.pathCheck'))
assert('Path Check remains available from the path directory as a diagnostic action', overviewSource.includes('pathCheckHref') && directorySource.includes('pathCheckHref') && directorySource.includes('today.path.pathCheck'))

console.log('\n[selection state]')
assert('overview detects explicit selected lesson competing with recommendation', overviewSource.includes('hasExplicitLessonSelection'))
assert('lesson card receives quiet recommended state', overviewSource.includes('isRecommendationQuiet'))
assert('quiet recommended lesson does not receive primary selected/start visual', overviewSource.includes('data-recommended-quiet={isRecommendationQuiet}') && overviewSource.includes('data-start-target={isSelected}'))

console.log('\n[path check route]')
assert('checkpoint route detects path-check mode', checkpointSource.includes("checkpointMode === 'path-check'") || checkpointSource.includes('"path-check"'))
assert('checkpoint route uses Path Check plan builder', checkpointSource.includes('buildGuidedPathCheckPlan'))
assert('Path Check summary does not call checkpoint storage writer', checkpointSource.includes('createLocalCheckpointRecord') && checkpointSource.includes('isPathCheckMode'))
assert('checkpoint lib exports Path Check plan builder', checkpointLibSource.includes('export function buildGuidedPathCheckPlan'))
assert('Quick Review remains completion-gated', checkpointLibSource.includes('completedPathIds.length === 0') && checkpointSource.includes('buildGuidedCheckpointPlan(progress, selectedVibeId)'))

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function fixedRng() {
  let value = 0.31
  return () => {
    value = (value * 3.79) % 1
    return value
  }
}

function sliceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0) return ''
  const endIndex = source.indexOf(end, startIndex)
  if (endIndex < 0) return ''
  return source.slice(startIndex, endIndex)
}
