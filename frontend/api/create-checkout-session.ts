import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireSupabaseUser, type AuthenticatedUser } from './_shared/auth'
import { ApiError, apiErrorResponse, errorResponse, jsonResponse } from './_shared/http'
import { getAllowedOrigin, getAllowedOriginValue, optionsResponse } from './_shared/cors'
import { loadStripeBillingConfig } from './_shared/stripeBilling'

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

    const origin = resolveCheckoutAppOrigin(req)
    if (!origin) {
      throw new ApiError(400, 'Checkout redirect origin is not safely configured')
    }
    const config = loadStripeBillingConfig()
    const stripe = new Stripe(config.secretKey)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      line_items: [{ price: config.priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?billing=success`,
      cancel_url: `${origin}/dashboard?billing=cancelled`,
      metadata: {
        user_id: user.id,
        subscription_credits: String(config.subscriptionCredits),
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          subscription_credits: String(config.subscriptionCredits),
        },
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
