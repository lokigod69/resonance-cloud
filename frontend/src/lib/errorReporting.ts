/**
 * Client-side error sink. Today it only structures the console output and
 * keeps the last few errors in memory (visible via `window.__lingwaveErrors`
 * in DevTools, useful for support screenshots). Wiring a privacy-safe server
 * sink is an owner decision (audit 2026-09-03 F-22) — plug it in here.
 */

type ReportedError = {
  at: string
  message: string
  stack?: string
  componentStack?: string
  route: string
}

const MAX_KEPT = 20
const kept: ReportedError[] = []

declare global {
  interface Window {
    __lingwaveErrors?: ReportedError[]
  }
}

export function reportClientError(error: unknown, componentStack?: string | null): void {
  const err = error instanceof Error ? error : new Error(String(error))
  const entry: ReportedError = {
    at: new Date().toISOString(),
    message: err.message,
    stack: err.stack,
    componentStack: componentStack ?? undefined,
    route: typeof window !== 'undefined' ? window.location.pathname : '',
  }
  kept.push(entry)
  if (kept.length > MAX_KEPT) kept.shift()
  if (typeof window !== 'undefined') window.__lingwaveErrors = kept
  console.error('[lingwave] client error', entry.message, err, componentStack ? { componentStack } : '')
}
