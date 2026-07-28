import { isNativeApp } from '@/lib/platform'

type BillingUser = {
  app_metadata?: Record<string, unknown> | null
  user_metadata?: Record<string, unknown> | null
} | null | undefined

type BillingProfile = {
  role?: string | null
} | null | undefined

function browserSandboxFlag(): string | undefined {
  return (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_STRIPE_BILLING_SANDBOX_ENABLED
}

export function isBillingSandboxEnabled(value = browserSandboxFlag()): boolean {
  return value === 'true'
}

export function isBillingTester(user: BillingUser, profile: BillingProfile): boolean {
  // The native app never shows the Stripe path. It opens an external browser for a
  // digital purchase, which App Review reads as a guideline 3.1.1 violation, and this
  // cannot be left to configuration: the iOS bundle is built on a dev machine, so
  // whatever VITE_STRIPE_BILLING_SANDBOX_ENABLED says in that machine's .env is baked
  // in for every user. On 2026-07-25 that flag was `true`, so a TestFlight build made
  // here would have shown "Subscribe with Stripe Sandbox" to every tester and to the
  // reviewer. Invite-code redemption is unaffected — it is not a purchase.
  if (isNativeApp()) return false
  if (isBillingSandboxEnabled()) return true
  if (profile?.role === 'admin') return true

  const metadata = user?.app_metadata
  return metadata?.is_test_user === true || metadata?.stripe_tester === true
}
