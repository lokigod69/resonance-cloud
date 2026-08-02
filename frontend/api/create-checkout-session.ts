import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireSupabaseUser } from './_shared/auth'
import { ApiError, apiErrorResponse, errorResponse, jsonResponse, readJsonWithLimit } from './_shared/http'
import { getAllowedOrigin, getAllowedOriginValue, optionsResponse } from './_shared/cors'
import { loadStripeCoreConfig } from './_shared/stripeBilling'
import { getSupabaseAdminEnv, isBillingAllowedForCheckout } from './_shared/billingAccess'
import { isPaidPlanId, isPlanInterval, loadStripePriceId, type PaidPlanId, type PlanInterval } from './_shared/planCatalog'
import { deterministicUuid, trackServerEvent } from './_shared/analytics'

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

export function resolveCheckoutAppOrigin(req: Request): string | null {
  return getAllowedOrigin(req) ?? getConfiguredAppOrigin()
}

// One active subscription per account: a second Checkout would double-bill
// while only one subscription row is tracked (review finding 2026-07-28).
// Plan/interval changes go through a future portal flow, not a second checkout.
async function hasActiveSubscription(userId: string): Promise<boolean> {
  const { url, serviceKey } = getSupabaseAdminEnv()
  if (!url || !serviceKey) return false

  const admin = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const { data, error } = await admin
    .from('user_subscriptions')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    // Fail closed for money safety: if we cannot verify, do not sell twice.
    console.error('[stripe] subscription probe failed', error.message)
    return true
  }

  const status = (data as { status?: string | null } | null)?.status ?? ''
  return status === 'active' || status === 'trialing'
}

export async function OPTIONS(req: Request): Promise<Response> {
  return optionsResponse(req)
}

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireSupabaseUser(req)
    if (!(await isBillingAllowedForCheckout(user))) {
      throw new ApiError(403, 'Billing checkout is not available for this account yet')
    }
    if (await hasActiveSubscription(user.id)) {
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
    const stripe = new Stripe(config.secretKey)

    const planMetadata = {
      user_id: user.id,
      plan,
      plan_interval: interval,
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?billing=success`,
      cancel_url: `${origin}/dashboard?billing=cancelled`,
      metadata: planMetadata,
      subscription_data: {
        metadata: planMetadata,
      },
    })

    if (!session.url) {
      return errorResponse(req, 502, 'Stripe did not return a checkout URL')
    }

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
