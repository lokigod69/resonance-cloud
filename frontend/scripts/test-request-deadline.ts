import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import * as deadlineModule from '../api/_shared/requestDeadline'
import * as authModule from '../api/_shared/auth'
import * as quotaModule from '../api/_shared/quota'
import * as entitlementsModule from '../api/_shared/entitlements'
import * as lensModule from '../api/visual-scan'
import { assertClientActive, withClientDeadline } from '../src/lib/clientDeadline'

const unwrap = <T>(m: T): T => (m as T & { default?: T }).default ?? m
const { withRequestDeadline, fetchWithRequestDeadline, withCleanupDeadline, assertRequestActive } = unwrap(deadlineModule)
const { requireSupabaseUser } = unwrap(authModule)
const { consumeApiQuota } = unwrap(quotaModule)
const { resolveEntitlements, consumeFeatureAllowance } = unwrap(entitlementsModule)
const { createVisualScanPostHandler } = unwrap(lensModule)
const userId = '11111111-1111-4111-8111-111111111111'
let stalledPath = ''
let failurePath = ''
let providerCalls = 0
let refunds = 0
const requests: string[] = []
const server = createServer((req, res) => {
  const path = new URL(req.url!, 'http://localhost').pathname
  requests.push(path)
  if (path === failurePath) {
    res.writeHead(503, { 'Content-Type': 'application/json' }).end('{"message":"database unavailable"}')
    return
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  if (path === stalledPath || path === '/stalled-body') {
    res.flushHeaders()
    res.write('{')
    return // Real fetch sees headers but cannot finish consuming the response.
  }
  const body = path === '/auth/v1/user' ? { id: userId, app_metadata: {}, user_metadata: {} }
    : path.endsWith('/consume_api_quota') ? { allowed: true, mode: 'enforced' }
      : path.endsWith('/profiles') ? { role: 'learner' }
        : path.endsWith('/user_subscriptions') ? null
          : path.endsWith('/consume_feature_usage') ? { allowed: true, used: 1 }
            : { ok: true }
  res.end(JSON.stringify(body))
})
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
assert.ok(address && typeof address !== 'string')
const base = `http://127.0.0.1:${address.port}`
process.env.SUPABASE_URL = base
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.API_QUOTA_REQUIRE_ENFORCED = 'true'
const request = (signal?: AbortSignal) => new Request(`${base}/request`, { headers: { Authorization: 'Bearer fixture' }, signal })
let passed = 0

try {
  // The clock starts before auth, quota and both parallel entitlement reads.
  for (const path of ['/auth/v1/user', '/rest/v1/rpc/consume_api_quota', '/rest/v1/profiles', '/rest/v1/user_subscriptions']) {
    stalledPath = path
    requests.length = 0
    const start = Date.now()
    const response = await withRequestDeadline(request(), async req => {
      const user = await requireSupabaseUser(req)
      await consumeApiQuota(user.id, 'visual_scan')
      await resolveEntitlements(user.id)
      providerCalls++
      return Response.json({ ok: true })
    }, { timeoutMs: 100, cleanupMs: 40 })
    assert.equal(response.status, 504, path)
    assert.equal(providerCalls, 0, 'No paid provider starts after an expired gate')
    assert.ok(Date.now() - start < 1200, 'Whole handler is bounded, including stalled body')
    passed++
  }
  stalledPath = ''
  failurePath = '/rest/v1/user_subscriptions'
  await assert.rejects(resolveEntitlements(userId), error => (error as { status: number }).status === 503)
  failurePath = ''
  passed++

  // A known debit is returned before cancellation is checked, so it can be compensated.
  const lens = createVisualScanPostHandler({
    requireUser: requireSupabaseUser,
    consumeQuota: id => consumeApiQuota(id, 'visual_scan'),
    consumeAllowance: async id => {
      await consumeFeatureAllowance(id, 'lens_scans', 'lifetime', 1, 3)
      await delay(120) // acknowledgement arrived; work clock expires before the next stage
      return { refund: async () => {
        assertRequestActive() // cleanup has a fresh scope
        await fetchWithRequestDeadline(`${base}/refund`)
        refunds++
      } }
    },
    provider: { scan: async () => { providerCalls++; throw new Error('Must not run') } },
    writeUsage: async () => undefined,
  }, { timeoutMs: 100, cleanupMs: 100 })
  const lensResponse = await lens(new Request(`${base}/api/visual-scan`, {
    method: 'POST', headers: { Authorization: 'Bearer fixture', 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: 'A'.repeat(80), targetLanguage: 'German', baseLanguage: 'English' }),
  }))
  assert.equal(lensResponse.status, 504)
  assert.equal(refunds, 1)
  assert.equal(providerCalls, 0)
  passed++

  const bodyStart = Date.now()
  const bodyResponse = await fetchWithRequestDeadline(`${base}/stalled-body`, {}, 80)
  await assert.rejects(bodyResponse.json())
  assert.ok(Date.now() - bodyStart < 1000)
  passed++

  let cleaned = false
  const cleanupResponse = await withRequestDeadline(request(), async () => {
    try {
      await fetchWithRequestDeadline(`${base}/stalled-body`).then(r => r.json())
    } catch {
      await withCleanupDeadline(async () => {
        const response = await fetchWithRequestDeadline(`${base}/cleanup`)
        cleaned = response.ok
      })
    }
    return Response.json({ ok: true })
  }, { timeoutMs: 80, cleanupMs: 100 })
  assert.equal(cleanupResponse.status, 504)
  assert.equal(cleaned, true)
  passed++

  const [slow, fast] = await Promise.all([
    withRequestDeadline(request(), async () => {
      await delay(80)
      assertRequestActive()
      return Response.json({ ok: true })
    }, { timeoutMs: 30, cleanupMs: 15 }),
    withRequestDeadline(request(), async () => {
      await delay(100)
      assertRequestActive()
      return Response.json({ ok: true })
    }, { timeoutMs: 300, cleanupMs: 20 }),
  ])
  assert.equal(slow.status, 504)
  assert.equal(fast.status, 200, 'Concurrent request scopes are isolated')
  passed++

  const controller = new AbortController()
  const cancelled = withRequestDeadline(request(controller.signal), async () => {
    await fetchWithRequestDeadline(`${base}/stalled-body`).then(r => r.json())
    return Response.json({ ok: true })
  }, { timeoutMs: 500, cleanupMs: 30 })
  controller.abort()
  assert.equal((await cancelled).status, 408)
  passed++

  const hardStart = Date.now()
  const hardResponse = await withRequestDeadline(request(), async () => {
    await delay(40)
    await withCleanupDeadline(() => new Promise(() => undefined))
    return Response.json({ ok: true })
  }, { timeoutMs: 30, cleanupMs: 40 })
  assert.equal(hardResponse.status, 504)
  assert.ok(Date.now() - hardStart < 500, 'An uncooperative cleanup cannot exceed the final response cap')
  passed++

  let lateClientFetches = 0
  await assert.rejects(withClientDeadline(async signal => {
    await delay(80) // stalled session refresh
    assertClientActive(signal)
    lateClientFetches++
    return true
  }, 20), error => error instanceof DOMException && error.name === 'TimeoutError')
  await delay(100)
  assert.equal(lateClientFetches, 0)
  const aborted = new AbortController()
  aborted.abort()
  await assert.rejects(withClientDeadline(async () => true, 50, aborted.signal), error => error instanceof DOMException && error.name === 'AbortError')
  passed++

  const legacyActiveSignal = { aborted: false } as unknown as AbortSignal
  const legacyAbortedSignal = { aborted: true } as unknown as AbortSignal
  assert.doesNotThrow(() => assertClientActive(legacyActiveSignal))
  assert.throws(
    () => assertClientActive(legacyAbortedSignal),
    error => error instanceof DOMException && error.name === 'AbortError',
  )
  passed++
  console.log(`Whole-request deadline tests: ${passed} passed`)
} finally {
  server.closeAllConnections()
  await new Promise<void>(resolve => server.close(() => resolve()))
}
