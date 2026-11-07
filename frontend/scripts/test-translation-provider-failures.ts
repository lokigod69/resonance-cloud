// Offline endpoint regression: all auth, quota, telemetry and provider traffic
// is intercepted. No production data or paid provider calls are made.
import assert from 'node:assert/strict'
import translationEndpoint from '../api/translate-and-ipa.ts'

const { POST } = translationEndpoint
const originalFetch = globalThis.fetch
const originalError = console.error
const testEnv = {
  SUPABASE_URL: 'https://supabase.test',
  VITE_SUPABASE_URL: 'https://supabase.test',
  SUPABASE_ANON_KEY: 'anon-test-key',
  VITE_SUPABASE_ANON_KEY: 'anon-test-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-test-key',
  OPENROUTER_API_KEY: 'private-test-key',
}
const originalEnv = Object.fromEntries(Object.keys(testEnv).map((key) => [key, process.env[key]]))
Object.assign(process.env, testEnv)

let providerCalls = 0
let quotaCalls = 0
let providerResponse: () => Response = () => { throw new Error('Missing test provider response') }
let logs: unknown[][] = []
let usageEvents: Array<{ error_type?: string }> = []

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function success() {
  return json({ choices: [{ message: { content: JSON.stringify({
    items: [{ word: 'hola', translation: 'hello', ipa: '/ˈola/', is_phrase: false }],
  }) } }] })
}

function reset(response: () => Response) {
  providerCalls = 0
  quotaCalls = 0
  logs = []
  usageEvents = []
  providerResponse = response
}

function request() {
  return new Request('https://lingwave.ai/api/translate-and-ipa', {
    method: 'POST',
    headers: {
      Origin: 'capacitor://localhost',
      Authorization: 'Bearer valid-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target_language: 'Spanish',
      base_language: 'English',
      items: [{ word: 'hola', is_phrase: false }],
    }),
  })
}

try {
  console.error = (...args: unknown[]) => { logs.push(args) }
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url === 'https://supabase.test/auth/v1/user') {
      return json({
        id: '11111111-1111-4111-8111-111111111111',
        aud: 'authenticated', role: 'authenticated',
        app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z',
      })
    }
    if (url === 'https://supabase.test/rest/v1/rpc/consume_api_quota') {
      quotaCalls += 1
      return json({ allowed: true, mode: 'enforced' })
    }
    if (url === 'https://supabase.test/rest/v1/pipeline_events') {
      usageEvents.push(JSON.parse(String(init?.body)))
      return json([], 201)
    }
    if (url === 'https://openrouter.ai/api/v1/chat/completions') {
      providerCalls += 1
      return providerResponse()
    }
    throw new Error(`Unexpected fetch in offline test: ${url}`)
  }

  for (const status of [400, 401, 402, 403, 404, 408, 422, 429]) {
    reset(() => new Response('private upstream account details', { status }))
    const response = await POST(request())
    assert.equal(response.status, 502, `${status}: provider errors must not look like learner auth errors`)
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'capacitor://localhost')
    assert.deepEqual(await response.json(), {
      detail: status === 429 ? 'Too many requests. Please wait a moment.' : 'Translation service unavailable',
    })
    assert.equal(providerCalls, 1, `${status}: deterministic provider failure must not retry`)
    assert.equal(quotaCalls, 1)
    assert.equal(usageEvents.length, 1)
    assert.equal(usageEvents[0].error_type, `http_${status}`)
    assert.deepEqual(logs, [['[translate-and-ipa] OpenRouter request failed:', { status }]])
  }

  for (const status of [500, 502, 503]) {
    reset(() => providerCalls === 1 ? new Response('unavailable', { status }) : success())
    const response = await POST(request())
    assert.equal(response.status, 200, `${status}: transient provider failure can recover`)
    assert.equal(providerCalls, 2)
    assert.equal(quotaCalls, 1)
    assert.equal((await response.json()).items[0].translation, 'hello')
  }

  reset(() => {
    if (providerCalls === 1) throw new TypeError('fetch failed')
    return success()
  })
  assert.equal((await POST(request())).status, 200, 'network retry can recover')
  assert.equal(providerCalls, 2)

  for (const name of ['TimeoutError', 'AbortError']) {
    reset(() => { throw new DOMException('private provider response with key private-test-key', name) })
    const response = await POST(request())
    assert.equal(response.status, 502, `${name}: remains a sanitized infrastructure failure`)
    assert.deepEqual(await response.json(), { detail: 'Translation service unavailable' })
    assert.equal(providerCalls, 1, `${name}: must not issue a second paid request`)
    assert.equal(usageEvents.length, 1)
    assert.equal(usageEvents[0].error_type, name)
    assert.deepEqual(logs, [['[translate-and-ipa] OpenRouter attempt failed:', { errorType: name }]])
  }

  reset(() => { throw new TypeError('fetch failed: private upstream account details private-test-key') })
  const networkResponse = await POST(request())
  assert.equal(networkResponse.status, 502)
  assert.deepEqual(await networkResponse.json(), { detail: 'Translation service unreachable' })
  assert.equal(providerCalls, 2)
  assert.deepEqual(logs, Array.from({ length: 2 }, () => [
    '[translate-and-ipa] OpenRouter attempt failed:', { errorType: 'TypeError' },
  ]))

  reset(() => {
    const error = new Error('private upstream account details')
    error.name = 'private-test-key'
    throw error
  })
  assert.equal((await POST(request())).status, 502)
  assert.equal(providerCalls, 1, 'unknown failures are not assumed retryable')
  assert.equal(usageEvents[0].error_type, 'provider_error')
  assert.deepEqual(logs, [['[translate-and-ipa] OpenRouter attempt failed:', { errorType: 'provider_error' }]])

  reset(() => new Response('private upstream account details private-test-key', { status: 200 }))
  const malformedResponse = await POST(request())
  assert.equal(malformedResponse.status, 502)
  assert.deepEqual(await malformedResponse.json(), { detail: 'Translation service unavailable' })
  assert.equal(providerCalls, 1, 'invalid HTTP 200 JSON does not trigger a second paid request')
  assert.equal(usageEvents[0].error_type, 'SyntaxError')
  assert.deepEqual(logs, [['[translate-and-ipa] OpenRouter attempt failed:', { errorType: 'SyntaxError' }]])

  reset(() => new Response('unavailable', { status: 503 }))
  assert.equal((await POST(request())).status, 502, 'persistent failure stays bounded')
  assert.equal(providerCalls, 2)
  assert.equal(quotaCalls, 1)
  console.log('Translation provider failures: offline auth/payment, retry, privacy and CORS checks passed')
} finally {
  globalThis.fetch = originalFetch
  console.error = originalError
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}
