// The user-facing credit balance is the sum of the non-expiring balance
// (profiles.credits: signup grant, invite codes, purchases) and the current
// period's subscription grant (profiles.plan_credits, resets each renewal).
// The server spends plan_credits first; the UI only ever shows the total.

export function totalCredits(
  profile: { credits?: number | null; plan_credits?: number | null } | null | undefined,
): number {
  const base = Number(profile?.credits ?? 0)
  const plan = Number(profile?.plan_credits ?? 0)
  return Math.max(0, base) + Math.max(0, plan)
}
