import assert from 'node:assert/strict'
import telemetry from '../api/_shared/telemetryFetch'

const originalFetch = globalThis.fetch
let forwardedSignal: AbortSignal | null | undefined
globalThis.fetch = async (_input, init) => {
  forwardedSignal = init?.signal
  return new Response('{}')
}
try {
  await telemetry.telemetryFetch('https://example.test/metrics')
  assert.ok(forwardedSignal)
  const deadline = forwardedSignal
  // Keep Node alive because AbortSignal.timeout uses an unref'ed timer.
  await new Promise(resolve => setTimeout(resolve, 1_550))
  assert.equal(deadline.aborted, true)

  const caller = new AbortController()
  await telemetry.telemetryFetch('https://example.test/metrics', { signal: caller.signal })
  caller.abort()
  assert.equal(forwardedSignal?.aborted, true)

  const requestCaller = new AbortController()
  await telemetry.telemetryFetch(new Request('https://example.test/metrics', { signal: requestCaller.signal }))
  requestCaller.abort()
  assert.equal(forwardedSignal?.aborted, true)
  console.log('Telemetry requests: deadline and both caller cancellation forms passed')
} finally {
  globalThis.fetch = originalFetch
}
