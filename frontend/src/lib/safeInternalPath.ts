/**
 * Accepts only a same-origin, root-relative path for `navigate()`.
 *
 * `returnTo`-style query params come from the URL, i.e. from whoever crafted
 * the link. react-router collapses `//evil` but not `/\evil`, and a
 * cross-origin result falls through to `window.location.assign` — an open
 * redirect to a phishing page after an otherwise normal session
 * (audit 2026-09-03 C-01).
 */
export function safeInternalPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  try {
    const url = new URL(raw, window.location.origin)
    if (url.origin !== window.location.origin) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
