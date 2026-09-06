// api/_shared/analytics.ts
//
// Server-side Analytics OS emitter — the portfolio-standard 8-event vocabulary
// (see src/vendor/analyticsos, a generated snapshot; never hand-edit it).
//
// Emission rules (Analytics OS handoff, 2026-08-02):
// - Master switch: AOS_ANALYTICS_ENABLED === 'true' AND AOS_POSTHOG_KEY set.
//   Both live only in Vercel env; nothing flows until the owner enables them.
// - Bounded and awaited: every path swallows failures (same philosophy as
//   writeUsageEvent) before the serverless request ends.
// - Per-user opt-out: profiles.analytics_opt_out suppresses ALL emits at
//   source. A failed opt-out lookup suppresses too (privacy-safe default).
// - No PII in props: never email, name, transcripts, or free-text input.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createTelemetryFetch } from './telemetryFetch'
import { assertRequestActive, fetchWithRequestDeadline } from './requestDeadline'
import {
  PostHogSink,
  StandardEventSchema,
  deterministicUuid,
  type EventName,
  type StandardEvent,
} from '../../src/vendor/analyticsos'

export { deterministicUuid }

const AOS_PROJECT_ID = 'lingwave'
const AOS_INGEST_HOST = 'https://eu.i.posthog.com'

export type AnalyticsPlatform = 'web' | 'ios'

export interface ServerAnalyticsEvent {
  event: EventName
  /** Supabase user id — server events are always identified. */
  distinctId: string
  platform?: AnalyticsPlatform
  props?: Record<string, unknown>
  /** deterministicUuid(seed) for idempotent events (webhook replays dedupe). */
  uuid?: string
  /** ISO timestamp override (e.g. Stripe payment time); defaults to now. */
  ts?: string
  /**
   * For id-less events (distinctId is not a user id, e.g. the anon_ churn
   * counter): the real user whose opt-out choice still governs the emit.
   */
  optOutUserId?: string
}

export function isAnalyticsEnabled(): boolean {
  return process.env.AOS_ANALYTICS_ENABLED === 'true' && Boolean(process.env.AOS_POSTHOG_KEY)
}

/** The iOS Capacitor shell calls /api/* with a capacitor:// origin. */
export function analyticsPlatformFromRequest(req?: Request): AnalyticsPlatform {
  const origin = req?.headers.get('origin') ?? ''
  return origin.startsWith('capacitor:') ? 'ios' : 'web'
}

export function createAnalyticsAdminClient(signal?: AbortSignal): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    global: { fetch: createTelemetryFetch(signal) },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

// Suppress on any doubt: a lookup failure (or missing column pre-migration)
// drops the event rather than emitting for a user who may have opted out.
async function isOptedOut(userId: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const admin = createAnalyticsAdminClient(signal)
    if (!admin) return true
    const { data, error } = await admin
      .from('profiles')
      .select('analytics_opt_out')
      .eq('id', userId)
      .maybeSingle()
    if (error) return true
    return Boolean((data as { analytics_opt_out?: boolean } | null)?.analytics_opt_out)
  } catch {
    return true
  }
}

/**
 * Emit one portfolio event. Never throws and never returns a rejected
 * promise. Callers should `await` it before returning so the send completes
 * before the serverless function freezes.
 */
export async function trackServerEvent(input: ServerAnalyticsEvent, signal = AbortSignal.timeout(3_000)): Promise<void> {
  try {
    if (!isAnalyticsEnabled()) return
    if (await isOptedOut(input.optOutUserId ?? input.distinctId, signal)) return

    const candidate: StandardEvent = {
      event: input.event,
      project_id: AOS_PROJECT_ID,
      ts: input.ts ?? new Date().toISOString(),
      platform: input.platform ?? 'web',
      ...(input.props !== undefined ? { props: input.props } : {}),
      ...(input.uuid !== undefined ? { uuid: input.uuid } : {}),
    }
    const validated = StandardEventSchema.parse(candidate)

    const sink = new PostHogSink({
      ingestHost: AOS_INGEST_HOST,
      projectApiKey: process.env.AOS_POSTHOG_KEY ?? '',
      fetchImpl: createTelemetryFetch(signal),
    })
    await sink.send([{ distinctId: input.distinctId, event: validated }])
  } catch (err) {
    console.error('[analytics] emit failed:', err instanceof Error ? err.message : err)
  }
}

