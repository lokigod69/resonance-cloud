// api/analytics-deletion-sweep.ts
//
// Daily Vercel cron (vercel.json "crons") — CO-2 step 5 of the Art. 17
// analytics-erasure contract (Analytics OS change orders, 2026-08-02).
// Re-issues PostHog person deletion for analytics_deletion_queue rows older
// than 24h (in-flight events can land after the first pass at account
// deletion), removing each row once PostHog confirms the person is gone.
// Idempotent and harmless to re-run: it only ever erases analytics for
// accounts that were already destroyed.

import { createAnalyticsAdminClient, eraseAnalyticsPerson } from './_shared/analytics'
import { errorResponse, jsonResponse } from './_shared/http'
import { cleanupAbandonedLiveReservations } from './_shared/liveSessionReservations'
import { assertRequestActive, withRequestDeadline } from './_shared/requestDeadline'

const SWEEP_BATCH_LIMIT = 100
const REQUEUE_AGE_MS = 24 * 60 * 60 * 1000

export async function GET(req: Request): Promise<Response> {
  return withRequestDeadline(req, handleGet)
}

async function handleGet(req: Request): Promise<Response> {
  // Vercel sends `Authorization: Bearer ${CRON_SECRET}` when the env is set.
  // Fail closed without it: an unset secret would otherwise turn this into a
  // public trigger for privileged PostHog deletion calls (audit 2026-09-03).
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return errorResponse(req, 503, 'Cron is not configured')
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return errorResponse(req, 401, 'Unauthorized')
  }

  // Share the existing authenticated daily maintenance schedule. Reconnects
  // recover immediately; abandoned credential-free blocks are also refunded
  // when the learner never comes back. SQL settlement is idempotent.
  let liveRefunded = 0
  let liveCleanupFailed = false
  try {
    liveRefunded = await cleanupAbandonedLiveReservations()
  } catch {
    liveCleanupFailed = true
    console.error('[maintenance] Live reservation cleanup failed')
  }

  const admin = createAnalyticsAdminClient()
  if (!admin) {
    return errorResponse(req, 500, 'Analytics deletion sweep is not configured')
  }

  const cutoff = new Date(Date.now() - REQUEUE_AGE_MS).toISOString()
  const { data, error } = await admin
    .from('analytics_deletion_queue')
    .select('user_uuid')
    .lt('requested_at', cutoff)
    .limit(SWEEP_BATCH_LIMIT)

  if (error) {
    console.error('[analytics-sweep] queue read failed', error.message)
    return errorResponse(req, 502, 'Unable to read the analytics deletion queue')
  }

  const rows = (data ?? []) as Array<{ user_uuid: string }>
  let erased = 0
  for (const row of rows) {
    assertRequestActive()
    const gone = await eraseAnalyticsPerson(row.user_uuid)
    if (!gone) continue
    const { error: deleteError } = await admin
      .from('analytics_deletion_queue')
      .delete()
      .eq('user_uuid', row.user_uuid)
    if (deleteError) {
      console.error('[analytics-sweep] queue row delete failed', deleteError.message)
      continue
    }
    erased += 1
  }

  return jsonResponse(req, { due: rows.length, erased, live_refunded: liveRefunded, live_cleanup_failed: liveCleanupFailed }, liveCleanupFailed ? 503 : 200)
}
