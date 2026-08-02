import { corsHeaders, optionsResponse } from './_shared/cors'
import { ApiError, apiErrorResponse, errorResponse, rejectBodyOverLimit, sanitizedProviderError } from './_shared/http'
import { requireSupabaseUser } from './_shared/auth'
import { consumeApiQuota } from './_shared/quota'
import {
  consumeFeatureAllowance,
  recordLiveSession,
  refundFeatureUsage,
  resolveEntitlements,
  type UserEntitlements,
} from './_shared/entitlements'
import { LIVE_SESSION_MINUTES } from './_shared/planCatalog'
import { GROK_REALTIME_USD_PER_MINUTE } from './_shared/usageCost'
import { writeUsageEvent } from './_shared/usageEvents'
import { analyticsPlatformFromRequest, trackServerCoreAction } from './_shared/analytics'

const GROK_TOKEN_BODY_MAX_BYTES = 1024

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number, label: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  console.log(`[grok-token] ${label} — starting (${timeoutMs}ms timeout)`)
  return fetch(url, { ...options, signal: controller.signal })
    .then((res) => {
      clearTimeout(timer)
      console.log(`[grok-token] ${label} — completed (status ${res.status})`)
      return res
    })
    .catch((err) => {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        console.error(`[grok-token] ${label} — TIMED OUT after ${timeoutMs}ms`)
        throw new Error(`${label} timed out after ${timeoutMs / 1000}s`)
      }
      console.error(`[grok-token] ${label} — FAILED:`, err.message)
      throw err
    })
}

export async function OPTIONS(req?: Request): Promise<Response> {
  return optionsResponse(req)
}

export async function POST(req: Request): Promise<Response> {
  let userId = ''
  let entitlements: UserEntitlements | null = null
  let liveDebited = false
  // Config is checked BEFORE the allowance debit so a misconfigured server
  // can never burn a user's Live minutes.
  const xaiApiKey = process.env.XAI_API_KEY || ''

  try {
    const user = await requireSupabaseUser(req)
    userId = user.id
    await rejectBodyOverLimit(req, GROK_TOKEN_BODY_MAX_BYTES)
    await consumeApiQuota(user.id, 'grok_token')

    if (!xaiApiKey) {
      throw new ApiError(500, 'Token service is not configured')
    }

    // Grok Live is a Premium entitlement; the token mint IS the billable unit
    // (the secret expires after LIVE_SESSION_MINUTES), so debit atomically here.
    entitlements = await resolveEntitlements(user.id)
    if (!entitlements.isAdmin) {
      if (entitlements.plan !== 'premium' || entitlements.grants.liveMinutes <= 0) {
        throw new ApiError(403, 'Grok Live requires a Premium subscription', {
          code: 'premium_required',
          plan: entitlements.plan,
        })
      }

      const debit = await consumeFeatureAllowance(
        user.id,
        'live_minutes',
        entitlements.periodKey,
        LIVE_SESSION_MINUTES,
        entitlements.grants.liveMinutes,
      )
      if (!debit.allowed) {
        throw new ApiError(403, 'Live minutes are used up for this period', {
          code: 'live_allowance_exhausted',
          plan: entitlements.plan,
          used_minutes: debit.used,
          limit_minutes: entitlements.grants.liveMinutes,
        })
      }
      liveDebited = true
    }
  } catch (err) {
    if (err instanceof ApiError) return apiErrorResponse(req, err)
    console.error('[grok-token] Request gate failed:', err instanceof Error ? err.message : err)
    return errorResponse(req, 400, 'Invalid request')
  }

  // A failed mint after the debit refunds the minutes — the user got no token.
  async function refundLiveDebit() {
    if (liveDebited && entitlements) {
      await refundFeatureUsage(userId, 'live_minutes', entitlements.periodKey, LIVE_SESSION_MINUTES)
    }
  }

  let response: Response
  try {
    response = await fetchWithTimeout('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${xaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { seconds: 600 },
      }),
    }, 10000, 'xAI realtime client secret')
  } catch (err) {
    console.error('[grok-token] Token exchange failed:', err instanceof Error ? err.message : err)
    await refundLiveDebit()
    return sanitizedProviderError(req, 'Token exchange failed')
  }

  const text = await response.text()
  if (!response.ok) {
    console.error('[grok-token] xAI realtime client secret failed:', response.status)
    await refundLiveDebit()
    return sanitizedProviderError(req, 'Token exchange failed')
  }

  // Server-side Live accounting: one session row + one cost event per mint,
  // billed at the token's full TTL (conservative — a shorter real session
  // simply costs us less than what was debited).
  const estCostUsd = LIVE_SESSION_MINUTES * GROK_REALTIME_USD_PER_MINUTE
  await recordLiveSession(userId, entitlements?.plan ?? 'free', LIVE_SESSION_MINUTES, estCostUsd)
  await writeUsageEvent({
    userId,
    feature: 'live_session',
    stage: 'speak',
    status: 'success',
    modelProvider: 'xai',
    modelName: 'grok-realtime',
    costUsd: estCostUsd,
    sessionSeconds: LIVE_SESSION_MINUTES * 60,
    metadata: {
      billing: 'debit_at_mint',
      minutes_debited: LIVE_SESSION_MINUTES,
      plan: entitlements?.plan ?? 'free',
      is_admin: entitlements?.isAdmin ?? false,
    },
  })

  // Portfolio learning_action: the client-secret mint IS the billable 10-min
  // Live block, so it is also the learning_action unit.
  await trackServerCoreAction({
    userId,
    platform: analyticsPlatformFromRequest(req),
    kind: 'speak_live_block',
    props: {
      duration_s: LIVE_SESSION_MINUTES * 60,
      compute: {
        est_cost_usd: estCostUsd,
        providers: ['xai'],
      },
    },
  })

  return new Response(text, {
    status: 200,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}
