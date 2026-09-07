import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { localizeAuthProviderError } from '../src/lib/authError.ts'
import { resolveLandingLocale, resolvePageDocumentLocale } from '../src/hooks/useLandingLocale.ts'
import {
  UI_LOCALE_PREFERENCE_KEY,
  persistProfileUiLocale,
  readStoredUiLocale,
  resolveBrowserUiLocale,
  resolveUiLocale,
} from '../src/lib/localePreference.ts'

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

const storage = new MemoryStorage()
storage.setItem(UI_LOCALE_PREFERENCE_KEY, 'es')
assert.equal(readStoredUiLocale(storage), 'es')
assert.equal(resolveUiLocale({ profileBaseLanguage: 'Japanese', storage, browserLocales: ['pt-BR'] }), 'ja', 'profile locale wins')
assert.equal(resolveUiLocale({ storage, browserLocales: ['pt-BR'] }), 'es', 'stored locale wins while signed out')

storage.setItem(UI_LOCALE_PREFERENCE_KEY, 'pt-BR')
assert.equal(readStoredUiLocale(storage), undefined, 'stored preference must be a canonical locale code')
assert.equal(resolveUiLocale({ storage, browserLocales: ['pt-BR'] }), 'pt', 'supported browser regional tag resolves')
assert.equal(resolveBrowserUiLocale(['ceb-PH']), 'ceb', 'Cebuano browser tag resolves to the Bisaya UI pack')
assert.equal(resolveUiLocale({ storage, browserLocales: ['fil-PH', 'zh-CN'] }), 'en', 'unsupported languages are not coerced')

assert.equal(persistProfileUiLocale('Bisaya', storage), true)
assert.equal(storage.getItem(UI_LOCALE_PREFERENCE_KEY), 'ceb')
assert.equal(persistProfileUiLocale('Tagalog', storage), false, 'unsupported profile values are not stored')
assert.equal(storage.getItem(UI_LOCALE_PREFERENCE_KEY), 'ceb')

const deniedStorage = {
  getItem() { throw new DOMException('denied', 'SecurityError') },
  setItem() { throw new DOMException('denied', 'SecurityError') },
}
assert.equal(resolveUiLocale({ storage: deniedStorage, browserLocales: ['de-DE'] }), 'de', 'denied storage falls through safely')
assert.equal(persistProfileUiLocale('German', deniedStorage), false, 'denied storage does not break profile hydration')

const t = (key: string) => `localized:${key}`
assert.equal(localizeAuthProviderError(t, 'Invalid login credentials'), 'localized:common.somethingWentWrong')
assert.equal(localizeAuthProviderError(t, 'Email not confirmed'), 'localized:auth.confirmEmail')
assert.equal(localizeAuthProviderError(t, 'Password should be at least 6 characters'), 'localized:auth.passwordTooShort')

assert.equal(resolveLandingLocale('', 'es-ES'), 'en', 'marketing remains English for unsupported landing locales')
assert.equal(resolveLandingLocale('?lang=fr', 'es-ES'), 'fr', 'landing URL locale wins')
assert.equal(resolvePageDocumentLocale({ pathname: '/', search: '', browserLanguage: 'es-ES', appLocale: 'es' }), 'en', 'Spanish-browser marketing declares its actual English copy')
assert.equal(resolvePageDocumentLocale({ pathname: '/', search: '?lang=fr', browserLanguage: 'es-ES', appLocale: 'es' }), 'fr', 'French marketing override owns document language')
assert.equal(resolvePageDocumentLocale({ pathname: '/login', search: '', browserLanguage: 'es-ES', appLocale: 'es' }), 'es', 'login declares the app locale')

const loginSource = readFileSync(new URL('../src/pages/Login.tsx', import.meta.url), 'utf8')
const plansSource = readFileSync(new URL('../src/pages/PlansPage.tsx', import.meta.url), 'utf8')
assert.ok(!loginSource.includes('setError(error)'), 'Login does not display raw auth-provider errors')
assert.ok(!plansSource.includes("payload?.error || t('plans.checkoutError')"), 'Plans does not display raw checkout-provider errors')
assert.ok(plansSource.includes("payload?.code === 'already_subscribed'"), 'Plans retains the useful localized subscription conflict')

console.log('test-locale-preference: OK')
