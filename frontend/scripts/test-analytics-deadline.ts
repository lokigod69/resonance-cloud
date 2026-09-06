import assert from 'node:assert/strict'
import analytics from '../api/_shared/analytics'

const names = ['AOS_ANALYTICS_ENABLED', 'AOS_POSTHOG_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const
const originalEnv = Object.fromEntries(names.map(name => [name, process.env[name]]))
const originalFetch = globalThis.fetch
const originalError = console.error
let calls = 0
try {
  process.env.AOS_ANALYTICS_ENABLED = 'true'
  process.env.AOS_POSTHOG_KEY = 'fixture-key'
  process.env.SUPABASE_URL = 'https://fixture.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-key'
  console.error = () => undefined // Expected timeout is deliberately swallowed by telemetry.
  globalThis.fetch = (input, init) => new Promise((resolve, reject) => {
    calls++
    const signal = init?.signal
    if (signal?.aborted) { reject(signal.reason); return }
    const timer = setTimeout(() => {
      const url = String(input)
      resolve(Response.json(url.includes('/profiles') ? { analytics_opt_out: false } : { first: true }))
    }, 1_100)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    }, { once: true })
  })
  const started = Date.now()
  await analytics.trackServerCoreAction({ userId: 'fixture-user', platform: 'web', kind: 'lens_scan' })
  assert.ok(Date.now() - started < 3_600, 'successive telemetry requests must share one total deadline')
  assert.equal(calls, 3, 'core lookup/send and activation should stop within the shared budget')

  calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('opt-out lookup unavailable') }
  await analytics.trackServerEvent({ event: 'core_action', distinctId: 'fixture-user', props: { kind: 'lens_scan' } })
  assert.equal(calls, 1, 'failed consent lookup must suppress the outbound event')
  console.log('Analytics: one total deadline and fail-closed consent lookup passed')
} finally {
  globalThis.fetch = originalFetch
  console.error = originalError
  for (const name of names) {
    if (originalEnv[name] === undefined) delete process.env[name]
    else process.env[name] = originalEnv[name]
  }
}
