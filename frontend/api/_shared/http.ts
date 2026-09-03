import { corsHeaders } from './cors'

export class ApiError extends Error {
  readonly status: number
  readonly payload?: Record<string, unknown>

  constructor(
    status: number,
    message: string,
    payload?: Record<string, unknown>,
  ) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'application/json',
    },
  })
}

export function errorResponse(
  req: Request,
  status: number,
  message: string,
  payload: Record<string, unknown> = {},
): Response {
  const key = status === 429 ? 'detail' : 'error'
  return jsonResponse(req, { [key]: message, ...payload }, status)
}

export function apiErrorResponse(req: Request, error: ApiError): Response {
  return errorResponse(req, error.status, error.message, error.payload)
}

async function readTextWithLimit(req: Request, maxBytes: number): Promise<string> {
  const contentLength = req.headers.get('Content-Length')
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new ApiError(413, 'Request body is too large')
  }

  if (!req.body) return ''

  const reader = req.body.getReader()
  const decoder = new TextDecoder()
  let total = 0
  let text = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined)
      throw new ApiError(413, 'Request body is too large')
    }
    text += decoder.decode(value, { stream: true })
  }

  text += decoder.decode()
  return text
}

export async function readJsonWithLimit<T>(req: Request, maxBytes: number): Promise<T> {
  const raw = await readTextWithLimit(req, maxBytes)
  if (!raw.trim()) {
    throw new ApiError(400, 'Invalid JSON body')
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    throw new ApiError(400, 'Invalid JSON body')
  }
}

export async function rejectBodyOverLimit(req: Request, maxBytes: number): Promise<void> {
  const raw = await readTextWithLimit(req, maxBytes)
  if (raw.trim().length > 0) {
    throw new ApiError(400, 'Request body is not supported')
  }
}

export function sanitizedProviderError(req: Request, message = 'Upstream provider unavailable'): Response {
  return errorResponse(req, 502, message)
}

/**
 * fetch() with a hard deadline. Every upstream call made from api/ carries one:
 * a hung provider would otherwise pin the function until the platform kills it,
 * and the client would then parse an HTML 504 instead of our JSON error.
 * `fetchImpl` is resolved at call time so contract tests can swap the global.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
