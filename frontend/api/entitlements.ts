// GET /api/entitlements — the client's single window into the tier system.
//
// Returns the caller's plan, balances, per-feature usage against the current
// period's grants, and the public plan catalog (prices + grants) so the
// frontend never hardcodes a number. Server-authoritative; the client only
// displays what this returns.

import { createClient } from '@supabase/supabase-js'
import { optionsResponse } from './_shared/cors'
import { ApiError, apiErrorResponse, errorResponse, jsonResponse } from './_shared/http'
import { requireSupabaseUser } from './_shared/auth'
import { getFeatureUsed, resolveEntitlements } from './_shared/entitlements'
import { isBillingAllowedForCheckout } from './_shared/billingAccess'
import {
  FREE_SIGNUP_CREDITS,
  FREE_TRIAL_LENS_SCANS,
  FREE_TRIAL_SPEAK_SECONDS,
  LIVE_SESSION_MINUTES,
  PLAN_GRANTS,
} from './_shared/planCatalog'

function serviceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
  if (!url || !key) {
    throw new ApiError(503, 'Entitlement service unavailable')
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export async function OPTIONS(req: Request): Promise<Response> {
  return optionsResponse(req)
}

export async function GET(req: Request): Promise<Response> {
  try {
    const user = await requireSupabaseUser(req)
    const entitlements = await resolveEntitlements(user.id)

    const supabase = serviceClient()
    const [profileRes, speakUsed, lensUsed, liveUsed, billingAllowed] = await Promise.all([
      supabase.from('profiles').select('credits, plan_credits').eq('id', user.id).maybeSingle(),
      getFeatureUsed(user.id, 'speak_seconds', entitlements.periodKey),
      getFeatureUsed(user.id, 'lens_scans', entitlements.periodKey),
      getFeatureUsed(user.id, 'live_minutes', entitlements.periodKey),
      isBillingAllowedForCheckout(user),
    ])

    const profile = (profileRes.data ?? {}) as { credits?: number | null; plan_credits?: number | null }

    return jsonResponse(req, {
      plan: entitlements.plan,
      interval: entitlements.interval,
      is_admin: entitlements.isAdmin,
      credits: Number(profile.credits ?? 0),
      plan_credits: Number(profile.plan_credits ?? 0),
      allowances: {
        speak_seconds: { used: Math.round(speakUsed), limit: entitlements.grants.speakSeconds },
        lens_scans: { used: Math.round(lensUsed), limit: entitlements.grants.lensScans },
        live_minutes: { used: Math.round(liveUsed), limit: entitlements.grants.liveMinutes },
      },
      live_session_minutes: LIVE_SESSION_MINUTES,
      catalog: PLAN_GRANTS,
      free_trials: {
        signup_credits: FREE_SIGNUP_CREDITS,
        speak_seconds: FREE_TRIAL_SPEAK_SECONDS,
        lens_scans: FREE_TRIAL_LENS_SCANS,
      },
      // Server-authoritative CTA gating: subscribe buttons only render when
      // checkout would actually be allowed for this user (staged rollout).
      // Same predicate the checkout endpoint enforces, so the button can never
      // promise what POST /api/create-checkout-session would refuse.
      billing_available: billingAllowed,
    })
  } catch (error) {
    if (error instanceof ApiError) return apiErrorResponse(req, error)
    console.error('[entitlements] request failed', error instanceof Error ? error.message : error)
    return errorResponse(req, 500, 'Unable to load entitlements')
  }
}
