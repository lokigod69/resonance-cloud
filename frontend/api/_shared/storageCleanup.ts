// api/_shared/storageCleanup.ts
//
// Drains public.storage_cleanup_queue: storage objects that deleted words
// left behind (enqueued by the phase1e delete RPC and the card-thumbnail
// trigger). Shared by the daily maintenance cron (api/analytics-deletion-sweep.ts)
// and the manual CLI (scripts/process-storage-cleanup.ts).
//
// An object is deleted only when every check passes:
// - allow-listed bucket, relative traversal-free path;
// - the path lives under the queue row's own user folder (a word can carry
//   any https URL, so a deleted word may point at someone else's file);
// - it is not a protected shared asset (landing showcase decks, guided-today);
// - no live `words` row of ANY user references it, raw or URL-encoded;
// - no live word of that user/deck/slug exists (a re-created word is being
//   regenerated into the same folder).

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
  stopped_early: boolean
}

export type CleanupPlan = {
  scanned: number
  deletable: number
  kept: number
  invalid: number
  stopped_early: boolean
}

export type ListOptions = { statuses: CleanupStatus[]; limit: number; staleProcessingBefore: string }

export type CleanupClient = {
  listCleanupRows(options: ListOptions): Promise<CleanupQueueRow[]>
  claimCleanupRow(id: string, options: ListOptions): Promise<CleanupQueueRow | null>
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
  // Checked before each row; returning false ends the run early.
  shouldContinue?: () => boolean
  now?: () => number
}

