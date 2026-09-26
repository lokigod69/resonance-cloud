// api/_shared/storageCleanup.ts
//
// Drains public.storage_cleanup_queue: storage objects that deleted words
// left behind (enqueued by the phase1e delete RPC and the card-thumbnail
// trigger). Shared by the daily maintenance cron (api/analytics-deletion-sweep.ts)
// and the manual CLI (scripts/process-storage-cleanup.ts).
//
// Safety: only allow-listed buckets, only relative traversal-free paths, and
// never an object a live `words` row still points at — paths are built from
// user/deck/word text, so a word deleted and re-created with the same text
// reuses the queued path for its new media.

import type { SupabaseClient } from '@supabase/supabase-js'

export type CleanupStatus = 'pending' | 'processing' | 'complete' | 'failed'

export type CleanupQueueRow = {
  id: string
  bucket: string
  object_path: string
  source_table: string
  source_id: string | null
  user_id: string | null
  status: CleanupStatus
  error_message: string | null
  processed_at: string | null
  created_at: string
}

export type CleanupSummary = {
  scanned: number
  claimed: number
  completed: number
  kept: number
  failed: number
  skipped: number
}

export type CleanupPlan = {
  scanned: number
  deletable: number
  kept: number
  invalid: number
}

export type CleanupClient = {
  listCleanupRows(options: { statuses: CleanupStatus[]; limit: number }): Promise<CleanupQueueRow[]>
  claimCleanupRow(id: string, statuses: CleanupStatus[]): Promise<CleanupQueueRow | null>
  isObjectReferenced(row: CleanupQueueRow): Promise<boolean>
  removeStorageObject(bucket: string, objectPath: string): Promise<void>
  markCleanupComplete(id: string, note?: string): Promise<void>
  markCleanupFailed(id: string, message: string): Promise<void>
  auditCleanupFailure(row: CleanupQueueRow, message: string): Promise<void>
}

export type ProcessStorageCleanupOptions = {
  allowedBuckets?: string[]
  limit?: number
  statuses?: CleanupStatus[]
}

export const DEFAULT_ALLOWED_BUCKETS = ['videos']
export const DEFAULT_STATUSES: CleanupStatus[] = ['pending', 'failed']
export const DEFAULT_LIMIT = 50
export const KEPT_NOTE = 'kept: still referenced by a live word'
const MAX_ERROR_LENGTH = 500
const WORD_MEDIA_COLUMNS = ['video_url', 'thumbnail_url', 'video_url_b', 'thumbnail_url_b', 'card_thumbnail_url'] as const

export function cleanupErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, MAX_ERROR_LENGTH)
}

function normalizeLimit(limit: number | undefined) {
  if (!Number.isFinite(limit) || limit === undefined) return DEFAULT_LIMIT
  return Math.max(1, Math.min(Math.floor(limit), 500))
}

export function validateQueuedObject(row: CleanupQueueRow, allowedBuckets: Set<string>) {
  const bucket = row.bucket.trim()
  const objectPath = row.object_path
  const trimmedPath = objectPath.trim()

  if (!allowedBuckets.has(bucket)) {
    return `Bucket is not allowed: ${bucket}`
  }

  if (!trimmedPath || trimmedPath !== objectPath) {
    return 'Object path must be non-empty and must not have surrounding whitespace'
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmedPath) || trimmedPath.startsWith('data:')) {
    return 'Object path must be relative, not a URL'
  }

  if (
    trimmedPath.startsWith('/')
    || trimmedPath.includes('\\')
    || trimmedPath.includes('\0')
    || trimmedPath.includes('?')
    || trimmedPath.includes('#')
  ) {
    return 'Object path contains unsafe characters'
  }

  const segments = trimmedPath.split('/')
  if (segments.some(segment => segment.length === 0)) {
    return 'Object path contains an empty segment'
  }

  for (const segment of segments) {
    let decoded = segment
    try {
      decoded = decodeURIComponent(segment)
    } catch {
      return 'Object path contains invalid URI encoding'
    }
    if (decoded === '.' || decoded === '..' || decoded.includes('/')) {
      return 'Object path contains a traversal segment'
    }
  }

  return null
}

async function failRow(client: CleanupClient, row: CleanupQueueRow, message: string) {
  const safeMessage = message.slice(0, MAX_ERROR_LENGTH)
  await client.markCleanupFailed(row.id, safeMessage)
  try {
    await client.auditCleanupFailure(row, safeMessage)
  } catch (error) {
    console.error(`Failed to audit storage cleanup failure for ${row.id}: ${cleanupErrorMessage(error)}`)
  }
}

