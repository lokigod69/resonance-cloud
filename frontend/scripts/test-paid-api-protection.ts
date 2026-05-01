import assert from 'node:assert/strict'

process.env.SUPABASE_URL = 'https://supabase.test'
process.env.VITE_SUPABASE_URL = 'https://supabase.test'
process.env.SUPABASE_ANON_KEY = 'anon-test-key'
process.env.VITE_SUPABASE_ANON_KEY = 'anon-test-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-key'
process.env.OPENROUTER_API_KEY = 'openrouter-test-key'
process.env.GROQ_API_KEY = 'groq-test-key'
process.env.MISTRAL_API_KEY = 'mistral-test-key'
process.env.XAI_API_KEY = 'xai-test-key'

const providerHosts = [
  'api.openrouter.ai',
  'openrouter.ai',
  'api.groq.com',
  'api.mistral.ai',
  'api.elevenlabs.io',
  'api.x.ai',
  'generativelanguage.googleapis.com',
]

type QuotaResult = {
  allowed: boolean
  mode: 'enforced' | 'monitor_only'
  action: string
  limit_per_minute: number
  limit_per_day: number
  remaining_minute: number
  remaining_day: number
  retry_after_seconds: number
  reason: string | null
}

const defaultQuota: QuotaResult = {
  allowed: true,
  mode: 'monitor_only',
  action: 'test',
  limit_per_minute: 10,
  limit_per_day: 100,
  remaining_minute: 9,
  remaining_day: 99,
  retry_after_seconds: 0,
  reason: null,
}

let providerCalls: string[] = []
let quotaResult: QuotaResult = defaultQuota
let quotaShouldFail = false
let callSequence: string[] = []

