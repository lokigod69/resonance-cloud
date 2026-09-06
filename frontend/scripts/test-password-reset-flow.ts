import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { translations, type Locale } from '../src/lib/translations.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')

function read(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf8')
}

function assertIncludes(source: string, needle: string, label: string): void {
  assert.ok(source.includes(needle), `${label} must include ${needle}`)
}

const loginSource = read('src/pages/Login.tsx')
assertIncludes(loginSource, 'resetPasswordForEmail', 'Login reset request flow')
assertIncludes(loginSource, "redirectTo: getPublicWebUrl('/reset-password')", 'Login reset redirect uses the canonical public origin')
assertIncludes(loginSource, "t('auth.forgotPassword')", 'Login forgot-password link')
assertIncludes(loginSource, "t('auth.emailPlaceholder')", 'Login email placeholder translation')
assertIncludes(loginSource, "t('auth.resetRequestTitle')", 'Login reset request title')
assertIncludes(loginSource, "t('auth.resetRequestSent')", 'Login reset request success message')

const resetPasswordPath = resolve(root, 'src/pages/ResetPassword.tsx')
assert.ok(existsSync(resetPasswordPath), 'ResetPassword page must exist')
const resetPasswordSource = read('src/pages/ResetPassword.tsx')
assertIncludes(resetPasswordSource, 'PASSWORD_RECOVERY', 'ResetPassword recovery event listener')
const recoveryProbeSource = resetPasswordSource.slice(
  resetPasswordSource.indexOf('supabase.auth.getSession()'),
  resetPasswordSource.indexOf('supabase.auth.onAuthStateChange'),
)
assert.ok(
  !recoveryProbeSource.includes('setHasRecoverySession'),
  'An ordinary getSession result must not authorize password recovery',
)
assertIncludes(resetPasswordSource, 'disabled={loading || checkingRecovery || !hasRecoverySession}', 'ResetPassword form stays disabled outside recovery flow')
assertIncludes(resetPasswordSource, 'supabase.auth.updateUser({ password })', 'ResetPassword update call')
assertIncludes(resetPasswordSource, 'minLength={6}', 'ResetPassword minimum password length')
assertIncludes(resetPasswordSource, "t('auth.resetPasswordTitle')", 'ResetPassword title translation')
assertIncludes(resetPasswordSource, "t('auth.resetPasswordSuccess')", 'ResetPassword success translation')
assertIncludes(resetPasswordSource, "navigate('/dashboard'", 'ResetPassword success navigation')

const appSource = read('src/App.tsx')
assertIncludes(appSource, "const ResetPassword = lazyWithRetry(routeImports.resetPassword, 'reset-password')", 'App lazy route import')
assertIncludes(appSource, '<Route path="/reset-password" element={<ResetPassword />} />', 'App reset-password route')
const resetRouteIndex = appSource.indexOf('<Route path="/reset-password" element={<ResetPassword />} />')
const publicRouteIndex = appSource.indexOf('<Route element={<PublicRoute />}>')
assert.ok(
  resetRouteIndex > -1 && publicRouteIndex > -1 && resetRouteIndex < publicRouteIndex,
  '/reset-password route must be outside and before PublicRoute',
)

const requiredKeys = [
  'auth.forgotPassword',
  'auth.emailPlaceholder',
  'auth.backToSignIn',
  'auth.resetRequestTitle',
  'auth.resetRequestDescription',
  'auth.sendResetLink',
  'auth.resetRequestSent',
  'auth.resetRequestFailed',
  'auth.resetPasswordTitle',
  'auth.resetPasswordDescription',
  'auth.newPassword',
  'auth.newPasswordPlaceholder',
  'auth.confirmNewPassword',
  'auth.confirmNewPasswordPlaceholder',
  'auth.updatePassword',
  'auth.passwordTooShort',
  'auth.passwordsDoNotMatch',
  'auth.resetPasswordSuccess',
  'auth.resetPasswordInvalid',
  'auth.resetPasswordChecking',
  'auth.resetPasswordFailed',
] as const

for (const locale of ['en', 'de', 'fr'] as Locale[]) {
  for (const key of requiredKeys) {
    assert.ok(
      typeof translations[locale]?.[key] === 'string' && translations[locale][key].length > 0,
      `Missing ${locale} translation for ${key}`,
    )
  }
}

console.log('Password reset flow contract passed')
