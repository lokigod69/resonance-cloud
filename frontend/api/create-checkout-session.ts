import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireSupabaseUser } from './_shared/auth'
import { ApiError, apiErrorResponse, errorResponse, jsonResponse } from './_shared/http'
import { optionsResponse } from './_shared/cors'
import { loadStripeBillingConfig } from './_shared/stripeBilling'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

type ProfileProbe = {
  role?: string | null
}

function getAppOrigin(req: Request): string {
  const origin = req.headers.get('Origin')
  if (origin) return origin
  return process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:5173'
}

function userMetadataAllowsBilling(userMetadata: Record<string, unknown> | null | undefined): boolean {
  return userMetadata?.is_test_user === true || userMetadata?.stripe_tester === true
}

async function isBillingAllowed(userId: string, userMetadata: Record<string, unknown>): Promise<boolean> {
  if (userMetadataAllowsBilling(userMetadata)) return true
  if (!supabaseUrl || !supabaseServiceKey) return false

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const { data } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle<ProfileProbe>()

  return data?.role === 'admin'
}

export async function OPTIONS(req: Request): Promise<Response> {
  return optionsResponse(req)
}

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireSupabaseUser(req)
    if (!(await isBillingAllowed(user.id, user.userMetadata))) {
      throw new ApiError(403, 'Billing checkout is not available for this account yet')
    }

    const config = loadStripeBillingConfig()
    const stripe = new Stripe(config.secretKey)
    const origin = getAppOrigin(req)

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
