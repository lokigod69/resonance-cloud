import assert from 'node:assert/strict'
import fs from 'node:fs'

import {
  type CleanupClient,
  type CleanupQueueRow,
  type ListOptions,
  KEPT_NOTE,
  PROTECTED_PATH_PREFIXES,
  planStorageCleanup,
  processStorageCleanup,
  validateQueuedObject,
} from '../api/_shared/storageCleanup.ts'

const USER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const DECK = '33333333-3333-4333-8333-333333333333'

class FakeCleanupClient implements CleanupClient {
  rows: CleanupQueueRow[]
  removed: Array<{ bucket: string; objectPath: string }> = []
  completed: string[] = []
  failed: Array<{ id: string; message: string }> = []
  audits: Array<{ row: CleanupQueueRow; message: string }> = []
  claims: string[] = []
  notes: Array<{ id: string; note: string | undefined }> = []
  failRemovalsFor = new Set<string>()
  referencedPaths = new Set<string>()

  constructor(rows: CleanupQueueRow[]) {
    this.rows = rows.map(row => ({ ...row }))
  }

  private eligible(row: CleanupQueueRow, options: ListOptions) {
    return options.statuses.includes(row.status)
      || (row.status === 'processing' && (row.processed_at ?? '') < options.staleProcessingBefore)
  }

  async listCleanupRows(options: ListOptions) {
    return this.rows.filter(row => this.eligible(row, options)).slice(0, options.limit)
  }

  async claimCleanupRow(id: string, options: ListOptions) {
    const row = this.rows.find(item => item.id === id && this.eligible(item, options))
    if (!row) return null
    row.status = 'processing'
    row.error_message = null
    row.processed_at = new Date().toISOString()
    this.claims.push(id)
    return { ...row }
  }

  async isObjectReferenced(queued: CleanupQueueRow) {
    return this.referencedPaths.has(queued.object_path)
  }

  async removeStorageObject(bucket: string, objectPath: string) {
    this.removed.push({ bucket, objectPath })
    if (this.failRemovalsFor.has(objectPath)) {
      throw new Error(`remove failed for ${objectPath}`)
    }
  }

  async markCleanupComplete(id: string, note?: string) {
    const row = this.rows.find(item => item.id === id)
    if (row) {
      row.status = 'complete'
      row.error_message = note ?? null
    }
    this.completed.push(id)
    this.notes.push({ id, note })
  }

  async markCleanupFailed(id: string, message: string) {
    const row = this.rows.find(item => item.id === id)
    if (row) {
      row.status = 'failed'
      row.error_message = message
    }
    this.failed.push({ id, message })
  }

  async auditCleanupFailure(row: CleanupQueueRow, message: string) {
    this.audits.push({ row, message })
  }
}

function row(overrides: Partial<CleanupQueueRow>): CleanupQueueRow {
  return {
    id: crypto.randomUUID(),
    bucket: 'videos',
    object_path: `${USER}/${DECK}/word/video.mp4`,
    source_table: 'words',
    source_id: crypto.randomUUID(),
    user_id: USER,
    status: 'pending',
    error_message: null,
    processed_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

await (async function deletesValidPendingRowsAndMarksComplete() {
  const valid = row({ id: 'valid-row' })
  const client = new FakeCleanupClient([valid])

  const summary = await processStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10 })

  assert.deepEqual(client.claims, ['valid-row'])
  assert.deepEqual(client.removed, [{ bucket: 'videos', objectPath: `${USER}/${DECK}/word/video.mp4` }])
  assert.deepEqual(client.completed, ['valid-row'])
  assert.deepEqual(summary, { scanned: 1, claimed: 1, completed: 1, kept: 0, failed: 0, skipped: 0, stopped_early: false })
})()

await (async function rejectsUnsafeRowsWithoutCallingStorage() {
  const badBucket = row({ id: 'bad-bucket', bucket: 'avatars' })
  const badPath = row({ id: 'bad-path', object_path: '../escape.mp4' })
  const client = new FakeCleanupClient([badBucket, badPath])

  const summary = await processStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10 })

  assert.deepEqual(client.removed, [])
  assert.deepEqual(client.failed.map(item => item.id), ['bad-bucket', 'bad-path'])
  assert.equal(client.audits.length, 2)
  assert.equal(summary.failed, 2)
})()

await (async function neverDeletesAnotherUsersOrSharedFiles() {
  // A word can carry any https URL; deleting it must not remove the target.
  const foreign = row({ id: 'foreign', object_path: `${OTHER}/${DECK}/word/video.mp4` })
  const ownerless = row({ id: 'ownerless', user_id: null })
  const guided = row({ id: 'guided', object_path: 'guided-today/de/a1/lesson.mp4' })
  const showcase = PROTECTED_PATH_PREFIXES[1]
  const landing = row({ id: 'landing', user_id: showcase.split('/')[0], object_path: `${showcase}word/thumb.jpg` })
  const client = new FakeCleanupClient([foreign, ownerless, guided, landing])

  const summary = await processStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10 })

  assert.deepEqual(client.removed, [])
  assert.equal(summary.failed, 4)
  assert.match(client.failed.find(item => item.id === 'foreign')!.message, /outside the owning user folder/)
  assert.match(client.failed.find(item => item.id === 'ownerless')!.message, /no owning user/)
  assert.match(client.failed.find(item => item.id === 'landing')!.message, /protected shared asset/)
})()

