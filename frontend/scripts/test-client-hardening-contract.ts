import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { signOutAndClearLocalState } from '../src/lib/authSignOut'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

const auth = read('src/hooks/useAuth.ts')
const signOut = auth.slice(auth.indexOf('const signOut = useCallback'), auth.indexOf('// One stable context value'))
assert.match(signOut, /signOut\(\{ scope: 'local' \}\)/, 'sign-out must clear the local auth session')
assert.match(signOut, /signOutAndClearLocalState[\s\S]*writeCachedProfile[\s\S]*invalidatePlan\(\)[\s\S]*setSession\(null\)[\s\S]*setUser\(null\)/, 'sign-out must connect auth failure handling to full local cleanup')

let clearedAfterRejection = false
await signOutAndClearLocalState(
  async () => { throw new Error('network unavailable') },
  () => { clearedAfterRejection = true },
)
assert.equal(clearedAfterRejection, true, 'rejected network sign-out must still run local cleanup')

for (const path of [
  'src/pages/PlansPage.tsx',
  'src/hooks/usePlan.ts',
  'src/hooks/useTranslateAndIpa.ts',
  'src/hooks/useExtractVocabulary.ts',
  'src/hooks/useGenerateImagelessTts.ts',
  'src/hooks/useRegenerateImagelessTts.ts',
  'src/pages/Speak.tsx',
  'src/components/speak/SpeakHistoryPanel.tsx',
  'src/hooks/useVoiceTutor.ts',
  'src/lib/lensApiProvider.ts',
]) {
  const source = read(path)
  assert.ok(source.includes('withClientDeadline'), `${path} must bound the whole client operation`)
  assert.match(source, /signal[,:)]/, `${path} must propagate the deadline signal`)
  assert.doesNotMatch(source, /\.throwIfAborted\(/, `${path} must remain compatible with iOS 15 AbortSignal`)
}

const clientDeadline = read('src/lib/clientDeadline.ts')
assert.match(clientDeadline, /export function assertClientActive\(signal: AbortSignal\)/, 'client deadline must export the iOS 15-safe signal assertion')
assert.doesNotMatch(clientDeadline, /AbortSignal\.(?:any|timeout)|\.throwIfAborted\(/, 'client deadline must use only iOS 15 AbortController primitives')

const grokRealtime = read('src/hooks/useGrokRealtime.ts')
assert.match(grokRealtime, /assertClientActive\(controller\.signal\)/, 'Live token auth must use the iOS 15-safe signal assertion')
assert.doesNotMatch(grokRealtime, /\.throwIfAborted\(|AbortSignal\.(?:any|timeout)/, 'Live token auth must remain compatible with iOS 15 AbortSignal')

const plans = read('src/pages/PlansPage.tsx')
const checkout = plans.slice(plans.indexOf('async function handleSubscribe'), plans.indexOf('function planPrice'))
assert.equal((checkout.match(/create-checkout-session/g) ?? []).length, 1, 'checkout must not retry a spending request')

console.log('Client hardening contract passed')
