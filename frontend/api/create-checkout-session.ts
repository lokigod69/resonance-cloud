import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireSupabaseUser, type AuthenticatedUser } from './_shared/auth'
import { ApiError, apiErrorResponse, errorResponse, jsonResponse, readJsonWithLimit } from './_shared/http'
import { getAllowedOrigin, getAllowedOriginValue, optionsResponse } from './_shared/cors'
import { loadStripeCoreConfig } from './_shared/stripeBilling'
import { isPaidPlanId, isPlanInterval, loadStripePriceId, type PaidPlanId, type PlanInterval } from './_shared/planCatalog'

const CHECKOUT_BODY_MAX_BYTES = 2048

type CheckoutRequestBody = {
  plan?: unknown
  interval?: unknown
}

type CheckoutGateUser = Pick<AuthenticatedUser, 'id' | 'appMetadata' | 'userMetadata'>

type AdminRoleProbe = {
  user_id?: string | null
}

type AdminRoleLookupResult<T> = {
  data: T | null
  error: { message?: string } | null
}

export type AdminRoleLookupClient = {
  from(table: 'admin_roles'): {
    select(columns: 'user_id'): {
      eq(column: 'user_id', value: string): {
        maybeSingle<T>(): Promise<AdminRoleLookupResult<T>>
      }
    }
  }
}

function getSupabaseAdminEnv() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  }
}

function createSupabaseAdminClient(): AdminRoleLookupClient | null {
  const { url, serviceKey } = getSupabaseAdminEnv()
  if (!url || !serviceKey) return null

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }) as unknown as AdminRoleLookupClient
}

function getConfiguredAppOrigin(): string | null {
  return getAllowedOriginValue(process.env.APP_URL)
    ?? getAllowedOriginValue(process.env.VITE_APP_URL)
}

export function resolveCheckoutAppOrigin(req: Request): string | null {
  return getAllowedOrigin(req) ?? getConfiguredAppOrigin()
}

function appMetadataAllowsBilling(appMetadata: Record<string, unknown> | null | undefined): boolean {
  return appMetadata?.is_test_user === true || appMetadata?.stripe_tester === true
}

function serverSandboxBillingEnabled(): boolean {
  return process.env.STRIPE_BILLING_SANDBOX_ENABLED === 'true'
}

// The production switch: checkout opens to every signed-in user only when the
// owner flips STRIPE_BILLING_ENABLED=true in Vercel (after creating the four
// live prices). Until then only sandbox/testers/admins can reach Stripe.
function serverBillingLiveEnabled(): boolean {
  return process.env.STRIPE_BILLING_ENABLED === 'true'
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

async function isAdminByAdminRoles(userId: string, admin: AdminRoleLookupClient): Promise<boolean> {
  const { data, error } = await admin
    .from('admin_roles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle<AdminRoleProbe>()

  if (error) {
    console.warn('[stripe] admin_roles checkout probe failed', error.message ?? error)
    return false
  }

  return data?.user_id === userId
}

export async function isBillingAllowedForCheckout(
  user: CheckoutGateUser,
  admin = createSupabaseAdminClient(),
): Promise<boolean> {
  if (serverBillingLiveEnabled()) return true
  if (serverSandboxBillingEnabled()) return true
  if (appMetadataAllowsBilling(user.appMetadata)) return true
  if (!admin) return false

  return isAdminByAdminRoles(user.id, admin)
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

    return jsonResponse(req, { url: session.url })
  } catch (error) {
    if (error instanceof ApiError) return apiErrorResponse(req, error)
    console.error('[stripe] checkout session failed', error)
    return errorResponse(req, 500, 'Unable to start checkout')
  }
}