/**
 * The activation gate: sets profiles.activated_at the first time any
 * learning_action lands. Returns true only on that first time. Gated on the
 * master switch so nothing is written pre-approval; failures return false.
 */
async function recordLearningActionActivation(userId: string, signal?: AbortSignal): Promise<boolean> {
  try {
    if (!isAnalyticsEnabled()) return false
    const admin = createAnalyticsAdminClient(signal)
    if (!admin) return false
    const { data, error } = await admin.rpc('record_learning_action_activation', {
      p_user_id: userId,
    })
    if (error) {
      console.error('[analytics] activation rpc failed:', error.message)
      return false
    }
    return Boolean((data as { first?: boolean } | null)?.first)
  } catch {
    return false
  }
}

/**
 * One server-side learning_action: emits core_action with props.kind, then
 * activation exactly once per user ever (gated by profiles.activated_at).
 */
export async function trackServerCoreAction(input: {
  userId: string
  platform: AnalyticsPlatform
  kind: 'speak_turn' | 'speak_live_block' | 'lens_scan'
  props?: Record<string, unknown>
}): Promise<void> {
  const signal = AbortSignal.timeout(3_000)
  await trackServerEvent({
    event: 'core_action',
    distinctId: input.userId,
    platform: input.platform,
    props: { kind: input.kind, skin: 'glassy', ...input.props },
  }, signal)
  const first = await recordLearningActionActivation(input.userId, signal)
  if (first) {
    await trackServerEvent({
      event: 'activation',
      distinctId: input.userId,
      platform: input.platform,
      uuid: deterministicUuid(`activation:${input.userId}`),
    }, signal)
  }
}

// ── Art. 17 erasure (Analytics OS change orders CO-1/CO-2, 2026-08-02) ──────

/**
 * The id-less churn identity (CO-1): account-deletion churn_markers use this
 * constant distinctId so no event stays keyed to an erased person; the anon_
 * prefix keeps it profile-less in the vendored sink.
 */
export const ANON_CHURN_DISTINCT_ID = 'anon_churn_counter'

function erasureConfig(): { host: string; projectId: string; key: string } | null {
  const key = process.env.AOS_POSTHOG_DELETION_KEY ?? ''
  const projectId = process.env.AOS_POSTHOG_PROJECT_ID ?? ''
  if (!key || !projectId) return null
  // The private management API lives on a different host than ingest.
  return { host: 'https://eu.posthog.com', projectId, key }
}

/**
 * PostHog person deletion with events for one user UUID (CO-2 step 2).
 * Returns true when the person is gone (deleted now, or never existed) — the
 * deletion-queue caller keeps its row until this confirms after the 24h
 * in-flight window. Endpoint shape: persons list filtered by distinct_id,
 * then DELETE with delete_events=true; the CO-2 drill proves it.
 */
export async function eraseAnalyticsPerson(userId: string): Promise<boolean> {
  try {
    const config = erasureConfig()
    if (!config) return false
    const headers = { Authorization: `Bearer ${config.key}` }
    const base = `${config.host}/api/projects/${config.projectId}/persons/`

    // Deadlines: the erasure runs inside delete-account and the nightly sweep;
    // a stalled PostHog call must never pin either function.
    const lookup = await fetchWithRequestDeadline(`${base}?distinct_id=${encodeURIComponent(userId)}`, {
      headers,
    }, 10_000)
    if (!lookup.ok) return false
    const body = (await lookup.json()) as { results?: Array<{ id?: number | string | null }> }
    const persons = body.results ?? []
    if (persons.length === 0) return true

    for (const person of persons) {
      assertRequestActive()
      if (person.id === undefined || person.id === null) return false
      const del = await fetchWithRequestDeadline(`${base}${person.id}/?delete_events=true`, {
        method: 'DELETE',
        headers,
      }, 10_000)
      if (!del.ok && del.status !== 404) return false
    }
    return true
  } catch (err) {
    console.error('[analytics] person erasure failed:', err instanceof Error ? err.message : err)
    return false
  }
}
