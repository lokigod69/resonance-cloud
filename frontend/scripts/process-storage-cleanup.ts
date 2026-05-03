import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

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
  failed: number
  skipped: number
}

export type CleanupClient = {
  listCleanupRows(options: { statuses: CleanupStatus[]; limit: number }): Promise<CleanupQueueRow[]>
  claimCleanupRow(id: string, statuses: CleanupStatus[]): Promise<CleanupQueueRow | null>
  removeStorageObject(bucket: string, objectPath: string): Promise<void>
  markCleanupComplete(id: string): Promise<void>
  markCleanupFailed(id: string, message: string): Promise<void>
  auditCleanupFailure(row: CleanupQueueRow, message: string): Promise<void>
}

export type ProcessStorageCleanupOptions = {
  allowedBuckets?: string[]
  limit?: number
  statuses?: CleanupStatus[]
}

const DEFAULT_ALLOWED_BUCKETS = ['videos']
const DEFAULT_STATUSES: CleanupStatus[] = ['pending', 'failed']
const DEFAULT_LIMIT = 50
const MAX_ERROR_LENGTH = 500

function cleanupErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, MAX_ERROR_LENGTH)
}

function normalizeLimit(limit: number | undefined) {
  if (!Number.isFinite(limit) || limit === undefined) return DEFAULT_LIMIT
  return Math.max(1, Math.min(Math.floor(limit), 500))
}

function validateQueuedObject(row: CleanupQueueRow, allowedBuckets: Set<string>) {
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

export function createSupabaseCleanupClient(supabaseUrl: string, serviceRoleKey: string): CleanupClient {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return {
    async listCleanupRows(options) {
      const { data, error } = await supabase
        .from('storage_cleanup_queue')
        .select('id,bucket,object_path,source_table,source_id,user_id,status,error_message,processed_at,created_at')
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
        .select('id,bucket,object_path,source_table,source_id,user_id,status,error_message,processed_at,created_at')
        .maybeSingle()

      if (error) throw new Error(`Failed to claim storage cleanup row ${id}: ${error.message}`)
      return data as CleanupQueueRow | null
    },

    async removeStorageObject(bucket, objectPath) {
      const { error } = await supabase.storage.from(bucket).remove([objectPath])
      if (error) throw new Error(`Storage remove failed: ${error.message}`)
    },

    async markCleanupComplete(id) {
      const { error } = await supabase
        .from('storage_cleanup_queue')
        .update({
          status: 'complete',
          processed_at: new Date().toISOString(),
          error_message: null,
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

function loadEnv(file: string) {
  if (!fs.existsSync(file)) return
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const idx = line.indexOf('=')
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function envList(value: string | undefined) {
  return value
    ?.split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

export async function runStorageCleanupCli() {
  loadEnv(path.resolve('..', '.env'))
  loadEnv(path.resolve('.env'))

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY')
  }

  const allowedBuckets = envList(process.env.STORAGE_CLEANUP_ALLOWED_BUCKETS) ?? DEFAULT_ALLOWED_BUCKETS
  const limit = process.env.STORAGE_CLEANUP_LIMIT ? Number(process.env.STORAGE_CLEANUP_LIMIT) : DEFAULT_LIMIT
  const client = createSupabaseCleanupClient(supabaseUrl, serviceRoleKey)
  const summary = await processStorageCleanup(client, { allowedBuckets, limit })
  console.log(`Storage cleanup scanned=${summary.scanned} claimed=${summary.claimed} completed=${summary.completed} failed=${summary.failed} skipped=${summary.skipped}`)
}

function isMainModule() {
  const entry = process.argv[1]
  return entry ? path.resolve(entry) === fileURLToPath(import.meta.url) : false
}

if (isMainModule()) {
  runStorageCleanupCli().catch(error => {
    console.error(cleanupErrorMessage(error))
    process.exitCode = 1
  })
}
