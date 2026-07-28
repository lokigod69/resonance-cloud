import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

let failures = 0
let passes = 0

function assert(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1
    process.stdout.write(`  ok  ${name}\n`)
    return
  }

  failures += 1
  process.stderr.write(`  FAIL ${name}\n`)
  if (detail !== undefined) process.stderr.write(`        ${formatDetail(detail)}\n`)
}

function assertIncludes(name: string, source: string, needle: string) {
  assert(name, source.includes(needle), `expected to find ${needle}`)
}

function assertNotIncludes(name: string, source: string, needle: string) {
  assert(name, !source.includes(needle), `expected not to find ${needle}`)
}

const appSource = readSource('../src/App.tsx')
const loginSource = readSource('../src/pages/Login.tsx')
const onboardingSource = readSource('../src/pages/Onboarding.tsx')
const authSource = readSource('../src/hooks/useAuth.ts')
const packageSource = readSource('../package.json')

process.stdout.write('\n[oauth-safe onboarding route gate]\n')
assertIncludes('App reads the current route for onboarding redirects', appSource, 'useLocation')
assertIncludes('App has a single onboarding redirect predicate', appSource, 'shouldRedirectToOnboarding')
assertIncludes('route gate waits for profile readiness', appSource, 'profileReady')
assertIncludes('route gate respects active profile loading', appSource, 'profileLoading')
assertIncludes('route gate fails open when profile fetch failed', appSource, 'profileLoadError')
assertIncludes('route gate does not redirect from onboarding to itself', appSource, "pathname !== '/onboarding'")
// The gate keys on the TARGET language: base_language carries a DB default
// ('English'), so a gate on it can never fire — that exact bug shipped
// onboarding as dead code until 2026-07-27.
assertIncludes('route gate checks profile target_language', appSource, '!profile.target_language?.trim()')
assertNotIncludes('route gate must not key on base_language (DB default makes it dead)', appSource, '!profile.base_language?.trim()')
assertIncludes('route gate honors the local chosen-target fallback (pre-migration devices)', appSource, 'hasLocallyChosenTargetLanguage(session.user.id)')
assertIncludes('route gate redirects missing-language users to onboarding', appSource, '<Navigate to="/onboarding" replace')

const publicRouteStart = appSource.indexOf('function PublicRoute()')
const publicOnboardingRedirect = appSource.indexOf('to="/onboarding"', publicRouteStart)
const publicDashboardRedirect = appSource.indexOf('to="/dashboard"', publicRouteStart)
assert(
  'PublicRoute sends authenticated missing-language users to onboarding before dashboard',
  publicRouteStart > -1 && publicOnboardingRedirect > publicRouteStart && publicDashboardRedirect > publicOnboardingRedirect,
  { publicRouteStart, publicOnboardingRedirect, publicDashboardRedirect },
)

const protectedRouteStart = appSource.indexOf('function ProtectedRoute()')
const protectedOnboardingRedirect = appSource.indexOf('to="/onboarding"', protectedRouteStart)
assert(
  'ProtectedRoute gates app deep links behind onboarding when profile requires it',
  protectedRouteStart > -1 && protectedOnboardingRedirect > protectedRouteStart,
  { protectedRouteStart, protectedOnboardingRedirect },
)

process.stdout.write('\n[auth profile loading contract]\n')
assertIncludes('useAuth exposes profileReady', authSource, 'profileReady: boolean')
assertIncludes('useAuth exposes profileLoadError', authSource, 'profileLoadError: boolean')
assertIncludes('profile fetch success marks profile ready', authSource, 'setProfileReady(true)')
assertIncludes('profile fetch failures mark profile load error', authSource, 'setProfileLoadError(true)')
assertIncludes('profile fetch success clears profile load error', authSource, 'setProfileLoadError(false)')

process.stdout.write('\n[login no longer owns onboarding routing]\n')
assertIncludes('email sign-in navigates to dashboard after auth success', loginSource, "navigate('/dashboard')")
assertNotIncludes('Login does not use onboarding localStorage as routing authority', loginSource, 'resonance_onboarding_done')
assertNotIncludes('Login does not count decks to decide onboarding', loginSource, ".from('decks')")
assertNotIncludes('Login does not fetch current user for onboarding routing', loginSource, 'supabase.auth.getUser')

process.stdout.write('\n[onboarding completion contract]\n')
assertIncludes('Onboarding writes selected base_language to profile', onboardingSource, 'update({ base_language: selectedLanguage })')
assertIncludes('Onboarding refreshes profile after base_language update', onboardingSource, 'await refreshProfile()')
assertIncludes('Onboarding persists the target language to the profile', onboardingSource, 'update({ target_language: selectedTarget })')
assertIncludes('Onboarding closes the gate locally even if the profile write fails', onboardingSource, 'markTargetLanguageChosen(user.id)')
assertIncludes('Onboarding seeds the canonical active language', onboardingSource, 'setActiveLanguage(selectedTarget)')
assertIncludes('Onboarding finishes with a replace navigation (no back-into-onboarding)', onboardingSource, 'navigate(destination, { replace: true })')
assertIncludes('Onboarding honors the deep-link a user was heading to', onboardingSource, 'location.state')
assertIncludes('oauth onboarding contract script is runnable from package.json', packageSource, 'test:oauth-onboarding')

process.stdout.write(`\n${passes} passed, ${failures} failed\n`)
if (failures > 0) process.exit(1)

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
}

function formatDetail(detail: unknown) {
  if (typeof detail === 'string') return detail
  return JSON.stringify(detail)
}
