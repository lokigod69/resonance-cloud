// Curation flags for the Speak surface. Test-lab affordances (novelty accents,
// raw provider detail) stay available to admins but are hidden from normal
// learners for the TestFlight beta. Same role-gate pattern as billingFlags.ts.

type CurationProfile = {
  role?: string | null
} | null | undefined

export function canUseExperimentalSpeakOptions(profile: CurationProfile): boolean {
  return profile?.role === 'admin'
}
