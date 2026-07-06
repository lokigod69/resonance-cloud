/**
 * Contract tests for the Phase 2B visual scan endpoint.
 *
 * Run: tsx scripts/test-visual-scan.ts
 */

// Default-style imports (house pattern, see test-stripe-billing-shell.ts): under tsx these
// api/ modules surface their exports via CJS interop on `default`, so named value imports fail.
import httpShared from '../api/_shared/http.ts'
import visualScanProviderShared from '../api/_shared/visualScanProvider.ts'
import visualScanEndpoint from '../api/visual-scan.ts'
import type { VisualScanProvider } from '../api/visual-scan.ts'

const { ApiError } = httpShared
const { parseGeminiVisionJson } = visualScanProviderShared
const { createVisualScanPostHandler } = visualScanEndpoint
type ApiErrorInstance = InstanceType<typeof ApiError>

let failures = 0
let passes = 0

function assert(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1
    console.log(`  ok  ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}`)
    if (detail !== undefined) console.error('       ', detail)
  }
}

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/visual-scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    body: JSON.stringify(body),
  })
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  return await res.json() as Record<string, unknown>
}

function handlerFor(provider: VisualScanProvider, options: { quotaError?: ApiErrorInstance } = {}) {
  return createVisualScanPostHandler({
    requireUser: async () => ({
      id: 'user-123',
      email: 'test@example.com',
      appMetadata: {},
      userMetadata: {},
    }),
    consumeQuota: async () => {
      if (options.quotaError) throw options.quotaError
    },
    writeUsage: async () => undefined,
    provider,
  })
}

const baseBody = {
  image: '/9j/4AAQSkZJRgABAQAAAQABAAD/2w==',
  targetLanguage: 'German',
  baseLanguage: 'English',
  level: 'A1',
}

console.log('\n[success object]')
{
  const post = handlerFor({
    scan: async () => ({
      kind: 'object',
      safety: null,
      items: [{
        target_text: 'der Schlüssel',
        base_text: 'key',
        ipa: 'ˈʃlʏsl̩',
        pos: 'noun',
        article: 'der',
        confidence: 'high',
        example: 'Der Schlüssel ist in meiner Tasche.',
        example_gloss: 'The key is in my pocket.',
        alternates: [
          { target_text: 'die Taste', base_text: 'key on a keyboard' },
          { target_text: 'der Schlüsselbund', base_text: 'keychain' },
          { target_text: 'das Schloss', base_text: 'lock' },
        ],
      }],
    }),
  })
  const res = await post(jsonRequest(baseBody))
  const body = await readJson(res)
  const items = body.items as Array<Record<string, unknown>>
  const alternates = items[0]?.alternates as unknown[] | undefined
  assert('status 200', res.status === 200, body)
  assert('kind object', body.kind === 'object', body)
  assert('uses snake_case target_text', items[0]?.target_text === 'der Schlüssel', items[0])
  assert('clamps alternates to two', alternates?.length === 2, alternates)
}

console.log('\n[menu multi-item]')
{
  const post = handlerFor({
    scan: async () => ({
      kind: 'menu',
      safety: null,
      items: Array.from({ length: 12 }, (_, index) => ({
        target_text: `item ${index + 1}`,
        base_text: `meaning ${index + 1}`,
        confidence: 'high',
      })),
    }),
  })
  const res = await post(jsonRequest({ ...baseBody, hint: 'text' }))
  const body = await readJson(res)
  const items = body.items as unknown[]
  assert('status 200', res.status === 200, body)
  assert('kind menu', body.kind === 'menu', body)
  assert('caps line items at eight', items.length === 8, items)
}

console.log('\n[text reading-mode passthrough]')
{
  const post = handlerFor({
    scan: async () => ({
      kind: 'text',
      safety: null,
      items: [{
        target_text: 'bonjour',
        base_text: 'hello',
        confidence: 'high',
      }],
    }),
  })
  const res = await post(jsonRequest({ ...baseBody, targetLanguage: 'French', hint: 'text' }))
  const body = await readJson(res)
  const items = body.items as Array<Record<string, unknown>>
  assert('status 200', res.status === 200, body)
  assert('keeps text kind', body.kind === 'text', body)
  assert('keeps target text as written', items[0]?.target_text === 'bonjour', items[0])
  assert('keeps base meaning separate', items[0]?.base_text === 'hello', items[0])
}

console.log('\n[safety]')
{
  const post = handlerFor({
    scan: async () => ({
      kind: 'unsupported',
      safety: 'sensitive_document',
      items: [{
        target_text: 'passport',
        base_text: 'passport',
        confidence: 'high',
      }],
    }),
  })
  const res = await post(jsonRequest(baseBody))
  const body = await readJson(res)
  const items = body.items as unknown[]
  assert('status 200', res.status === 200, body)
  assert('safety flag preserved', body.safety === 'sensitive_document', body)
  assert('safety strips lexical content', items.length === 0, items)
}

console.log('\n[oversized body]')
{
  const post = handlerFor({
    scan: async () => {
      throw new Error('provider should not run')
    },
  })
  const res = await post(jsonRequest({ ...baseBody, image: 'a'.repeat(2_100_000) }))
  const body = await readJson(res)
  assert('status 413', res.status === 413, body)
}

console.log('\n[quota exceeded]')
{
  const post = handlerFor(
    {
      scan: async () => {
        throw new Error('provider should not run')
      },
    },
    { quotaError: new ApiError(429, 'API quota exceeded', { retry_after_seconds: 3600 }) },
  )
  const res = await post(jsonRequest(baseBody))
  const body = await readJson(res)
  assert('status 429', res.status === 429, body)
  assert('quota detail is distinguishable', body.detail === 'API quota exceeded', body)
}

console.log('\n[malformed model JSON]')
{
  const post = handlerFor({
    scan: async () => parseGeminiVisionJson('not json'),
  })
  const res = await post(jsonRequest(baseBody))
  const body = await readJson(res)
  assert('status 422', res.status === 422, body)
}

if (failures > 0) {
  console.error(`\nVisual scan endpoint: ${failures} failed, ${passes} passed`)
  process.exit(1)
}

console.log(`\nVisual scan endpoint: ${passes} passed`)
