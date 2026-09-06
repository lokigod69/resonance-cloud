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

const DEFAULT_BODY_READ_TIMEOUT_MS = 30_000

async function readTextWithLimit(req: Request, maxBytes: number, timeoutMs: number): Promise<string> {
  const contentLength = req.headers.get('Content-Length')
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new ApiError(413, 'Request body is too large')
  }

  if (!req.body) return ''

  const reader = req.body.getReader()
  const decoder = new TextDecoder()
  let total = 0
  let text = ''
  let cancelled = false
  let rejectAbort: ((reason: ApiError) => void) | null = null
  const abortPromise = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject
  })
  const cancelRead = (message: string) => {
    if (cancelled) return
    cancelled = true
    rejectAbort?.(new ApiError(408, message))
    void reader.cancel().catch(() => undefined)
  }
  const handleCallerAbort = () => cancelRead('Request body read was cancelled')
  const timeout = setTimeout(() => cancelRead('Request body read timed out'), timeoutMs)
  req.signal.addEventListener('abort', handleCallerAbort, { once: true })

  try {
    if (req.signal.aborted) cancelRead('Request body read was cancelled')
    while (true) {
      const { done, value } = await Promise.race([reader.read(), abortPromise])
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        cancelled = true
        await reader.cancel().catch(() => undefined)
        throw new ApiError(413, 'Request body is too large')
      }
      text += decoder.decode(value, { stream: true })
    }
  } finally {
    clearTimeout(timeout)
    req.signal.removeEventListener('abort', handleCallerAbort)
  }

  text += decoder.decode()
  return text
}

export async function readJsonWithLimit<T>(
  req: Request,
  maxBytes: number,
  bodyReadTimeoutMs = DEFAULT_BODY_READ_TIMEOUT_MS,
): Promise<T> {
  const raw = await readTextWithLimit(req, maxBytes, bodyReadTimeoutMs)
  if (!raw.trim()) {
    throw new ApiError(400, 'Invalid JSON body')
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    throw new ApiError(400, 'Invalid JSON body')
  }
}

export async function rejectBodyOverLimit(
  req: Request,
  maxBytes: number,
  bodyReadTimeoutMs = DEFAULT_BODY_READ_TIMEOUT_MS,
): Promise<void> {
  const raw = await readTextWithLimit(req, maxBytes, bodyReadTimeoutMs)
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
