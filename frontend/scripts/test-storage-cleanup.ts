import assert from 'node:assert/strict'

import {
  type CleanupClient,
  type CleanupQueueRow,
  processStorageCleanup,
} from './process-storage-cleanup.ts'

class FakeCleanupClient implements CleanupClient {
  rows: CleanupQueueRow[]
  removed: Array<{ bucket: string; objectPath: string }> = []
  completed: string[] = []
  failed: Array<{ id: string; message: string }> = []
  audits: Array<{ row: CleanupQueueRow; message: string }> = []
  claims: string[] = []
  failRemovalsFor = new Set<string>()

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

  async removeStorageObject(bucket: string, objectPath: string) {
    this.removed.push({ bucket, objectPath })
    if (this.failRemovalsFor.has(objectPath)) {
      throw new Error(`remove failed for ${objectPath}`)
    }
  }

  async markCleanupComplete(id: string) {
    const row = this.rows.find(item => item.id === id)
    if (row) {
      row.status = 'complete'
      row.error_message = null
      row.processed_at = 'now'
    }
    this.completed.push(id)
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
  assert.deepEqual(summary, { scanned: 1, claimed: 1, completed: 1, failed: 0, skipped: 0 })
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
