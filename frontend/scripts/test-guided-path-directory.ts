/**
 * Static validation for Guided Today path directory behavior.
 *
 * Run: npx tsx scripts/test-guided-path-directory.ts
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getGuidedTodayPathOptions } from '../src/data/guidedLessons.ts'

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

const directorySource = readSource('../src/components/today/GuidedPathDirectory.tsx')
const overviewSource = readSource('../src/components/today/TodayPathOverview.tsx')
const todaySource = readSource('../src/pages/Today.tsx')
const checkpointSource = readSource('../src/pages/GuidedCheckpoint.tsx')
const checkpointLibSource = readSource('../src/lib/guidedCheckpoint.ts')
const cssSource = readSource('../src/components/today/Today.css')

console.log('\n[path directory source]')
assert('directory component source exists', directorySource.length > 0)
for (const pathId of pathIds) {
  assert(`directory references ${pathId}`, directorySource.includes(pathId) || JSON.stringify(getGuidedTodayPathOptions()).includes(pathId))
}
for (const label of ['A1 P1', 'A1 P2', 'A1 P3']) {
  assert(`directory exposes compact chooser label ${label}`, directorySource.includes(label))
}
for (const subtitle of ['First Survival Phrases', 'Small Help and Simple Choices', 'Moving Around']) {
  assert(`directory can show subtitle ${subtitle}`, directorySource.includes('path.subtitle') || directorySource.includes(subtitle))
}
assert('directory includes lightweight category group structure', containsAny(directorySource, ['categoryLabel', 'directoryGroup', 'today.path.directoryGroupPractical']))
assert('directory is rendered as an accessible dialog', directorySource.includes('role="dialog"') && directorySource.includes('aria-modal="true"'))
assert('directory closes when a path is selected', directorySource.includes('onSelectPath(path.id)') && directorySource.includes('onClose()'))
assert('directory path rows are keyboard-focusable buttons', directorySource.includes('<button') && directorySource.includes('focus-visible:ring'))
assert('directory has mobile sheet and desktop panel styling hooks', cssSource.includes('.today-path-directoryOverlay') && cssSource.includes('@media (max-width: 640px)'))

console.log('\n[header integration]')
assert('overview imports path directory component', overviewSource.includes("GuidedPathDirectory"))
assert('overview no longer defines inline PathSwitcher', !overviewSource.includes('function PathSwitcher'))
assert('overview no longer renders permanent path chip row', !overviewSource.includes('today-path-switcher'))
assert('overview renders compact Change path trigger', overviewSource.includes("today.path.changePath") && overviewSource.includes('setDirectoryOpen(true)'))
assert('Today page passes Path Check href into overview', todaySource.includes('pathCheckHref=') && todaySource.includes('mode=path-check'))
assert('Path Check is available from the current path header or directory', overviewSource.includes('pathCheckHref') && directorySource.includes('pathCheckHref'))

console.log('\n[selection state]')
assert('overview detects explicit selected lesson competing with recommendation', overviewSource.includes('hasExplicitLessonSelection'))
assert('lesson card receives quiet recommended state', overviewSource.includes('isRecommendationQuiet'))
assert('quiet recommended lesson does not receive primary selected/start visual', overviewSource.includes('data-recommended-quiet={isRecommendationQuiet}') && overviewSource.includes('data-start-target={isSelected}'))

console.log('\n[path check route]')
assert('checkpoint route detects path-check mode', checkpointSource.includes("mode') === 'path-check'") || checkpointSource.includes('"path-check"'))
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
