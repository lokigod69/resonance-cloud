// Who is allowed to reach Stripe Checkout — the single source of truth.
//
// Both /api/create-checkout-session (which enforces it) and /api/entitlements
// (whose `billing_available` decides whether /plans renders Subscribe buttons)
// call this. They used to answer the question differently: entitlements looked
// at `profiles.role`, checkout at the `admin_roles` table and app_metadata, so
// a tester flagged via app_metadata could never see the button that the
// checkout endpoint would have honoured (found 2026-07-29).

import { createClient } from '@supabase/supabase-js'
import type { AuthenticatedUser } from './auth'

export type BillingGateUser = Pick<AuthenticatedUser, 'id' | 'appMetadata' | 'userMetadata'>

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

export function getSupabaseAdminEnv() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  }
}

export function createSupabaseAdminClient(): AdminRoleLookupClient | null {
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
  user: BillingGateUser,
  admin = createSupabaseAdminClient(),
): Promise<boolean> {
  if (serverBillingLiveEnabled()) return true
  if (serverSandboxBillingEnabled()) return true
  if (appMetadataAllowsBilling(user.appMetadata)) return true
  if (!admin) return false

  return isAdminByAdminRoles(user.id, admin)
}
