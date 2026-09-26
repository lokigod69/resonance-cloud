// Manual storage-cleanup run. Preview by default; `--commit` deletes.
// The same logic runs daily in api/analytics-deletion-sweep.ts once
// STORAGE_CLEANUP_MODE=delete is set in Vercel.
//   npx tsx scripts/process-storage-cleanup.ts            # read-only preview
//   npx tsx scripts/process-storage-cleanup.ts --commit   # claim, delete, mark rows
//   add --retry-failed to include rows a previous run marked failed
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

import {
  type CleanupStatus,
  DEFAULT_ALLOWED_BUCKETS,
  DEFAULT_LIMIT,
  cleanupErrorMessage,
  createSupabaseCleanupClient,
  planStorageCleanup,
  processStorageCleanup,
} from '../api/_shared/storageCleanup.ts'

export * from '../api/_shared/storageCleanup.ts'

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
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const client = createSupabaseCleanupClient(supabase)
  const statuses: CleanupStatus[] = process.argv.includes('--retry-failed') ? ['pending', 'failed'] : ['pending']

  if (!process.argv.includes('--commit')) {
    const plan = await planStorageCleanup(client, { allowedBuckets, limit, statuses })
    console.log(`Storage cleanup preview (no changes) scanned=${plan.scanned} deletable=${plan.deletable} kept=${plan.kept} invalid=${plan.invalid}`)
    return
  }

  const summary = await processStorageCleanup(client, { allowedBuckets, limit, statuses })
  console.log(`Storage cleanup scanned=${summary.scanned} claimed=${summary.claimed} completed=${summary.completed} kept=${summary.kept} failed=${summary.failed} skipped=${summary.skipped}`)
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
