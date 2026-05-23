type BillingUser = {
  user_metadata?: Record<string, unknown> | null
} | null | undefined

type BillingProfile = {
  role?: string | null
} | null | undefined

export function isBillingTester(user: BillingUser, profile: BillingProfile): boolean {
  if (profile?.role === 'admin') return true

  const metadata = user?.user_metadata
  return metadata?.is_test_user === true || metadata?.stripe_tester === true
}
