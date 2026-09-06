import { AsyncLocalStorage } from 'node:async_hooks'
import { corsHeaders } from './cors'

type RequestScope = { signal: AbortSignal; hardEndsAt: number }
const scopes = new AsyncLocalStorage<RequestScope>()
const DATABASE_TIMEOUT_MS = 8_000

class RequestDeadlineError extends Error {
  constructor(readonly status: 408 | 504, message: string) {
    super(message)
    this.name = 'RequestDeadlineError'
  }
}

function abortError(signal: AbortSignal): RequestDeadlineError {
  return signal.reason instanceof RequestDeadlineError
    ? signal.reason
    : new RequestDeadlineError(408, 'Request was cancelled')
}

export function assertRequestActive(): void {
  const signal = scopes.getStore()?.signal
  if (signal?.aborted) throw abortError(signal)
}

/** Both headers and body consumption stay under the same request/stage signal. */
export function fetchWithRequestDeadline(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DATABASE_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  assertRequestActive()
  const callerSignal = init.signal ?? (input instanceof Request ? input.signal : undefined)
  const requestSignal = scopes.getStore()?.signal
  const signals = [AbortSignal.timeout(Math.max(1, Math.ceil(timeoutMs)))]
  if (callerSignal) signals.push(callerSignal)
  if (requestSignal) signals.push(requestSignal)
  return fetchImpl(input, { ...init, signal: AbortSignal.any(signals) })
}

/** Default Supabase transport: fail boundedly, including auth and RPC response bodies. */
export const requestFetch: typeof fetch = (input, init) => fetchWithRequestDeadline(input, init)

function deadlineResponse(req: Request, error: RequestDeadlineError): Response {
  return new Response(JSON.stringify({
    error: error.message,
    code: error.status === 504 ? 'request_timeout' : 'request_cancelled',
  }), {
    status: error.status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

/**
 * One clock starts before auth/body/quota. Expiry aborts work, then allows a
 * bounded cleanup window so an acknowledged allowance debit can be refunded.
 * The final race also bounds a dependency that incorrectly ignores abort.
 */
export async function withRequestDeadline(
  req: Request,
  handler: (request: Request) => Promise<Response>,
  options: { timeoutMs?: number; cleanupMs?: number } = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 45_000
  const cleanupMs = options.cleanupMs ?? 4_000
  const controller = new AbortController()
  const scope: RequestScope = {
    signal: controller.signal,
    hardEndsAt: Date.now() + timeoutMs + cleanupMs,
  }
  let hardTimer: ReturnType<typeof setTimeout> | undefined
  let rejectHardDeadline: ((error: RequestDeadlineError) => void) | undefined
  const hardDeadline = new Promise<never>((_resolve, reject) => { rejectHardDeadline = reject })
  const cancel = (error: RequestDeadlineError) => {
    if (controller.signal.aborted) return
    controller.abort(error)
    scope.hardEndsAt = Math.min(scope.hardEndsAt, Date.now() + cleanupMs)
    hardTimer = setTimeout(() => rejectHardDeadline?.(error), cleanupMs)
  }
  const onCallerAbort = () => cancel(new RequestDeadlineError(408, 'Request was cancelled'))
  const workTimer = setTimeout(() => cancel(new RequestDeadlineError(504, 'Request timed out')), timeoutMs)
  req.signal.addEventListener('abort', onCallerAbort, { once: true })
  if (req.signal.aborted) onCallerAbort()

  try {
    const response = await Promise.race([
      scopes.run(scope, async () => {
        assertRequestActive()
        return handler(new Request(req, { signal: controller.signal }))
      }),
      hardDeadline,
    ])
    return controller.signal.aborted ? deadlineResponse(req, abortError(controller.signal)) : response
  } catch (error) {
    if (controller.signal.aborted) return deadlineResponse(req, abortError(controller.signal))
    if (error instanceof RequestDeadlineError) return deadlineResponse(req, error)
    throw error
  } finally {
    clearTimeout(workTimer)
    if (hardTimer) clearTimeout(hardTimer)
    req.signal.removeEventListener('abort', onCallerAbort)
    // Reject any accidental late provider/database start after the response.
    if (!controller.signal.aborted) controller.abort(new RequestDeadlineError(408, 'Request has ended'))
  }
}

/** A refund/settlement gets a fresh signal, but never outlives the request's hard cap. */
export async function withCleanupDeadline<T>(work: () => Promise<T>, timeoutMs = 3_000): Promise<T> {
  const parent = scopes.getStore()
  const remaining = Math.min(timeoutMs, (parent?.hardEndsAt ?? Number.POSITIVE_INFINITY) - Date.now())
  if (remaining <= 0) throw new RequestDeadlineError(504, 'Cleanup deadline exceeded')
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const error = new RequestDeadlineError(504, 'Cleanup deadline exceeded')
      controller.abort(error)
      reject(error)
    }, remaining)
  })
  try {
    return await Promise.race([
      scopes.run({ signal: controller.signal, hardEndsAt: Date.now() + remaining }, work),
      timeout,
    ])
  } finally {
    if (timer) clearTimeout(timer)
    controller.abort(new RequestDeadlineError(408, 'Cleanup has ended'))
  }
}
