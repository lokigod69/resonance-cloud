import { fetchWithRequestDeadline } from './requestDeadline'

const TELEMETRY_TIMEOUT_MS = 1_500

/** Optional metrics must not hold a completed voice turn or scan indefinitely. */
export function createTelemetryFetch(operationSignal?: AbortSignal): typeof fetch {
  return (input, init) => {
    const upstreamSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
    const signals = [AbortSignal.timeout(TELEMETRY_TIMEOUT_MS)]
    if (upstreamSignal) signals.push(upstreamSignal)
    if (operationSignal) signals.push(operationSignal)
    return fetchWithRequestDeadline(input, { ...init, signal: AbortSignal.any(signals) }, TELEMETRY_TIMEOUT_MS)
  }
}

export const telemetryFetch = createTelemetryFetch()
