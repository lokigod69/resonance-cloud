// Server-authoritative entitlement resolution and allowance metering.
//
// The tier policy is: plan (from user_subscriptions) → grants (planCatalog) →
// usage_counters rows keyed by (user, feature, period). Free-tier trials are
// lifetime counters (period_key 'lifetime'). Admins bypass allowance denials but
// their usage is still recorded for telemetry. The seven api_quota_settings
// daily limits stay in place untouched as abuse rails — this layer is the
// product entitlement, not the burst control.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from './http'
import { assertRequestActive, requestFetch, withCleanupDeadline } from './requestDeadline'
import {
  FREE_TRIAL_LENS_SCANS,
  FREE_TRIAL_SPEAK_SECONDS,
  PLAN_GRANTS,
  type PaidPlanId,
  type PlanId,
  type PlanInterval,
} from './planCatalog'

export type FeatureKey = 'speak_seconds' | 'lens_scans' | 'live_minutes'

export interface EntitlementGrants {
  credits: number
  speakSeconds: number
  lensScans: number
  liveMinutes: number
}

export interface UserEntitlements {
  plan: PlanId
  interval: PlanInterval | null
  isAdmin: boolean
  periodKey: string
  grants: EntitlementGrants
}

const ACTIVE_STATUSES = new Set(['active', 'trialing'])
const PERIOD_END_GRACE_MS = 3 * 24 * 60 * 60 * 1000

function serviceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
  if (!url || !key) {
    throw new ApiError(503, 'Entitlement service unavailable')
  }
  return createClient(url, key, {
    global: { fetch: requestFetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

function monthKeyUtc(): string {
  return `m:${new Date().toISOString().slice(0, 7)}`
}

export async function resolveEntitlements(userId: string): Promise<UserEntitlements> {
  const supabase = serviceClient()

  const [profileRes, subRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
    supabase
      .from('user_subscriptions')
      .select('plan, plan_interval, status, current_period_start, current_period_end')
      .eq('user_id', userId)
      .maybeSingle(),
  ])
  assertRequestActive()

  if (profileRes.error || subRes.error) {
    throw new ApiError(503, 'Entitlement service unavailable')
  }

  const isAdmin = (profileRes.data as { role?: string | null } | null)?.role === 'admin'
  const sub = subRes.error
    ? null
    : (subRes.data as {
        plan?: string | null
        plan_interval?: string | null
        status?: string | null
        current_period_start?: string | null
        current_period_end?: string | null
      } | null)

  const planValue = sub?.plan
  const statusValue = sub?.status ?? ''
  const periodEndOk =
    !sub?.current_period_end
    || new Date(sub.current_period_end).getTime() > Date.now() - PERIOD_END_GRACE_MS

  if ((planValue === 'standard' || planValue === 'premium') && ACTIVE_STATUSES.has(statusValue) && periodEndOk) {
    const plan = planValue as PaidPlanId
    const interval: PlanInterval = sub?.plan_interval === 'week' ? 'week' : 'month'
    const grant = PLAN_GRANTS[plan][interval]
    return {
      plan,
      interval,
      isAdmin,
      periodKey: sub?.current_period_start ? `sub:${sub.current_period_start}` : monthKeyUtc(),
      grants: {
        credits: grant.credits,
        speakSeconds: grant.speakSeconds,
        lensScans: grant.lensScans,
        liveMinutes: grant.liveMinutes,
      },
    }
  }

  return {
    plan: 'free',
    interval: null,
    isAdmin,
    periodKey: 'lifetime',
    grants: {
      credits: 0,
      speakSeconds: FREE_TRIAL_SPEAK_SECONDS,
      lensScans: FREE_TRIAL_LENS_SCANS,
      liveMinutes: 0,
    },
  }
}

export async function getFeatureUsed(
  userId: string,
  feature: FeatureKey,
  periodKey: string,
): Promise<number> {
  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('usage_counters')
    .select('used')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('period_key', periodKey)
    .maybeSingle()

  if (error) {
    // Fail OPEN: a missing table (deploy before migration 20260728090000) or a
    // transient read error must not break Speak — unmetered is exactly the
    // pre-tier behavior, and the daily quota rails still cap abuse. Conditional
    // debits (consumeFeatureAllowance) stay fail-closed.
    console.error('[entitlements] usage read failed — treating as 0', { feature, error: error.message })
    return 0
  }

  return Number((data as { used?: number | string | null } | null)?.used ?? 0)
}

/**
 * Conditional debit: the increment IS the authorization (Lens scans, Live
 * minutes). Fails closed on infrastructure errors.
 */
export async function consumeFeatureAllowance(
  userId: string,
  feature: FeatureKey,
  periodKey: string,
  amount: number,
  max: number,
): Promise<{ allowed: boolean; used: number }> {
  const supabase = serviceClient()
  const { data, error } = await supabase.rpc('consume_feature_usage', {
    p_user_id: userId,
    p_feature: feature,
    p_period_key: periodKey,
    p_amount: amount,
    p_max: max,
  })
  if (error) {
    throw new ApiError(503, 'Entitlement service unavailable')
  }

  const row = (Array.isArray(data) ? data[0] : data) as { allowed?: boolean; used?: number | string } | null
  return {
    allowed: row?.allowed === true,
    used: Number(row?.used ?? 0),
  }
}

/**
 * Compensation for a conditional debit whose paid action then failed (e.g. a
 * Live token mint that errored after its 10-minute debit). Floors at 0 server-
 * side. Never throws, but a failed refund is logged loudly — it means a user
 * paid allowance for nothing.
 */
export async function refundFeatureUsage(
  userId: string,
  feature: FeatureKey,
  periodKey: string,
  amount: number,
): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) return
  try {
    await withCleanupDeadline(async () => {
      const supabase = serviceClient()
      const { error } = await supabase.rpc('consume_feature_usage', {
        p_user_id: userId,
        p_feature: feature,
        p_period_key: periodKey,
        p_amount: -Math.abs(amount),
        p_max: null,
      })
      if (error) {
        console.error('[entitlements] USAGE REFUND FAILED — user over-debited', { userId, feature, amount, error: error.message })
      }
    })
  } catch (err) {
    console.error('[entitlements] USAGE REFUND FAILED — user over-debited', { userId, feature, amount, err })
  }
}

/**
 * Unconditional usage record for work that already happened (Speak seconds
 * after a completed turn). Never throws — losing one telemetry increment must
 * not fail a turn the user already received.
 */
export async function recordFeatureUsage(
  userId: string,
  feature: FeatureKey,
  periodKey: string,
  amount: number,
): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) return
  try {
    const supabase = serviceClient()
    const { error } = await supabase.rpc('consume_feature_usage', {
      p_user_id: userId,
      p_feature: feature,
      p_period_key: periodKey,
      p_amount: amount,
      p_max: null,
    })
    if (error) {
      console.error('[entitlements] usage record failed', { feature, error: error.message })
    }
  } catch (err) {
    console.error('[entitlements] usage record failed', { feature, err })
  }
}
