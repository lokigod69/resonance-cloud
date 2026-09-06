import { randomUUID } from 'node:crypto'
import { optionsResponse } from './_shared/cors'
import { ApiError, apiErrorResponse, errorResponse, jsonResponse, readJsonWithLimit, sanitizedProviderError } from './_shared/http'
import { requireSupabaseUser } from './_shared/auth'
import { consumeApiQuota } from './_shared/quota'
import { resolveEntitlements } from './_shared/entitlements'
import { LIVE_SESSION_MINUTES } from './_shared/planCatalog'
import { GROK_REALTIME_USD_PER_MINUTE } from './_shared/usageCost'
import { writeUsageEvent } from './_shared/usageEvents'
import { analyticsPlatformFromRequest, trackServerCoreAction } from './_shared/analytics'
import {
  completeLiveSessionMint,
  liveTokenTtlSeconds,
  reserveLiveSessionMint,
} from './_shared/liveSessionReservations'
import { openLiveClientSecret, sealLiveClientSecret } from './_shared/liveTokenEnvelope'
import {
  assertRequestActive,
  fetchWithRequestDeadline,
  withCleanupDeadline,
  withRequestDeadline,
} from './_shared/requestDeadline'

const GROK_TOKEN_BODY_MAX_BYTES = 1024
const XAI_TOKEN_TIMEOUT_MS = 10_000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface GrokTokenRequest {
  mint_request_id: string
  reservation_id?: string | null
}

interface XaiClientSecretResponse {
  value?: string
  expires_at?: number
}

async function settleFailedMint(input: {
  userId: string
  reservationId: string
  mintRequestId: string
}): Promise<void> {
  try {
    await withCleanupDeadline(
      () => completeLiveSessionMint({ ...input, outcome: 'definitive_failure' }),
      3_000,
    )
  } catch (error) {
    console.error('[grok-token] Failed mint settlement did not complete:', error instanceof Error ? error.message : error)
  }
}

function validateRequestBody(raw: unknown): GrokTokenRequest {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError(400, 'Invalid token request')
  }
  const body = raw as Record<string, unknown>
  if (typeof body.mint_request_id !== 'string' || !UUID_PATTERN.test(body.mint_request_id)) {
    throw new ApiError(400, 'Invalid mint request id')
  }
  if (
    body.reservation_id !== undefined
    && body.reservation_id !== null
    && (typeof body.reservation_id !== 'string' || !UUID_PATTERN.test(body.reservation_id))
  ) {
    throw new ApiError(400, 'Invalid reservation id')
  }
  return {
    mint_request_id: body.mint_request_id,
    reservation_id: typeof body.reservation_id === 'string' ? body.reservation_id : null,
  }
}

async function readRequestBody(req: Request): Promise<GrokTokenRequest> {
  const contentLength = req.headers.get('Content-Length')
  if (!req.body || contentLength === '0') {
    // Backward compatibility for already-installed clients from before the
    // reservation contract. Server lookup still recovers their active block.
    return { mint_request_id: randomUUID(), reservation_id: null }
  }
  return validateRequestBody(await readJsonWithLimit<unknown>(req, GROK_TOKEN_BODY_MAX_BYTES))
}

export async function OPTIONS(req?: Request): Promise<Response> {
  return optionsResponse(req)
}

