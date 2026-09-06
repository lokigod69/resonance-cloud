import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRecallAttemptQueue, type RecallQueueRecord, type RecallQueueStorage } from '../src/lib/recallAttemptQueue'

class MemoryStorage implements RecallQueueStorage {
  records = new Map<string, RecallQueueRecord>()
  failPut = false
  async put(record: RecallQueueRecord) {
    if (this.failPut) throw new Error('disk full')
    this.records.set(record.key, structuredClone(record))
  }
  async list(userId: string) {
    return [...this.records.values()].filter(record => record.userId === userId)
  }
  async delete(key: string) { this.records.delete(key) }
}

const input = (userId: string, wordId = '11111111-1111-4111-8111-111111111111') => ({
  userId,
  wordId,
  knewIt: true,
  studyMode: 'flashcard',
  metadata: null,
  occurredAt: '2026-09-06T08:00:00.000Z',
});

{
  const storage = new MemoryStorage()
  const delivered: RecallQueueRecord[] = []
  const queue = createRecallAttemptQueue(storage, async record => { delivered.push(record); return 'delivered' }, () => assert.fail('unexpected failure'))
  queue.setUser('user-a')
  await queue.enqueue(input('user-a'))
  assert.equal(delivered.length, 1)
  assert.equal(storage.records.size, 0, 'acknowledged receipt is removed')
  assert.equal(delivered[0].occurredAt, input('user-a').occurredAt, 'offline occurrence time is preserved')
}

{
  const storage = new MemoryStorage()
  const seenTimes: string[] = []
  const queue = createRecallAttemptQueue(storage, async record => {
    seenTimes.push(record.occurredAt)
    return seenTimes.length === 1 ? { clockSkew: '2026-09-07T08:00:00.000Z' } : 'delivered'
  }, () => assert.fail('clock correction should retry once without a user-facing failure'))
  queue.setUser('user-a')
  await queue.enqueue(input('user-a'))
  assert.deepEqual(seenTimes, ['2026-09-06T08:00:00.000Z', '2026-09-07T08:00:00.000Z'])
  assert.equal(storage.records.size, 0, 'server clock correction is persisted and delivered with the same receipt')
}

{
  const storage = new MemoryStorage()
  let retries = 0
  const queue = createRecallAttemptQueue(storage, async () => { throw new Error('offline') }, () => { retries++ })
  queue.setUser('user-a')
  await queue.enqueue(input('user-a'))
  assert.equal(storage.records.size, 1, 'transient failure remains durable')
  assert.equal(retries, 1, 'transient failure is visible and recoverable')
  queue.setUser('user-b')
  await queue.drain()
  assert.equal(retries, 1, 'account switch does not drain the prior user queue')
}

{
  const storage = new MemoryStorage()
  let calls = 0
  let retryConflict: (() => void) | undefined
  const queue = createRecallAttemptQueue(storage, async () => (++calls === 1 ? 'conflict' : 'delivered'), retry => { retryConflict = retry })
  queue.setUser('user-a')
  await queue.enqueue(input('user-a'))
  assert.equal([...storage.records.values()][0]?.blocked, true, 'conflicting payload is not acknowledged')
  assert.ok(retryConflict, 'conflict exposes recovery')
  retryConflict!()
  await new Promise(resolve => setTimeout(resolve, 0))
  await queue.drain()
  assert.equal(storage.records.size, 0, 'recovery uses a fresh receipt and clears the blocked item')
}

{
  const storage = new MemoryStorage()
  await storage.put({ ...input('user-a'), key: 'user-a:old', receiptId: 'old', blocked: false })
  await storage.put({ ...input('user-a'), key: 'user-a:next', receiptId: 'next', wordId: '22222222-2222-4222-8222-222222222222', blocked: false })
  const delivered: string[] = []
  const queue = createRecallAttemptQueue(storage, async record => {
    delivered.push(record.receiptId)
    return record.receiptId === 'old' ? 'discarded' : 'delivered'
  }, () => assert.fail('deleted word should not poison the queue'))
  queue.setUser('user-a')
  await queue.drain()
  assert.deepEqual(delivered, ['old', 'next'], 'reload drains persisted receipts in occurrence order')
  assert.equal(storage.records.size, 0, 'missing/deleted word is terminal and does not starve the next attempt')
}

{
  const storage = new MemoryStorage()
  storage.failPut = true
  let notified = false
  const queue = createRecallAttemptQueue(storage, async () => 'delivered', () => { notified = true })
  queue.setUser('user-a')
  await assert.rejects(queue.enqueue(input('user-a')), /disk full/)
  assert.equal(notified, true, 'persistence failure is visible instead of silently advancing')
}

const migration = readFileSync(new URL('../supabase/migrations/20260907105000_idempotent_recall_attempt_receipts.sql', import.meta.url), 'utf8')
const rollbackIntegration = readFileSync(new URL('../supabase/tests/20260907105000_recall_attempt_receipt_integration_rollback.sql', import.meta.url), 'utf8')
assert.match(migration, /unique index[\s\S]*user_id, client_receipt_id/i)
assert.match(migration, /security invoker/i)
assert.match(migration, /auth\.uid\(\)/)
assert.match(migration, /id = p_word_id and user_id = v_user_id/)
assert.match(migration, /recall_receipt_conflict/)
assert.match(migration, /created_at, client_receipt_id[\s\S]*v_created_at, p_receipt_id/)
assert.match(rollbackIntegration, /Retry was not idempotent/)
assert.match(rollbackIntegration, /Conflicting payload was acknowledged/)
assert.match(rollbackIntegration, /Missing word was not terminally discarded/)
assert.match(rollbackIntegration, /Foreign-owned word was not rejected without disclosure/)
assert.match(rollbackIntegration, /Future occurrence did not return a bounded clock correction/)
assert.match(rollbackIntegration, /rollback;/i)

console.log('Recall attempt durable queue tests passed')
