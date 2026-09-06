/** Behavioral checks for account/language-scoped Guided checkpoint planning. */

import {
  getGuidedPathLessons,
  getGuidedTodayPathOptions,
  loadGuidedLessonsForLanguage,
  resolveGuidedLessonVariant,
} from '../src/data/guidedLessons.ts'
import {
  buildGuidedCheckpointPlan,
  countCompletedGuidedCheckpointPaths,
  hasPendingGuidedCheckpoint,
} from '../src/lib/guidedCheckpoint.ts'
import {
  createEmptyTodayProgressState,
  markTodayLessonComplete,
  type TodayLessonResult,
} from '../src/lib/todayProgress.ts'

await Promise.all([
  loadGuidedLessonsForLanguage('English'),
  loadGuidedLessonsForLanguage('Spanish'),
])

let failures = 0
let passes = 0
const assert = (name: string, condition: boolean, detail?: unknown) => {
  if (condition) {
    passes += 1
    console.log(`  ok  ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}`, detail ?? '')
  }
}

const englishPath = getGuidedTodayPathOptions().find((path) => path.targetLanguage === 'English')
const spanishPath = getGuidedTodayPathOptions().find((path) => path.targetLanguage === 'Spanish')
if (!englishPath || !spanishPath) throw new Error('Expected English and Spanish guided paths.')

let progress = createEmptyTodayProgressState()
for (const pathId of [englishPath.id, spanishPath.id]) {
  for (const definition of getGuidedPathLessons(pathId)) {
    progress = markTodayLessonComplete(progress, resolveGuidedLessonVariant(definition, 'bright'), minimalResult())
  }
}

const originalWindow = globalThis.window
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: createMemoryStorage() },
  configurable: true,
})

try {
  const englishScope = { userId: 'user-a', targetLanguage: 'English' as const, vibe: 'bright' as const }
  const spanishScope = { userId: 'user-a', targetLanguage: 'Spanish' as const, vibe: 'bright' as const }
  const otherUserScope = { ...englishScope, userId: 'user-b' }
  const englishPlan = buildGuidedCheckpointPlan(progress, englishScope, () => 0.25)
  const spanishPlan = buildGuidedCheckpointPlan(progress, spanishScope, () => 0.25)

  assert('English completed-path count excludes Spanish paths', countCompletedGuidedCheckpointPaths(progress, 'English', 'bright') === 1)
  assert('Spanish completed-path count excludes English paths', countCompletedGuidedCheckpointPaths(progress, 'Spanish', 'bright') === 1)
  assert('English checkpoint contains only English lessons', englishPlan?.items.length === 8 && englishPlan.items.every((item) => item.lesson.targetLanguage === 'English'), englishPlan?.items)
  assert('Spanish checkpoint contains only Spanish lessons', spanishPlan?.items.length === 8 && spanishPlan.items.every((item) => item.lesson.targetLanguage === 'Spanish'), spanishPlan?.items)
  assert('each account independently earns its pending checkpoint', hasPendingGuidedCheckpoint(progress, englishScope) && hasPendingGuidedCheckpoint(progress, otherUserScope))
  assert('language scopes independently earn pending checkpoints', hasPendingGuidedCheckpoint(progress, englishScope) && hasPendingGuidedCheckpoint(progress, spanishScope))
} finally {
  Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true })
}

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)

function minimalResult(): TodayLessonResult {
  return { buildAttempts: 1, typeAttempts: 1 }
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear() { values.clear() },
    getItem(key: string) { return values.get(key) ?? null },
    key(index: number) { return Array.from(values.keys())[index] ?? null },
    removeItem(key: string) { values.delete(key) },
    setItem(key: string, value: string) { values.set(key, value) },
  }
}
