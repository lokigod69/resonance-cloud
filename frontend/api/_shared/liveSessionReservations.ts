import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from './http'
import type { UserEntitlements } from './entitlements'
import { requestFetch } from './requestDeadline'

export const MAX_LIVE_MINT_ATTEMPTS_PER_RESERVATION = 4
const LIVE_MINT_CLAIM_SECONDS = 15

export interface LiveMintReservation {
  reservationId: string
  reservationExpiresAt: string
  remainingSeconds: number
  created: boolean
  minutesDebited: number
  mintAttemptCount: number
  encryptedClientSecret: string | null
  clientSecretExpiresAt: string | null
}

type RawReservationResult = {
  allowed?: boolean
  reason?: string | null
  used?: number | string
  reservation_id?: string
  reservation_expires_at?: string
  remaining_seconds?: number | string
  created?: boolean
  minutes_debited?: number | string
  mint_attempt_count?: number | string
  reuse_secret?: boolean
  client_secret_ciphertext?: string
  client_secret_expires_at?: string
  retry_after_seconds?: number | string
}

function serviceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
  if (!url || !key) throw new ApiError(503, 'Live reservation service unavailable')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: requestFetch },
  })
}

function firstResult<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value
}

export async function reserveLiveSessionMint(input: {
  userId: string
  requestedReservationId: string | null
  mintRequestId: string
  entitlements: UserEntitlements
  minutes: number
}): Promise<LiveMintReservation> {
  const { entitlements } = input
  const { data, error } = await serviceClient().rpc('reserve_live_session_mint', {
    p_user_id: input.userId,
    p_period_key: entitlements.periodKey,
    p_plan: entitlements.plan,
    p_minutes: input.minutes,
    p_max: entitlements.grants.liveMinutes,
    p_is_admin: entitlements.isAdmin,
    p_requested_reservation_id: input.requestedReservationId,
    p_mint_request_id: input.mintRequestId,
    p_max_mint_attempts: MAX_LIVE_MINT_ATTEMPTS_PER_RESERVATION,
    p_claim_seconds: LIVE_MINT_CLAIM_SECONDS,
  })
  if (error) throw new ApiError(503, 'Live reservation service unavailable')

  const raw = firstResult(data as RawReservationResult | RawReservationResult[] | null)
  if (!raw || raw.allowed !== true) {
    const retryAfter = Number(raw?.retry_after_seconds ?? 0)
    if (raw?.reason === 'allowance_exhausted') {
      throw new ApiError(403, 'Live minutes are used up for this period', {
        code: 'live_allowance_exhausted',
        plan: entitlements.plan,
        used_minutes: Number(raw.used ?? 0),
        limit_minutes: entitlements.grants.liveMinutes,
      })
    }
    if (raw?.reason === 'mint_in_progress' || raw?.reason === 'duplicate_request') {
      throw new ApiError(409, 'Live connection is already being prepared', {
        code: 'live_mint_in_progress',
        retry_after_seconds: retryAfter || 2,
      })
    }
    if (raw?.reason === 'mint_limit_reached') {
      throw new ApiError(429, 'Live reconnect limit reached for this session', {
        code: 'live_reconnect_limit',
      })
    }
    throw new ApiError(409, 'Live session reservation expired', {
      code: 'live_reservation_expired',
    })
  }

  if (!raw.reservation_id || !raw.reservation_expires_at) {
    throw new ApiError(503, 'Live reservation service unavailable')
  }
  if (raw.reuse_secret === true && (!raw.client_secret_ciphertext || !raw.client_secret_expires_at)) {
    // Fail closed: an incomplete cache response must never fall through to a
    // second provider mint inside the same reservation.
    throw new ApiError(503, 'Live reservation service unavailable')
  }

  return {
    reservationId: raw.reservation_id,
    reservationExpiresAt: raw.reservation_expires_at,
    remainingSeconds: Number(raw.remaining_seconds ?? 0),
    created: raw.created === true,
    minutesDebited: Number(raw.minutes_debited ?? 0),
    mintAttemptCount: Number(raw.mint_attempt_count ?? 0),
    encryptedClientSecret: raw.reuse_secret === true ? raw.client_secret_ciphertext ?? null : null,
    clientSecretExpiresAt: raw.reuse_secret === true ? raw.client_secret_expires_at ?? null : null,
  }
}

export async function completeLiveSessionMint(input: {
  userId: string
  reservationId: string
  mintRequestId: string
  outcome: 'success' | 'definitive_failure'
  encryptedClientSecret?: string
  clientSecretExpiresAt?: string
  estimatedCostUsd?: number
}): Promise<void> {
  const { data, error } = await serviceClient().rpc('complete_live_session_mint', {
    p_user_id: input.userId,
    p_reservation_id: input.reservationId,
    p_mint_request_id: input.mintRequestId,
    p_outcome: input.outcome,
    p_client_secret_ciphertext: input.encryptedClientSecret ?? null,
    p_client_secret_expires_at: input.clientSecretExpiresAt ?? null,
    p_est_cost_usd: input.estimatedCostUsd ?? null,
  })
  if (error) {
    throw new ApiError(503, 'Live reservation service unavailable')
  }
  const raw = firstResult(data as { accepted?: boolean } | Array<{ accepted?: boolean }> | null)
  if (!raw || raw.accepted !== true) {
    throw new ApiError(409, 'Live mint reservation is no longer active')
  }
}

export function liveTokenTtlSeconds(reservationExpiresAt: string, nowMs = Date.now()): number {
  const remaining = Math.floor((new Date(reservationExpiresAt).getTime() - nowMs) / 1000)
  if (!Number.isFinite(remaining) || remaining <= 0) {
    throw new ApiError(409, 'Live session reservation expired', { code: 'live_reservation_expired' })
  }
  return Math.min(600, remaining)
}

/** Scheduled compensation for a lost request whose owner never returned to Live. */
export async function cleanupAbandonedLiveReservations(): Promise<number> {
  const { data, error } = await serviceClient().rpc('cleanup_abandoned_live_session_reservations', { p_limit: 100 })
  if (error) throw new ApiError(503, 'Live reservation cleanup unavailable')
  return Number(data ?? 0)
}
