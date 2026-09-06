import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from './http'
import { getSupabaseAdminEnv } from './billingAccess'
import { requestFetch } from './requestDeadline'
import type { PaidPlanId, PlanInterval } from './planCatalog'

// Keep the reservation shorter than the separately persisted Stripe expiry.
// Any retry while the reservation is active therefore sends an expires_at at
// least 50 minutes in the future and at most 24 hours from first allocation.
export const CHECKOUT_RESERVATION_MS = 23 * 60 * 60 * 1000
export const STRIPE_CHECKOUT_SESSION_MS = 23 * 60 * 60 * 1000 + 50 * 60 * 1000

export type CheckoutReservation = {
  id: string
  plan: PaidPlanId
  interval: PlanInterval
  status: 'reserved' | 'open'
  expiresAt: string
  stripeSessionExpiresAt: string
  stripeCustomerId: string | null
  customerRequestKey: string
  stripeSessionId: string | null
  checkoutUrl: string | null
}

type RawReservation = {
  allowed?: boolean
  reason?: string
  reservation_id?: string
  plan?: PaidPlanId
  plan_interval?: PlanInterval
  status?: 'reserved' | 'open'
  expires_at?: string
  stripe_session_expires_at?: string
  stripe_customer_id?: string
  billing_customer_id?: string
  customer_request_key?: string
  stripe_checkout_session_id?: string
  checkout_url?: string
}

function adminClient(): SupabaseClient {
  const { url, serviceKey } = getSupabaseAdminEnv()
  if (!url || !serviceKey) throw new ApiError(503, 'Checkout reservation service unavailable')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: requestFetch },
  })
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function reserveCheckout(input: {
  userId: string
  plan: PaidPlanId
  interval: PlanInterval
  nowMs?: number
}): Promise<CheckoutReservation> {
  const expiresAt = new Date((input.nowMs ?? Date.now()) + CHECKOUT_RESERVATION_MS).toISOString()
  const stripeSessionExpiresAt = new Date((input.nowMs ?? Date.now()) + STRIPE_CHECKOUT_SESSION_MS).toISOString()
  const { data, error } = await adminClient().rpc('reserve_stripe_checkout', {
    p_user_id: input.userId,
    p_plan: input.plan,
    p_plan_interval: input.interval,
    p_expires_at: expiresAt,
    p_stripe_session_expires_at: stripeSessionExpiresAt,
  })
  if (error) throw new ApiError(503, 'Checkout reservation service unavailable')
  const raw = one(data as RawReservation | RawReservation[] | null)
  if (!raw?.allowed) {
    if (raw?.reason === 'already_subscribed') {
      throw new ApiError(409, 'This account already has an active subscription', {
        code: 'already_subscribed',
      })
    }
    if (raw?.reason === 'checkout_pending') {
      throw new ApiError(409, 'A checkout is already open for this account', {
        code: 'checkout_pending',
        pending_plan: raw.plan,
        pending_interval: raw.plan_interval,
        expires_at: raw.expires_at,
      })
    }
    throw new ApiError(503, 'Checkout reservation service unavailable')
  }
  if (!raw.reservation_id || !raw.expires_at || !raw.stripe_session_expires_at
      || !raw.customer_request_key || !raw.plan || !raw.plan_interval || !raw.status) {
    throw new ApiError(503, 'Checkout reservation service unavailable')
  }
  return {
    id: raw.reservation_id,
    plan: raw.plan,
    interval: raw.plan_interval,
    status: raw.status,
    expiresAt: raw.expires_at,
    stripeSessionExpiresAt: raw.stripe_session_expires_at,
    stripeCustomerId: raw.billing_customer_id ?? raw.stripe_customer_id ?? null,
    customerRequestKey: raw.customer_request_key,
    stripeSessionId: raw.stripe_checkout_session_id ?? null,
    checkoutUrl: raw.checkout_url ?? null,
  }
}

export async function rotateDeletedStripeCustomer(input: {
  userId: string
  deletedCustomerId: string
}): Promise<string> {
  const { data, error } = await adminClient().rpc('rotate_deleted_stripe_customer', {
    p_user_id: input.userId,
    p_deleted_customer_id: input.deletedCustomerId,
  })
  const key = typeof data === 'string' ? data : null
  if (error || !key) throw new ApiError(503, 'Checkout customer service unavailable')
  return key
}

export async function recordCheckoutReservation(input: {
  userId: string
  reservationId: string
  status: 'reserved' | 'open' | 'completed' | 'expired'
  stripeCustomerId?: string | null
  stripeSessionId?: string | null
  checkoutUrl?: string | null
  expiresAt?: string | null
}): Promise<void> {
  const { data, error } = await adminClient().rpc('record_stripe_checkout_reservation', {
    p_user_id: input.userId,
    p_reservation_id: input.reservationId,
    p_status: input.status,
    p_stripe_customer_id: input.stripeCustomerId ?? null,
    p_stripe_checkout_session_id: input.stripeSessionId ?? null,
    p_checkout_url: input.checkoutUrl ?? null,
    p_expires_at: input.expiresAt ?? null,
  })
  const raw = one(data as { updated?: boolean } | Array<{ updated?: boolean }> | null)
  if (error || !raw?.updated) throw new ApiError(503, 'Checkout reservation service unavailable')
}

export async function findCheckoutReservationBySessionId(sessionId: string): Promise<{
  id: string
  userId: string
} | null> {
  const { data, error } = await adminClient()
    .from('stripe_checkout_reservations')
    .select('id,user_id')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle()
  if (error) throw new ApiError(503, 'Checkout reservation service unavailable')
  const row = data as { id?: string; user_id?: string } | null
  return row?.id && row.user_id ? { id: row.id, userId: row.user_id } : null
}

export function isBlockingStripeSubscriptionStatus(status: string): boolean {
  return status !== 'canceled' && status !== 'incomplete_expired'
}

export function isReusableCheckoutSession(session: {
  status?: string | null
  url?: string | null
  expires_at?: number | null
}, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  return session.status === 'open'
    && typeof session.url === 'string'
    && session.url.length > 0
    && typeof session.expires_at === 'number'
    && session.expires_at > nowSeconds
}