async function handlePost(req: Request): Promise<Response> {
  const xaiApiKey = process.env.XAI_API_KEY || ''
  let userId = ''
  let body: GrokTokenRequest

  try {
    const user = await requireSupabaseUser(req)
    userId = user.id
    body = await readRequestBody(req)
    await consumeApiQuota(user.id, 'grok_token')
  } catch (error) {
    if (error instanceof ApiError) return apiErrorResponse(req, error)
    console.error('[grok-token] Request gate failed:', error instanceof Error ? error.message : error)
    return errorResponse(req, 400, 'Invalid request')
  }

  if (!xaiApiKey) return errorResponse(req, 503, 'Token service is not configured')

  let entitlements
  try {
    entitlements = await resolveEntitlements(userId)
    if (!entitlements.isAdmin && (entitlements.plan !== 'premium' || entitlements.grants.liveMinutes <= 0)) {
      throw new ApiError(403, 'Grok Live requires a Premium subscription', {
        code: 'premium_required',
        plan: entitlements.plan,
      })
    }
  } catch (error) {
    if (error instanceof ApiError) return apiErrorResponse(req, error)
    return errorResponse(req, 503, 'Entitlement service unavailable')
  }

  let reservation
  try {
    reservation = await reserveLiveSessionMint({
      userId,
      requestedReservationId: body.reservation_id ?? null,
      mintRequestId: body.mint_request_id,
      entitlements,
      minutes: LIVE_SESSION_MINUTES,
    })
  } catch (error) {
    if (error instanceof ApiError) return apiErrorResponse(req, error)
    return errorResponse(req, 503, 'Live reservation service unavailable')
  }

  if (reservation.encryptedClientSecret && reservation.clientSecretExpiresAt) {
    try {
      return jsonResponse(req, {
        value: openLiveClientSecret(reservation.encryptedClientSecret, xaiApiKey),
        expires_at: Math.floor(new Date(reservation.clientSecretExpiresAt).getTime() / 1000),
        reservation_id: reservation.reservationId,
        reservation_expires_at: reservation.reservationExpiresAt,
        reservation_reused: true,
      })
    } catch (error) {
      console.error('[grok-token] Stored Live secret could not be opened:', error instanceof Error ? error.message : error)
      return errorResponse(req, 503, 'Token service is unavailable')
    }
  }

  const tokenTtlSeconds = liveTokenTtlSeconds(reservation.reservationExpiresAt)
  let providerResponse: Response
  try {
    providerResponse = await fetchWithRequestDeadline('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${xaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expires_after: { seconds: tokenTtlSeconds } }),
    }, XAI_TOKEN_TIMEOUT_MS)
  } catch (error) {
    console.error('[grok-token] Token exchange failed:', error instanceof Error ? error.message : error)
    await settleFailedMint({
      userId,
      reservationId: reservation.reservationId,
      mintRequestId: body.mint_request_id,
    })
    return sanitizedProviderError(req, 'Token exchange failed')
  }

  let providerText = ''
  try {
    providerText = await providerResponse.text()
  } catch (error) {
    console.error('[grok-token] Token response read failed:', error instanceof Error ? error.message : error)
  }

  let providerJson: XaiClientSecretResponse | null = null
  try {
    providerJson = JSON.parse(providerText) as XaiClientSecretResponse
  } catch { /* handled as a provider failure below */ }

  const providerExpiresAt = Number(providerJson?.expires_at)
  if (
    !providerResponse.ok
    || typeof providerJson?.value !== 'string'
    || !providerJson.value
    || !Number.isFinite(providerExpiresAt)
    || providerExpiresAt * 1000 <= Date.now()
  ) {
    console.error('[grok-token] xAI realtime client secret failed:', providerResponse.status)
    await settleFailedMint({
      userId,
      reservationId: reservation.reservationId,
      mintRequestId: body.mint_request_id,
    })
    return sanitizedProviderError(req, 'Token exchange failed')
  }

  const providerExpiresAtIso = new Date(providerExpiresAt * 1000).toISOString()
  const effectiveReservationExpiresAt = new Date(Math.min(
    new Date(reservation.reservationExpiresAt).getTime(),
    providerExpiresAt * 1000,
  )).toISOString()
  const estCostUsd = LIVE_SESSION_MINUTES * GROK_REALTIME_USD_PER_MINUTE
  try {
    await completeLiveSessionMint({
      userId,
      reservationId: reservation.reservationId,
      mintRequestId: body.mint_request_id,
      outcome: 'success',
      encryptedClientSecret: sealLiveClientSecret(providerJson.value, xaiApiKey),
      clientSecretExpiresAt: providerExpiresAtIso,
      estimatedCostUsd: estCostUsd,
    })
  } catch (error) {
    console.error('[grok-token] Token reservation finalization failed:', error instanceof Error ? error.message : error)
    await settleFailedMint({
      userId,
      reservationId: reservation.reservationId,
      mintRequestId: body.mint_request_id,
    })
    return errorResponse(req, 503, 'Live reservation service unavailable')
  }

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
      billing: 'live_reservation',
      minutes_debited: reservation.minutesDebited,
      reservation_id: reservation.reservationId,
      plan: entitlements.plan,
      is_admin: entitlements.isAdmin,
    },
  })

  await trackServerCoreAction({
    userId,
    platform: analyticsPlatformFromRequest(req),
    kind: 'speak_live_block',
    props: {
      duration_s: LIVE_SESSION_MINUTES * 60,
      compute: { est_cost_usd: estCostUsd, providers: ['xai'] },
    },
  })

  assertRequestActive()
  return jsonResponse(req, {
    value: providerJson.value,
    expires_at: providerExpiresAt,
    reservation_id: reservation.reservationId,
    reservation_expires_at: effectiveReservationExpiresAt,
    reservation_reused: !reservation.created,
  })
}

export async function POST(req: Request): Promise<Response> {
  return withRequestDeadline(req, handlePost, { timeoutMs: 15_000, cleanupMs: 3_000 })
}
