function clientAbortReason(signal: AbortSignal): unknown {
  const reason = (signal as AbortSignal & { reason?: unknown }).reason
  return reason === undefined
    ? new DOMException('Request cancelled', 'AbortError')
    : reason
}

/** Safari 15-safe aborted-state assertion. */
export function assertClientActive(signal: AbortSignal): void {
  if (signal.aborted) throw clientAbortReason(signal)
}

/** Bound the whole operation, including auth and response bodies. Never retries a spending request. */
export async function withClientDeadline<T>(
  work: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  callerSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController()
  let rejectAbort: (reason: unknown) => void = () => undefined
  const cancelled = new Promise<never>((_resolve, reject) => { rejectAbort = reject })
  const abort = (reason: unknown) => {
    if (controller.signal.aborted) return
    controller.abort(reason)
    rejectAbort(reason)
  }
  const onCallerAbort = () => abort(callerSignal ? clientAbortReason(callerSignal) : new DOMException('Request cancelled', 'AbortError'))
  const timer = setTimeout(() => abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs)
  callerSignal?.addEventListener('abort', onCallerAbort, { once: true })
  if (callerSignal?.aborted) onCallerAbort()
  try {
    return await Promise.race([
      Promise.resolve().then(() => {
        assertClientActive(controller.signal)
        return work(controller.signal)
      }),
      cancelled,
    ])
  } finally {
    clearTimeout(timer)
    callerSignal?.removeEventListener('abort', onCallerAbort)
    controller.abort(new DOMException('Request ended', 'AbortError'))
  }
}