export async function processStorageCleanup(
  client: CleanupClient,
  options: ProcessStorageCleanupOptions = {},
): Promise<CleanupSummary> {
  const allowedBuckets = new Set(options.allowedBuckets ?? DEFAULT_ALLOWED_BUCKETS)
  const statuses = options.statuses ?? DEFAULT_STATUSES
  const limit = normalizeLimit(options.limit)
  const rows = await client.listCleanupRows({ statuses, limit })
  const summary: CleanupSummary = {
    scanned: rows.length,
    claimed: 0,
    completed: 0,
    kept: 0,
    failed: 0,
    skipped: 0,
  }

  for (const row of rows) {
    const claimed = await client.claimCleanupRow(row.id, statuses)
    if (!claimed) {
      summary.skipped += 1
      continue
    }

    summary.claimed += 1
    const validationError = validateQueuedObject(claimed, allowedBuckets)
    if (validationError) {
      await failRow(client, claimed, validationError)
      summary.failed += 1
      continue
    }

    try {
      if (await client.isObjectReferenced(claimed)) {
        await client.markCleanupComplete(claimed.id, KEPT_NOTE)
        summary.kept += 1
        continue
      }
      await client.removeStorageObject(claimed.bucket, claimed.object_path)
      await client.markCleanupComplete(claimed.id)
      summary.completed += 1
    } catch (error) {
      await failRow(client, claimed, cleanupErrorMessage(error))
      summary.failed += 1
    }
  }

  return summary
}

// Read-only preview of what processStorageCleanup would do: no claims, no
// deletions, no status writes.
export async function planStorageCleanup(
  client: CleanupClient,
  options: ProcessStorageCleanupOptions = {},
): Promise<CleanupPlan> {
  const allowedBuckets = new Set(options.allowedBuckets ?? DEFAULT_ALLOWED_BUCKETS)
  const statuses = options.statuses ?? DEFAULT_STATUSES
  const rows = await client.listCleanupRows({ statuses, limit: normalizeLimit(options.limit) })
  const plan: CleanupPlan = { scanned: rows.length, deletable: 0, kept: 0, invalid: 0 }

  for (const row of rows) {
    if (validateQueuedObject(row, allowedBuckets)) {
      plan.invalid += 1
    } else if (await client.isObjectReferenced(row)) {
      plan.kept += 1
    } else {
      plan.deletable += 1
    }
  }

  return plan
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, match => `\\${match}`)
}

export function createSupabaseCleanupClient(supabase: SupabaseClient): CleanupClient {
  const columns = 'id,bucket,object_path,source_table,source_id,user_id,status,error_message,processed_at,created_at'

  return {
    async listCleanupRows(options) {
      const { data, error } = await supabase
        .from('storage_cleanup_queue')
        .select(columns)
        .in('status', options.statuses)
        .order('created_at', { ascending: true })
        .limit(options.limit)

      if (error) throw new Error(`Failed to list storage cleanup rows: ${error.message}`)
      return (data ?? []) as CleanupQueueRow[]
    },

    async claimCleanupRow(id, statuses) {
      const { data, error } = await supabase
        .from('storage_cleanup_queue')
        .update({
          status: 'processing',
          error_message: null,
        })
        .eq('id', id)
        .in('status', statuses)
        .select(columns)
        .maybeSingle()

      if (error) throw new Error(`Failed to claim storage cleanup row ${id}: ${error.message}`)
      return data as CleanupQueueRow | null
    },

    async isObjectReferenced(row) {
      // Public URLs end in /storage/v1/object/public/<bucket>/<path>.
      const pattern = `%${escapeLikePattern(`/${row.bucket}/${row.object_path}`)}`
      for (const column of WORD_MEDIA_COLUMNS) {
        let query = supabase
          .from('words')
          .select('id', { count: 'exact', head: true })
          .like(column, pattern)
        if (row.user_id) query = query.eq('user_id', row.user_id)
        const { count, error } = await query
        if (error) throw new Error(`Failed to check live references for ${row.id}: ${error.message}`)
        if ((count ?? 0) > 0) return true
      }
      return false
    },

    async removeStorageObject(bucket, objectPath) {
      const { error } = await supabase.storage.from(bucket).remove([objectPath])
      if (error) throw new Error(`Storage remove failed: ${error.message}`)
    },

    async markCleanupComplete(id, note) {
      const { error } = await supabase
        .from('storage_cleanup_queue')
        .update({
          status: 'complete',
          processed_at: new Date().toISOString(),
          error_message: note ?? null,
        })
        .eq('id', id)

      if (error) throw new Error(`Failed to mark storage cleanup row ${id} complete: ${error.message}`)
    },

    async markCleanupFailed(id, message) {
      const { error } = await supabase
        .from('storage_cleanup_queue')
        .update({
          status: 'failed',
          processed_at: new Date().toISOString(),
          error_message: message,
        })
        .eq('id', id)

      if (error) throw new Error(`Failed to mark storage cleanup row ${id} failed: ${error.message}`)
    },

    async auditCleanupFailure(row, message) {
      const { error } = await supabase
        .from('admin_audit_events')
        .insert([{
          actor_user_id: null,
          action: 'storage_cleanup_failed',
          target_table: 'storage_cleanup_queue',
          target_id: row.id,
          reason: message,
          before: row,
          after: null,
          metadata: {
            bucket: row.bucket,
            object_path: row.object_path,
            source_table: row.source_table,
            source_id: row.source_id,
            user_id: row.user_id,
          },
        }])

      if (error) throw new Error(`Failed to write storage cleanup audit row: ${error.message}`)
    },
  }
}