function resetMocks() {
  providerCalls = []
  quotaResult = defaultQuota
  quotaShouldFail = false
  callSequence = []
}

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
}

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url
  const host = new URL(url).host

  if (providerHosts.some((providerHost) => host === providerHost)) {
    providerCalls.push(url)
  }

  if (url === 'https://supabase.test/auth/v1/user') {
    callSequence.push('auth')
    const auth = init?.headers instanceof Headers
      ? init.headers.get('Authorization')
      : Array.isArray(init?.headers)
        ? new Headers(init.headers).get('Authorization')
        : new Headers(init?.headers).get('Authorization')
    if (auth !== 'Bearer valid-token') {
      return json({ msg: 'invalid jwt' }, { status: 401 })
    }
    return json({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'phase1c@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    })
  }

  if (url === 'https://supabase.test/rest/v1/rpc/consume_api_quota') {
    callSequence.push('quota')
    if (quotaShouldFail) {
      return json({ message: 'quota rpc unavailable' }, { status: 500 })
    }
    return json(quotaResult)
  }

  if (url === 'https://openrouter.ai/api/v1/chat/completions') {
    callSequence.push('provider:openrouter')
    return json({
      choices: [{ message: { content: '{"words":[{"word":"hola","translation":"hello"}]}' } }],
    })
  }

  if (url === 'https://api.groq.com/openai/v1/chat/completions') {
    callSequence.push('provider:groq-chat')
    return json({ choices: [{ message: { content: 'Hola. Practicamos hoy.' } }] })
  }

  if (url === 'https://api.groq.com/openai/v1/audio/transcriptions') {
    callSequence.push('provider:groq-stt')
    return json({ text: 'hola' })
  }

  if (url === 'https://api.mistral.ai/v1/audio/speech') {
    callSequence.push('provider:mistral')
    return json({ audio_data: Buffer.from('audio').toString('base64') })
  }

  if (url === 'https://api.x.ai/v1/realtime/client_secrets') {
    callSequence.push('provider:xai')
    return json({ value: 'xai-client-secret-test' })
  }

  throw new Error(`Unexpected fetch URL in test: ${url}`)
}

const voiceChat = await import('../api/voice-chat.ts')
const suggestWords = await import('../api/suggest-words.ts')
const grokToken = await import('../api/grok-token.ts')

function request(body: unknown, token?: string): Request {
  const headers: Record<string, string> = {
    Origin: 'https://resonanz.pro',
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  return new Request('https://resonanz.pro/api/test', {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function expectStatus(label: string, response: Response, status: number) {
  assert.equal(response.status, status, label)
  await response.text()
}

const validVoiceBody = {
  audio_base64: null,
  language: 'es',
  history: [],
}

await (async function voiceRejectsMissingAuth() {
  resetMocks()
  const res = await voiceChat.POST(request(validVoiceBody))
  await expectStatus('voice-chat missing auth returns 401', res, 401)
  assert.equal(providerCalls.length, 0, 'voice-chat missing auth must not call providers')
})()

await (async function suggestRejectsMissingAuth() {
  resetMocks()
  const res = await suggestWords.POST(request({
    category: 'Food',
    target_language: 'Spanish',
    base_language: 'English',
    count: 5,
  }))
  await expectStatus('suggest-words missing auth returns 401', res, 401)
  assert.equal(providerCalls.length, 0, 'suggest-words missing auth must not call providers')
})()

await (async function grokRejectsMissingAuth() {
  resetMocks()
  const res = await grokToken.POST(request(undefined))
  await expectStatus('grok-token missing auth returns 401', res, 401)
  assert.equal(providerCalls.length, 0, 'grok-token missing auth must not call providers')
})()

await (async function invalidAuthReturns401() {
  resetMocks()
  const responses = await Promise.all([
    voiceChat.POST(request(validVoiceBody, 'invalid-token')),
    suggestWords.POST(request({
      category: 'Food',
      target_language: 'Spanish',
      base_language: 'English',
      count: 5,
    }, 'invalid-token')),
    grokToken.POST(request(undefined, 'invalid-token')),
  ])

  for (const [index, res] of responses.entries()) {
    await expectStatus(`invalid auth response ${index} returns 401`, res, 401)
  }
  assert.equal(providerCalls.length, 0, 'invalid auth must not call providers')
})()

await (async function corsPreflightDoesNotCallProviders() {
  resetMocks()
  const req = new Request('https://resonanz.pro/api/test', {
    method: 'OPTIONS',
    headers: { Origin: 'https://resonanz.pro' },
  })
  await expectStatus('voice-chat preflight returns 204', await voiceChat.OPTIONS(req), 204)
  await expectStatus('suggest-words preflight returns 204', await suggestWords.OPTIONS(req), 204)
  await expectStatus('grok-token preflight returns 204', await grokToken.OPTIONS(req), 204)
  assert.equal(providerCalls.length, 0, 'preflight must not call providers')
})()

await (async function disallowedCorsOriginGetsNoAllowOrigin() {
  resetMocks()
  const req = new Request('https://resonanz.pro/api/test', {
    method: 'OPTIONS',
    headers: { Origin: 'https://evil.example' },
  })
  const res = await suggestWords.OPTIONS(req)
  await expectStatus('disallowed CORS preflight returns 204', res, 204)
  assert.equal(res.headers.has('Access-Control-Allow-Origin'), false, 'disallowed CORS origin must not be echoed')
  assert.equal(providerCalls.length, 0, 'disallowed CORS preflight must not call providers')
})()

await (async function voiceRejectsOversizedAudioBeforeProvider() {
  resetMocks()
  const res = await voiceChat.POST(request({
    audio_base64: 'A'.repeat(8_000_000),
    language: 'es',
    history: [],
  }, 'valid-token'))
  assert.ok([400, 413].includes(res.status), `expected 400/413, got ${res.status}`)
  await res.text()
  assert.equal(providerCalls.length, 0, 'voice-chat oversized audio must not call providers')
})()

await (async function voiceRejectsOversizedHistoryBeforeProvider() {
  resetMocks()
  const res = await voiceChat.POST(request({
    audio_base64: null,
    language: 'es',
    history: Array.from({ length: 30 }, () => ({ role: 'user', content: 'hola' })),
  }, 'valid-token'))
  assert.ok([400, 413].includes(res.status), `expected 400/413, got ${res.status}`)
  await res.text()
  assert.equal(providerCalls.length, 0, 'voice-chat oversized history must not call providers')
})()

await (async function suggestRejectsBadInputBeforeProvider() {
  resetMocks()
  const res = await suggestWords.POST(request({
    category: 'Food',
    target_language: 'Spanish',
    base_language: 'English',
    count: 99,
  }, 'valid-token'))
  await expectStatus('suggest-words invalid count returns 400', res, 400)
  assert.equal(providerCalls.length, 0, 'suggest-words bad input must not call providers')
})()

await (async function correctionsModeValidationRejectsBeforeProvider() {
  resetMocks()
  const res = await voiceChat.POST(request({
    mode: 'corrections',
    language: 'es',
    native_language: 'en',
    transcript: [{ role: 'user', content: 'hola' }],
  }, 'valid-token'))
  await expectStatus('corrections-mode short transcript returns 400', res, 400)
  assert.equal(providerCalls.length, 0, 'corrections-mode validation rejection must not call providers')
})()

await (async function quotaRpcFailurePreventsProviderCall() {
  resetMocks()
  quotaShouldFail = true
  const res = await suggestWords.POST(request({
    category: 'Food',
    target_language: 'Spanish',
    base_language: 'English',
    count: 5,
  }, 'valid-token'))
  await expectStatus('quota RPC failure returns 429', res, 429)
  assert.equal(providerCalls.length, 0, 'quota RPC failure must not call providers')
})()

await (async function overQuotaPreventsProviderCall() {
  resetMocks()
  quotaResult = {
    ...defaultQuota,
    allowed: false,
    mode: 'enforced',
    remaining_minute: 0,
    remaining_day: 0,
    retry_after_seconds: 42,
    reason: 'minute_limit_exceeded',
  }
  const res = await suggestWords.POST(request({
    category: 'Food',
    target_language: 'Spanish',
    base_language: 'English',
    count: 5,
  }, 'valid-token'))
  await expectStatus('over quota returns 429', res, 429)
  assert.equal(providerCalls.length, 0, 'over-quota request must not call providers')
})()

await (async function successfulRequestCallsProviderAfterGates() {
  resetMocks()
  const res = await suggestWords.POST(request({
    category: 'Food',
    target_language: 'Spanish',
    base_language: 'English',
    count: 5,
  }, 'valid-token'))
  await expectStatus('successful suggest-words returns 200', res, 200)
  assert.deepEqual(
    providerCalls,
    ['https://openrouter.ai/api/v1/chat/completions'],
    'successful suggest-words should call only the expected provider once',
  )
  assert.deepEqual(
    callSequence,
    ['auth', 'quota', 'provider:openrouter'],
    'suggest-words provider call must happen after auth and quota',
  )
})()

await (async function successfulGrokTokenCallsXaiAfterQuota() {
  resetMocks()
  const res = await grokToken.POST(request(undefined, 'valid-token'))
  await expectStatus('successful grok-token returns 200', res, 200)
  assert.deepEqual(
    providerCalls,
    ['https://api.x.ai/v1/realtime/client_secrets'],
    'successful grok-token should call only xAI once',
  )
  assert.deepEqual(
    callSequence,
    ['auth', 'quota', 'provider:xai'],
    'xAI call must happen after auth and quota',
  )
})()

await (async function successfulVoiceChatCallsProviderAfterQuota() {
  resetMocks()
  const res = await voiceChat.POST(request({
    ...validVoiceBody,
    native_language: 'en',
  }, 'valid-token'))
  await expectStatus('successful voice-chat returns 200', res, 200)
  assert.deepEqual(
    providerCalls,
    [
      'https://api.groq.com/openai/v1/chat/completions',
      'https://api.mistral.ai/v1/audio/speech',
    ],
    'successful voice-chat should call Groq chat then Mistral TTS',
  )
  assert.deepEqual(
    callSequence,
    ['auth', 'quota', 'provider:groq-chat', 'provider:mistral'],
    'voice-chat provider calls must happen after auth and quota',
  )
})()

await (async function currentFrontendLanguageValuesRemainAccepted() {
  resetMocks()
  const voiceRes = await voiceChat.POST(request({
    ...validVoiceBody,
    native_language: 'en',
  }, 'valid-token'))
  await expectStatus('voice-chat accepts frontend native_language code', voiceRes, 200)

  resetMocks()
  const suggestRes = await suggestWords.POST(request({
    category: 'Food',
    target_language: 'Spanish',
    base_language: 'English',
    count: 5,
  }, 'valid-token'))
  await expectStatus('suggest-words accepts frontend base_language value', suggestRes, 200)
})()

console.log('Phase 1C paid API protection tests passed')
