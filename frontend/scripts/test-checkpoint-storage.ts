/**
 * Static validation for Guided Today Quick Review checkpoint localStorage records.
 *
 * Run: npx tsx scripts/test-checkpoint-storage.ts
 */

import {
  completeGuidedCheckpoint,
  getGuidedCheckpointCount,
  getNextGuidedCheckpointIndex,
  clearGuidedCheckpointDraft,
  guidedCheckpointDraftKey,
  guidedCheckpointKey,
  readGuidedCheckpointRecord,
  readGuidedCheckpointDraft,
  writeGuidedCheckpointDraft,
  type GuidedCheckpointDraft,
  type GuidedCheckpointReviewedItem,
  type GuidedCheckpointScope,
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
  const brightEnglish: GuidedCheckpointScope = { userId: 'user-a', targetLanguage: 'English', vibe: 'bright' }
  const brightSpanish: GuidedCheckpointScope = { userId: 'user-a', targetLanguage: 'Spanish', vibe: 'bright' }
  const otherUser: GuidedCheckpointScope = { userId: 'user-b', targetLanguage: 'English', vibe: 'bright' }
  console.log('\n[keys and counts]')
  assert('checkpoint key is account and target-language scoped', guidedCheckpointKey(brightEnglish, 0) === 'guided_checkpoint_v2_user-a_English_bright_0')
  assert('empty storage has zero Bright English checkpoints', getGuidedCheckpointCount(brightEnglish) === 0)
  assert('first Bright English checkpoint index is 0', getNextGuidedCheckpointIndex(brightEnglish) === 0)

  console.log('\n[completion write]')
  const firstItems = makeItems('bright', 8, [true, false, true, true, false, true, true, true])
  const first = completeGuidedCheckpoint(brightEnglish, 0, firstItems, new Date('2026-05-12T00:00:00.000Z'))
  const firstRecord = first.record
  assert('completion reports a saved index 0 record', first.saved && !first.alreadyCompleted)
  assert('completion writes its explicit index', window.localStorage.getItem(guidedCheckpointKey(brightEnglish, 0)) !== null)
  assert('completion record stores timestamp', firstRecord.completedAt === '2026-05-12T00:00:00.000Z', firstRecord)
  assert('completion record stores item count', firstRecord.itemsReviewed === 8, firstRecord)
  assert('completion record stores first-try total', firstRecord.itemsCorrectFirstTry === 6, firstRecord)
  assert('completion record stores item review flags', firstRecord.items[1]?.needsReview === true && firstRecord.items[0]?.needsReview === false, firstRecord.items)
  assert('read record round-trips the stored shape', readGuidedCheckpointRecord(brightEnglish, 0)?.itemsCorrectFirstTry === 6)
  assert('Bright English count advances after first completion', getGuidedCheckpointCount(brightEnglish) === 1)
  assert('next Bright English checkpoint index advances to 1', getNextGuidedCheckpointIndex(brightEnglish) === 1)
  assert('another account cannot see the record', getGuidedCheckpointCount(otherUser) === 0 && readGuidedCheckpointRecord(otherUser, 0) === undefined)
  assert('another target language cannot see the record', getGuidedCheckpointCount(brightSpanish) === 0 && readGuidedCheckpointRecord(brightSpanish, 0) === undefined)
  window.localStorage.setItem('guided_checkpoint_bright_9', JSON.stringify(firstRecord))
  assert('ambiguous legacy unscoped records are ignored', getGuidedCheckpointCount(brightEnglish) === 1)

  const duplicate = completeGuidedCheckpoint(brightEnglish, 0, makeItems('bright', 8), new Date('2026-05-12T00:01:00.000Z'))
  assert('repeating the same checkpoint identity is idempotent', duplicate.saved && duplicate.alreadyCompleted && duplicate.record.completedAt === firstRecord.completedAt)
  assert('idempotent completion does not consume the next checkpoint index', getGuidedCheckpointCount(brightEnglish) === 1)

  const second = completeGuidedCheckpoint(brightEnglish, 1, makeItems('bright', 8), new Date('2026-05-12T00:02:00.000Z'))
  assert('next explicit checkpoint writes index 1', window.localStorage.getItem(guidedCheckpointKey(brightEnglish, 1)) !== null)
  assert('second checkpoint uses independent timestamp', second.record.completedAt === '2026-05-12T00:02:00.000Z', second.record)
  assert('Bright English count advances after second checkpoint', getGuidedCheckpointCount(brightEnglish) === 2)

  console.log('\n[resume draft]')
  const draftScope = { ...brightEnglish, mode: 'checkpoint' as const, pathId: 'english-a1-practical-1' }
  const draft: GuidedCheckpointDraft = {
    schemaVersion: 1,
    mode: 'checkpoint',
    pathId: draftScope.pathId,
    targetLanguage: 'English',
    vibe: 'bright',
    checkpointIndex: 2,
    completedPathCount: 3,
    itemIndex: 1,
    phase: 'speak',
    planItems: makeItems('bright', 8).map(({ lessonId, pathId, vibe }) => ({ lessonId, pathId, vibe })),
    reviewedItems: makeItems('bright', 1),
    updatedAt: '2026-09-07T00:00:00.000Z',
  }
  assert('checkpoint draft key is account/language/route scoped', guidedCheckpointDraftKey(draftScope).includes('user-a_English_bright_checkpoint'))
  assert('compact checkpoint draft writes successfully', writeGuidedCheckpointDraft(draftScope, draft))
  assert('checkpoint draft restores the exact item and phase boundary', readGuidedCheckpointDraft(draftScope)?.itemIndex === 1 && readGuidedCheckpointDraft(draftScope)?.phase === 'speak')
  assert('another account cannot read a checkpoint draft', readGuidedCheckpointDraft({ ...draftScope, userId: 'user-b' }) === undefined)
  assert('checkpoint draft stores no typed answers or transcripts', !JSON.stringify(draft).includes('answer') && !JSON.stringify(draft).includes('transcript'))
  assert('checkpoint draft clears explicitly', clearGuidedCheckpointDraft(draftScope) && readGuidedCheckpointDraft(draftScope) === undefined)
  window.localStorage.setItem = () => { throw new Error('quota exceeded') }
  assert('checkpoint completion reports storage failure', !completeGuidedCheckpoint(brightEnglish, 2, makeItems('bright', 8)).saved)

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() { throw new Error('storage access denied') },
  })
  assert('a denied localStorage getter produces zero checkpoint count without throwing', getGuidedCheckpointCount(brightEnglish) === 0)
  assert('a denied localStorage getter cannot expose a checkpoint record', readGuidedCheckpointRecord(brightEnglish, 0) === undefined)
  assert('a denied localStorage getter reports checkpoint completion as unsaved', !completeGuidedCheckpoint(brightEnglish, 2, makeItems('bright', 8)).saved)
  assert('a denied localStorage getter cannot expose a checkpoint draft', readGuidedCheckpointDraft(draftScope) === undefined)
  assert('a denied localStorage getter reports checkpoint draft writes as unavailable', !writeGuidedCheckpointDraft(draftScope, draft))
  assert('a denied localStorage getter reports checkpoint draft clears as unavailable', !clearGuidedCheckpointDraft(draftScope))
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
