import assert from 'node:assert/strict'

import {
  type CleanupClient,
  type CleanupQueueRow,
  KEPT_NOTE,
  planStorageCleanup,
  processStorageCleanup,
} from '../api/_shared/storageCleanup.ts'

class FakeCleanupClient implements CleanupClient {
  rows: CleanupQueueRow[]
  removed: Array<{ bucket: string; objectPath: string }> = []
  completed: string[] = []
  failed: Array<{ id: string; message: string }> = []
  audits: Array<{ row: CleanupQueueRow; message: string }> = []
  claims: string[] = []
  failRemovalsFor = new Set<string>()
  referencedPaths = new Set<string>()
  notes: Array<{ id: string; note: string | undefined }> = []

  constructor(rows: CleanupQueueRow[]) {
    this.rows = rows.map(row => ({ ...row }))
  }

  async listCleanupRows(options: { statuses: Array<CleanupQueueRow['status']>; limit: number }) {
    return this.rows
      .filter(row => options.statuses.includes(row.status))
      .slice(0, options.limit)
  }

  async claimCleanupRow(id: string, statuses: Array<CleanupQueueRow['status']>) {
    const row = this.rows.find(item => item.id === id && statuses.includes(item.status))
    if (!row) return null
    row.status = 'processing'
    row.error_message = null
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
      row.processed_at = 'now'
    }
    this.completed.push(id)
    this.notes.push({ id, note })
  }

  async markCleanupFailed(id: string, message: string) {
    const row = this.rows.find(item => item.id === id)
    if (row) {
      row.status = 'failed'
      row.error_message = message
      row.processed_at = 'now'
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
    object_path: 'user/deck/word/video.mp4',
    source_table: 'words',
    source_id: crypto.randomUUID(),
    user_id: crypto.randomUUID(),
    status: 'pending',
    error_message: null,
    processed_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

await (async function deletesValidPendingRowsAndMarksComplete() {
  const valid = row({ id: 'valid-row', object_path: 'user/deck/word/video.mp4' })
  const client = new FakeCleanupClient([valid])

  const summary = await processStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10 })

  assert.deepEqual(client.claims, ['valid-row'])
  assert.deepEqual(client.removed, [{ bucket: 'videos', objectPath: 'user/deck/word/video.mp4' }])
  assert.deepEqual(client.completed, ['valid-row'])
  assert.equal(client.failed.length, 0)
  assert.deepEqual(summary, { scanned: 1, claimed: 1, completed: 1, kept: 0, failed: 0, skipped: 0 })
})()

await (async function keepsObjectsALiveWordStillReferences() {
  // A word deleted and re-created with the same text reuses the queued path.
  const reused = row({ id: 'reused-path', object_path: 'user/deck/word/video.mp4' })
  const orphan = row({ id: 'orphan', object_path: 'user/deck/gone/video.mp4' })
  const client = new FakeCleanupClient([reused, orphan])
  client.referencedPaths.add('user/deck/word/video.mp4')

  const summary = await processStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10 })

  assert.deepEqual(client.removed, [{ bucket: 'videos', objectPath: 'user/deck/gone/video.mp4' }])
  assert.deepEqual(client.notes, [{ id: 'reused-path', note: KEPT_NOTE }, { id: 'orphan', note: undefined }])
  assert.equal(summary.kept, 1)
  assert.equal(summary.completed, 1)
})()

await (async function previewWritesNothing() {
  const deletable = row({ id: 'deletable', object_path: 'user/deck/a/video.mp4' })
  const kept = row({ id: 'kept', object_path: 'user/deck/b/video.mp4' })
  const invalid = row({ id: 'invalid', object_path: '../escape.mp4' })
  const client = new FakeCleanupClient([deletable, kept, invalid])
  client.referencedPaths.add('user/deck/b/video.mp4')

  const plan = await planStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10 })

  assert.deepEqual(plan, { scanned: 3, deletable: 1, kept: 1, invalid: 1 })
  assert.deepEqual(client.claims, [])
  assert.deepEqual(client.removed, [])
  assert.deepEqual(client.completed, [])
  assert.deepEqual(client.failed, [])
  assert.ok(client.rows.every(item => item.status === 'pending'))
})()

await (async function rejectsUnsafeRowsWithoutCallingStorage() {
  const badBucket = row({ id: 'bad-bucket', bucket: 'avatars', object_path: 'user/deck/word/video.mp4' })
  const badPath = row({ id: 'bad-path', bucket: 'videos', object_path: '../escape.mp4' })
  const client = new FakeCleanupClient([badBucket, badPath])

  const summary = await processStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10 })

  assert.deepEqual(client.removed, [])
  assert.deepEqual(client.completed, [])
  assert.deepEqual(client.failed.map(item => item.id), ['bad-bucket', 'bad-path'])
  assert.equal(client.audits.length, 2)
  assert.equal(summary.completed, 0)
  assert.equal(summary.failed, 2)
})()

await (async function retriesFailedRows() {
  const retry = row({ id: 'retry-row', status: 'failed', object_path: 'user/deck/word/thumb.jpg' })
  const client = new FakeCleanupClient([retry])

  const summary = await processStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10 })

  assert.deepEqual(client.claims, ['retry-row'])
  assert.deepEqual(client.removed, [{ bucket: 'videos', objectPath: 'user/deck/word/thumb.jpg' }])
  assert.deepEqual(client.completed, ['retry-row'])
  assert.equal(summary.completed, 1)
})()

await (async function recordsStorageFailuresForAuditAndRetry() {
  const failing = row({ id: 'storage-failure', object_path: 'user/deck/word/video_b.mp4' })
  const client = new FakeCleanupClient([failing])
  client.failRemovalsFor.add('user/deck/word/video_b.mp4')

  const summary = await processStorageCleanup(client, { allowedBuckets: ['videos'], limit: 10 })

  assert.deepEqual(client.completed, [])
  assert.deepEqual(client.failed.map(item => item.id), ['storage-failure'])
  assert.match(client.failed[0].message, /remove failed/)
  assert.equal(client.audits.length, 1)
  assert.equal(summary.failed, 1)
})()

console.log('Phase 1G storage cleanup tests passed')
