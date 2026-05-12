/**
 * Static validation for Guided Today Quick Review checkpoint localStorage records.
 *
 * Run: npx tsx scripts/test-checkpoint-storage.ts
 */

import {
  completeGuidedCheckpoint,
  getGuidedCheckpointCount,
  getNextGuidedCheckpointIndex,
  guidedCheckpointKey,
  readGuidedCheckpointRecord,
  type GuidedCheckpointReviewedItem,
} from '../src/lib/guidedCheckpoint.ts'

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

const originalWindow = globalThis.window
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: createMemoryStorage() },
  configurable: true,
})

try {
  console.log('\n[keys and counts]')
  assert('checkpoint key follows locked shape', guidedCheckpointKey('bright', 0) === 'guided_checkpoint_bright_0')
  assert('empty storage has zero Bright checkpoints', getGuidedCheckpointCount('bright') === 0)
  assert('first Bright checkpoint index is 0', getNextGuidedCheckpointIndex('bright') === 0)

  console.log('\n[completion write]')
  const firstItems = makeItems('bright', 8, [true, false, true, true, false, true, true, true])
  const firstRecord = completeGuidedCheckpoint('bright', firstItems, new Date('2026-05-12T00:00:00.000Z'))
  assert('completion writes index 0 record', window.localStorage.getItem(guidedCheckpointKey('bright', 0)) !== null)
  assert('completion record stores timestamp', firstRecord.completedAt === '2026-05-12T00:00:00.000Z', firstRecord)
  assert('completion record stores item count', firstRecord.itemsReviewed === 8, firstRecord)
  assert('completion record stores first-try total', firstRecord.itemsCorrectFirstTry === 6, firstRecord)
  assert('completion record stores item review flags', firstRecord.items[1]?.needsReview === true && firstRecord.items[0]?.needsReview === false, firstRecord.items)
  assert('read record round-trips the stored shape', readGuidedCheckpointRecord('bright', 0)?.itemsCorrectFirstTry === 6)
  assert('Bright count advances after first completion', getGuidedCheckpointCount('bright') === 1)
  assert('next Bright checkpoint index advances to 1', getNextGuidedCheckpointIndex('bright') === 1)
  assert('Wistful count is independent', getGuidedCheckpointCount('wistful') === 0)

  const secondRecord = completeGuidedCheckpoint('bright', makeItems('bright', 8), new Date('2026-05-12T00:01:00.000Z'))
  assert('second Bright completion writes index 1', window.localStorage.getItem(guidedCheckpointKey('bright', 1)) !== null)
  assert('second Bright completion uses independent timestamp', secondRecord.completedAt === '2026-05-12T00:01:00.000Z', secondRecord)
  assert('Bright count advances after second completion', getGuidedCheckpointCount('bright') === 2)
} finally {
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    configurable: true,
  })
}

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)

function makeItems(
  vibe: 'bright' | 'wistful' | 'sharp',
  count: number,
  correct = Array.from({ length: count }, () => true),
): GuidedCheckpointReviewedItem[] {
  return Array.from({ length: count }, (_, index) => ({
    lessonId: `lesson-${index + 1}`,
    pathId: 'english-a1-practical-1',
    vibe,
    firstTryCorrect: correct[index] ?? true,
    needsReview: !(correct[index] ?? true),
  }))
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