export const DEFAULT_ALLOWED_BUCKETS = ['videos']
// Failed rows are terminal for the cron; review them and retry with the CLI.
export const DEFAULT_STATUSES: CleanupStatus[] = ['pending']
export const DEFAULT_LIMIT = 50
export const KEPT_NOTE = 'kept: still referenced by a live word'
export const STALE_PROCESSING_MS = 60 * 60 * 1000
const MAX_ERROR_LENGTH = 500
const WORD_MEDIA_COLUMNS = ['video_url', 'thumbnail_url', 'video_url_b', 'thumbnail_url_b', 'card_thumbnail_url'] as const
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Shared files that must survive any single account deleting a word:
// the anonymous landing's showcase decks (src/components/landing/landingData.ts,
// kept in sync by scripts/test-storage-cleanup.ts) and the guided lesson media.
export const PROTECTED_PATH_PREFIXES = [
  'guided-today/',
  '8e2a8380-8822-46a4-9190-9c34c6313fd1/5fb91369-c4cf-479a-b9ee-886dc6e2d093/',
  '8e2a8380-8822-46a4-9190-9c34c6313fd1/80482d3e-b7f8-4844-8105-6827771427fc/',
  '8e2a8380-8822-46a4-9190-9c34c6313fd1/5944c032-2c2d-4ed4-93ff-95db27a092a8/',
  '8e2a8380-8822-46a4-9190-9c34c6313fd1/0437adf6-91ed-4d8f-9172-ae37e66c0a6a/',
  'ef7a3c72-69cf-42a6-8c5f-2592f99c56f7/008ba7fd-65af-4730-9933-2e53ac072379/',
  'ef7a3c72-69cf-42a6-8c5f-2592f99c56f7/631b2cea-66b5-4969-b7fc-7ed722ad1301/',
  'ef7a3c72-69cf-42a6-8c5f-2592f99c56f7/8190dd5d-09f8-4728-bec0-eead7d6d6445/',
  'ef7a3c72-69cf-42a6-8c5f-2592f99c56f7/3c060627-befa-4337-a51e-ceb127c9d284/',
]

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
    || trimmedPath.includes('"')
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

  if (!row.user_id || !UUID_RE.test(row.user_id)) {
    return 'Queue row has no owning user'
  }

  if (segments[0] !== row.user_id) {
    return 'Object path is outside the owning user folder'
  }

  if (PROTECTED_PATH_PREFIXES.some(prefix => trimmedPath.startsWith(prefix))) {
    return 'Object path is a protected shared asset'
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

function listOptions(options: ProcessStorageCleanupOptions): ListOptions {
  const now = options.now ?? Date.now
  return {
    statuses: options.statuses ?? DEFAULT_STATUSES,
    limit: normalizeLimit(options.limit),
    staleProcessingBefore: new Date(now() - STALE_PROCESSING_MS).toISOString(),
  }
}

export async function processStorageCleanup(
  client: CleanupClient,
  options: ProcessStorageCleanupOptions = {},
): Promise<CleanupSummary> {
  const allowedBuckets = new Set(options.allowedBuckets ?? DEFAULT_ALLOWED_BUCKETS)
  const list = listOptions(options)
  const shouldContinue = options.shouldContinue ?? (() => true)
  const rows = await client.listCleanupRows(list)
  const summary: CleanupSummary = {
    scanned: rows.length,
    claimed: 0,
    completed: 0,
    kept: 0,
    failed: 0,
    skipped: 0,
    stopped_early: false,
  }

  for (const row of rows) {
    if (!shouldContinue()) {
      summary.stopped_early = true
      break
    }

    const claimed = await client.claimCleanupRow(row.id, list)
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
  const shouldContinue = options.shouldContinue ?? (() => true)
  const rows = await client.listCleanupRows(listOptions(options))
  const plan: CleanupPlan = { scanned: rows.length, deletable: 0, kept: 0, invalid: 0, stopped_early: false }

  for (const row of rows) {
    if (!shouldContinue()) {
      plan.stopped_early = true
      break
    }
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

// PostgREST `or` filter value: `*` is the LIKE wildcard; `_`/`%` in a path
// only widen the match (the safe direction). Validation rejects `"` and `\`.
function referenceFilter(bucket: string, objectPath: string) {
  const variants = new Set([objectPath, encodeURI(objectPath)])
  const clauses: string[] = []
  for (const variant of variants) {
    for (const column of WORD_MEDIA_COLUMNS) {
      clauses.push(`${column}.like."*/${bucket}/${variant}*"`)
    }
  }
  return clauses.join(',')
}

function statusFilter(options: ListOptions) {
  return `status.in.(${options.statuses.join(',')}),and(status.eq.processing,processed_at.lt."${options.staleProcessingBefore}")`
}

export function createSupabaseCleanupClient(supabase: SupabaseClient): CleanupClient {
  const columns = 'id,bucket,object_path,source_table,source_id,user_id,status,error_message,processed_at,created_at'

  return {
    async listCleanupRows(options) {
      const { data, error } = await supabase
        .from('storage_cleanup_queue')
        .select(columns)
        .or(statusFilter(options))
        .order('created_at', { ascending: true })
        .limit(options.limit)

      if (error) throw new Error(`Failed to list storage cleanup rows: ${error.message}`)
      return (data ?? []) as CleanupQueueRow[]
    },

    async claimCleanupRow(id, options) {
      // processed_at doubles as the claim time so a crashed run's rows are
      // reclaimed after STALE_PROCESSING_MS.
      const { data, error } = await supabase
        .from('storage_cleanup_queue')
        .update({
          status: 'processing',
          error_message: null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .or(statusFilter(options))
        .select(columns)
        .maybeSingle()

      if (error) throw new Error(`Failed to claim storage cleanup row ${id}: ${error.message}`)
      return data as CleanupQueueRow | null
    },

    async isObjectReferenced(row) {
      const { count, error } = await supabase
        .from('words')
        .select('id', { count: 'exact', head: true })
        .or(referenceFilter(row.bucket, row.object_path))
      if (error) throw new Error(`Failed to check live references for ${row.id}: ${error.message}`)
      if ((count ?? 0) > 0) return true

      // A deleted word re-created with the same text regenerates into the
      // same user/deck/slug folder before its URL columns are written.
      const [userId, deckId, slug] = row.object_path.split('/')
      if (userId === row.user_id && deckId && UUID_RE.test(deckId) && slug) {
        const { count: sibling, error: siblingError } = await supabase
          .from('words')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('deck_id', deckId)
          .eq('word_slug', slug)
        if (siblingError) throw new Error(`Failed to check regenerating words for ${row.id}: ${siblingError.message}`)
        if ((sibling ?? 0) > 0) return true
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
