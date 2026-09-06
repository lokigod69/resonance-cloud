import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireSupabaseUser } from './_shared/auth'
import { ApiError, apiErrorResponse, errorResponse, jsonResponse, readJsonWithLimit } from './_shared/http'
import { getAllowedOrigin, getAllowedOriginValue, optionsResponse } from './_shared/cors'
import { loadStripeCoreConfig } from './_shared/stripeBilling'
import { getSupabaseAdminEnv, isBillingAllowedForCheckout } from './_shared/billingAccess'
import { isPaidPlanId, isPlanInterval, loadStripePriceId, type PaidPlanId, type PlanInterval } from './_shared/planCatalog'
import { deterministicUuid, trackServerEvent } from './_shared/analytics'
import { assertRequestActive, requestFetch, withRequestDeadline } from './_shared/requestDeadline'
import {
  isBlockingStripeSubscriptionStatus,
  isReusableCheckoutSession,
  recordCheckoutReservation,
  reserveCheckout,
  rotateDeletedStripeCustomer,
} from './_shared/checkoutReservations'

export { isBillingAllowedForCheckout }
export type { AdminRoleLookupClient } from './_shared/billingAccess'

const CHECKOUT_BODY_MAX_BYTES = 2048

type CheckoutRequestBody = {
  plan?: unknown
  interval?: unknown
}

function getConfiguredAppOrigin(): string | null {
  return getAllowedOriginValue(process.env.APP_URL)
    ?? getAllowedOriginValue(process.env.VITE_APP_URL)
}

// The configured app origin wins over the request's Origin so a preview
// deployment (or a lapsed domain) can never become the post-payment landing
// page; the request origin only fills in when nothing is configured (local dev).
export function resolveCheckoutAppOrigin(req: Request): string | null {
  return getConfiguredAppOrigin() ?? getAllowedOrigin(req)
}

// One active subscription per account: a second Checkout would double-bill
// while only one subscription row is tracked (review finding 2026-07-28).
// Plan/interval changes go through a future portal flow, not a second checkout.
// 'checkout_completed' counts as taken: between the session completing and the
// first paid invoice landing, a second checkout would create a second live
// subscription that the tracked row can never cancel (audit 2026-09-03 F-04).
async function getStoredSubscription(userId: string): Promise<{
  status: string
  customerId: string | null
} | null> {
  const { url, serviceKey } = getSupabaseAdminEnv()
  // Fail closed for money safety, like the error branch below.
  if (!url || !serviceKey) throw new ApiError(503, 'Unable to verify subscription status')

  const admin = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { fetch: requestFetch },
  })
  const { data, error } = await admin
    .from('user_subscriptions')
    .select('status,stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    // Fail closed for money safety: if we cannot verify, do not sell twice.
    console.error('[stripe] subscription probe failed', error.message)
    throw new ApiError(503, 'Unable to verify subscription status')
  }

  const row = data as { status?: string | null; stripe_customer_id?: string | null } | null
  if (!row) return null
  return { status: row.status ?? '', customerId: row.stripe_customer_id ?? null }
}

export async function OPTIONS(req: Request): Promise<Response> {
  return optionsResponse(req)
}