await (async function failedRowsAreTerminalForTheCron() {
  const retry = row({ id: 'retry-row', status: 'failed' })
  const client = new FakeCleanupClient([retry])

  const cron = await processStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10 })
  assert.equal(cron.scanned, 0)
  assert.equal(client.audits.length, 0)

  const manual = await processStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10, statuses: ['pending', 'failed'] })
  assert.equal(manual.completed, 1)
})()

await (async function reclaimsRowsStuckInProcessing() {
  const stale = row({ id: 'stale', status: 'processing', processed_at: '2026-01-01T00:00:00.000Z' })
  const fresh = row({ id: 'fresh', status: 'processing', processed_at: new Date().toISOString() })
  const client = new FakeCleanupClient([stale, fresh])

  const summary = await processStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10 })

  assert.deepEqual(client.claims, ['stale'])
  assert.equal(summary.completed, 1)
})()

await (async function recordsStorageFailuresForAudit() {
  const failing = row({ id: 'storage-failure', object_path: `${USER}/${DECK}/word/video_b.mp4` })
  const client = new FakeCleanupClient([failing])
  client.failRemovalsFor.add(failing.object_path)

  const summary = await processStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10 })

  assert.deepEqual(client.failed.map(item => item.id), ['storage-failure'])
  assert.match(client.failed[0].message, /remove failed/)
  assert.equal(summary.failed, 1)
})()

await (async function keepsObjectsALiveWordStillReferences() {
  const reused = row({ id: 'reused-path', object_path: `${USER}/${DECK}/word/video.mp4` })
  const orphan = row({ id: 'orphan', object_path: `${USER}/${DECK}/gone/video.mp4` })
  const client = new FakeCleanupClient([reused, orphan])
  client.referencedPaths.add(reused.object_path)

  const summary = await processStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10 })

  assert.deepEqual(client.removed, [{ bucket: 'videos', objectPath: orphan.object_path }])
  assert.deepEqual(client.notes, [{ id: 'reused-path', note: KEPT_NOTE }, { id: 'orphan', note: undefined }])
  assert.equal(summary.kept, 1)
})()

await (async function stopsWhenTheTimeBudgetRunsOut() {
  const client = new FakeCleanupClient([row({ id: 'a' }), row({ id: 'b' }), row({ id: 'c' })])
  let checks = 0
  const summary = await processStorageCleanup(client, {
    allowedBuckets: ['videos'],
    limit: 10,
    shouldContinue: () => ++checks <= 1,
  })
  assert.equal(summary.claimed, 1)
  assert.equal(summary.stopped_early, true)
  assert.equal(client.rows.filter(item => item.status === 'pending').length, 2)
})()

await (async function previewWritesNothing() {
  const deletable = row({ id: 'deletable', object_path: `${USER}/${DECK}/a/video.mp4` })
  const kept = row({ id: 'kept', object_path: `${USER}/${DECK}/b/video.mp4` })
  const invalid = row({ id: 'invalid', object_path: `${OTHER}/${DECK}/c/video.mp4` })
  const client = new FakeCleanupClient([deletable, kept, invalid])
  client.referencedPaths.add(kept.object_path)

  const plan = await planStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10 })

  assert.deepEqual(plan, { scanned: 3, deletable: 1, kept: 1, invalid: 1, stopped_early: false })
  assert.deepEqual(client.claims, [])
  assert.deepEqual(client.removed, [])
  assert.deepEqual(client.completed, [])
  assert.deepEqual(client.failed, [])
  assert.ok(client.rows.every(item => item.status === 'pending'))
})()

;(function protectedPrefixesCoverEveryLandingShowcaseDeck() {
  const source = fs.readFileSync(new URL('../src/components/landing/landingData.ts', import.meta.url), 'utf8')
  const ids = new Map([...source.matchAll(/^const (U\d+|D_[A-Z0-9_]+) = '([0-9a-f-]{36})'/gm)].map(match => [match[1], match[2]]))
  const pairs = new Set([...source.matchAll(/thumb\((U\d+), (D_[A-Z0-9_]+)/g)].map(match => `${ids.get(match[1])}/${ids.get(match[2])}/`))
  assert.ok(pairs.size > 0, 'landingData.ts showcase thumbnails found')
  for (const prefix of pairs) {
    assert.ok(PROTECTED_PATH_PREFIXES.includes(prefix), `landing showcase deck ${prefix} is protected`)
  }
  assert.equal(validateQueuedObject(row({ object_path: `${USER}/${DECK}/w/a"b.mp4` }), new Set(['videos'])), 'Object path contains unsafe characters')
})()

console.log('Storage cleanup tests passed')
