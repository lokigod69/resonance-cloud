type BillingUser = {
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
  if (isBillingSandboxEnabled()) return true
  if (profile?.role === 'admin') return true

  const metadata = user?.user_metadata
  return metadata?.is_test_user === true || metadata?.stripe_tester === true
}