async function handlePost(req: Request): Promise<Response> {
  try {
    const user = await requireSupabaseUser(req)
    if (!(await isBillingAllowedForCheckout(user))) {
      throw new ApiError(403, 'Billing checkout is not available for this account yet')
    }
    const storedSubscription = await getStoredSubscription(user.id)
    if (storedSubscription && isBlockingStripeSubscriptionStatus(storedSubscription.status)) {
      throw new ApiError(409, 'This account already has an active subscription', {
        code: 'already_subscribed',
      })
    }

    const origin = resolveCheckoutAppOrigin(req)
    if (!origin) {
      throw new ApiError(400, 'Checkout redirect origin is not safely configured')
    }

    const body = await readJsonWithLimit<CheckoutRequestBody>(req, CHECKOUT_BODY_MAX_BYTES)
    if (!isPaidPlanId(body.plan) || !isPlanInterval(body.interval)) {
      throw new ApiError(400, 'A valid plan (standard | premium) and interval (week | month) are required')
    }
    const plan: PaidPlanId = body.plan
    const interval: PlanInterval = body.interval

    const config = loadStripeCoreConfig()
    const priceId = loadStripePriceId(plan, interval)
    const stripe = new Stripe(config.secretKey, { timeout: 10_000, maxNetworkRetries: 0 })
    let reservation = await reserveCheckout({ userId: user.id, plan, interval })

    if (reservation.stripeSessionId) {
      assertRequestActive()
      const existingSession = await stripe.checkout.sessions.retrieve(reservation.stripeSessionId)
      assertRequestActive()
      if (isReusableCheckoutSession(existingSession)) {
        return jsonResponse(req, { url: existingSession.url })
      }
      await recordCheckoutReservation({
        userId: user.id,
        reservationId: reservation.id,
        status: existingSession.status === 'complete' ? 'completed' : 'expired',
      })
      if (existingSession.status === 'complete') {
        throw new ApiError(409, 'This account already completed checkout', {
          code: 'already_subscribed',
        })
      }
      reservation = await reserveCheckout({ userId: user.id, plan, interval })
    }

    let customerId = reservation.stripeCustomerId ?? storedSubscription?.customerId ?? null
    let customerRequestKey = reservation.customerRequestKey
    if (customerId) {
      assertRequestActive()
      const customer = await stripe.customers.retrieve(customerId)
      assertRequestActive()
      if (customer.deleted) {
        customerRequestKey = await rotateDeletedStripeCustomer({
          userId: user.id,
          deletedCustomerId: customerId,
        })
        customerId = null
      } else if (customer.metadata?.user_id && customer.metadata.user_id !== user.id) {
        throw new ApiError(503, 'Stored billing customer does not match this account')
      } else if (!customer.metadata?.user_id) {
        assertRequestActive()
        await stripe.customers.update(customerId, { metadata: { user_id: user.id } })
        assertRequestActive()
      }
    }

    if (!customerId) {
      assertRequestActive()
      const customer = await stripe.customers.create({
        metadata: { user_id: user.id },
      }, { idempotencyKey: `checkout-customer:${customerRequestKey}` })
      assertRequestActive()
      customerId = customer.id
    }

    assertRequestActive()
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    })
    assertRequestActive()
    if (subscriptions.has_more) {
      throw new ApiError(503, 'Unable to verify all Stripe subscriptions for this account')
    }
    if (subscriptions.data.some(subscription => isBlockingStripeSubscriptionStatus(subscription.status))) {
      throw new ApiError(409, 'This account already has a Stripe subscription', {
        code: 'already_subscribed',
      })
    }

    await recordCheckoutReservation({
      userId: user.id,
      reservationId: reservation.id,
      status: 'reserved',
      stripeCustomerId: customerId,
    })

    const planMetadata = {
      user_id: user.id,
      plan,
      plan_interval: interval,
      checkout_reservation_id: reservation.id,
    }

    assertRequestActive()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?billing=success`,
      cancel_url: `${origin}/dashboard?billing=cancelled`,
      metadata: planMetadata,
      subscription_data: {
        metadata: planMetadata,
      },
      expires_at: Math.floor(new Date(reservation.stripeSessionExpiresAt).getTime() / 1000),
    }, { idempotencyKey: `checkout-session:${reservation.id}` })
    assertRequestActive()

    if (!session.url) {
      return errorResponse(req, 502, 'Stripe did not return a checkout URL')
    }

    await recordCheckoutReservation({
      userId: user.id,
      reservationId: reservation.id,
      status: 'open',
      stripeCustomerId: customerId,
      stripeSessionId: session.id,
      checkoutUrl: session.url,
      expiresAt: new Date(session.expires_at * 1000).toISOString(),
    })

    // Portfolio trial_start: entered evaluation with paid intent = a Checkout
    // session exists. Checkout is web-only by design, so platform reads web.
    await trackServerEvent({
      event: 'trial_start',
      distinctId: user.id,
      platform: 'web',
      uuid: deterministicUuid(`trial_start:${session.id}`),
      props: { plan, interval },
    })

    return jsonResponse(req, { url: session.url })
  } catch (error) {
    if (error instanceof ApiError) return apiErrorResponse(req, error)
    console.error('[stripe] checkout session failed', error)
    return errorResponse(req, 500, 'Unable to start checkout')
  }
}

export async function POST(req: Request): Promise<Response> {
  return withRequestDeadline(req, handlePost, { timeoutMs: 20_000, cleanupMs: 2_000 })
}
