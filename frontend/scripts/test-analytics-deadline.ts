import assert from 'node:assert/strict'
import analytics from '../api/_shared/analytics'
import deadline from '../api/_shared/requestDeadline'

const names = ['AOS_ANALYTICS_ENABLED', 'AOS_POSTHOG_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'AOS_POSTHOG_DELETION_KEY', 'AOS_POSTHOG_PROJECT_ID'] as const
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

  process.env.AOS_POSTHOG_DELETION_KEY = 'fixture-key'
  process.env.AOS_POSTHOG_PROJECT_ID = 'fixture-project'
  let deletes = 0
  globalThis.fetch = async (_input, init) => {
    if (init?.method === 'DELETE') deletes++
    // Simulate a dependency that returns late even after cancellation.
    await new Promise(resolve => setTimeout(resolve, 80))
    return Response.json({ results: [{ id: 1 }, { id: 2 }] })
  }
  const erased = await deadline.withRequestDeadline(new Request('https://fixture.test/erase'), async () => {
    await analytics.eraseAnalyticsPerson('fixture-user')
    return Response.json({ ok: true })
  }, { timeoutMs: 20, cleanupMs: 10 })
  assert.equal(erased.status, 504)
  await new Promise(resolve => setTimeout(resolve, 100))
  assert.equal(deletes, 0, 'late erasure lookup cannot start a DELETE after the request deadline')
  console.log('Analytics: shared deadline, fail-closed consent, and no late erasure side effects passed')
} finally {
  globalThis.fetch = originalFetch
  console.error = originalError
  for (const name of names) {
    if (originalEnv[name] === undefined) delete process.env[name]
    else process.env[name] = originalEnv[name]
  }
}
