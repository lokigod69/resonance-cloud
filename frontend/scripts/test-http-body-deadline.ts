import assert from 'node:assert/strict'
import * as httpModule from '../api/_shared/http'

const http = (httpModule as typeof httpModule & { default?: typeof httpModule }).default ?? httpModule

function stalledRequest(signal?: AbortSignal, onCancel?: () => void): Request {
  const body = new ReadableStream<Uint8Array>({
    cancel() {
      onCancel?.()
    },
  })
  return new Request('http://localhost/api/test', {
    method: 'POST',
    body,
    signal,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' })
}

const parsed = await http.readJsonWithLimit<{ ok: boolean }>(
  new Request('http://localhost/api/test', { method: 'POST', body: JSON.stringify({ ok: true }) }),
  100,
  100,
)
assert.deepEqual(parsed, { ok: true })

let timeoutCancelled = false
const timeoutStartedAt = Date.now()
await assert.rejects(
  http.readJsonWithLimit(stalledRequest(undefined, () => { timeoutCancelled = true }), 100, 20),
  (error: unknown) => error instanceof http.ApiError && error.status === 408 && /timed out/.test(error.message),
)
assert.ok(Date.now() - timeoutStartedAt < 500)
assert.equal(timeoutCancelled, true)

let callerCancelled = false
const controller = new AbortController()
const callerAbort = http.readJsonWithLimit(
  stalledRequest(controller.signal, () => { callerCancelled = true }),
  100,
  1_000,
)
controller.abort()
await assert.rejects(
  callerAbort,
  (error: unknown) => error instanceof http.ApiError && error.status === 408 && /cancelled/.test(error.message),
)
assert.equal(callerCancelled, true)

await assert.rejects(
  http.readJsonWithLimit(
    new Request('http://localhost/api/test', { method: 'POST', body: JSON.stringify({ tooLarge: true }) }),
    4,
    100,
  ),
  (error: unknown) => error instanceof http.ApiError && error.status === 413,
)

console.log('HTTP body deadline: valid, timeout, caller abort, and byte-limit checks passed')
