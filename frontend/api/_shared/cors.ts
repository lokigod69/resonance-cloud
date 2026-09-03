// resonanz.pro was dropped 2026-09-03: the domain is dead (DEPLOYMENT_NOT_FOUND)
// and a lapsed registration must never stay a trusted origin.
const PRODUCTION_ORIGINS = new Set([
  'https://lingwave.ai',
  'https://www.lingwave.ai',
])

const NATIVE_APP_ORIGINS = new Set([
  'capacitor://localhost',
  'ionic://localhost',
])

// Only THIS project's Vercel preview deployments, not every tenant on
// vercel.app. Preview hosts look like frontend-<hash>-lokigod69s-projects.vercel.app;
// override the suffix via env if the team slug ever changes.
const PREVIEW_ORIGIN_SUFFIX = process.env.PREVIEW_ORIGIN_SUFFIX || '-lokigod69s-projects.vercel.app'

function isLocalhostOrigin(origin: URL): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
    && ['http:', 'https:'].includes(origin.protocol)
}

function isVercelPreviewOrigin(origin: URL): boolean {
  return origin.protocol === 'https:' && origin.hostname.endsWith(PREVIEW_ORIGIN_SUFFIX)
}

export function getAllowedOrigin(req?: Request): string | null {
  return getAllowedOriginValue(req?.headers.get('Origin'))
}

export function getAllowedOriginValue(rawOrigin: string | null | undefined): string | null {
  if (!rawOrigin) return null
  if (PRODUCTION_ORIGINS.has(rawOrigin)) return rawOrigin
  if (NATIVE_APP_ORIGINS.has(rawOrigin)) return rawOrigin

  try {
    const origin = new URL(rawOrigin)
    const normalizedOrigin = origin.origin
    if (PRODUCTION_ORIGINS.has(normalizedOrigin)) return normalizedOrigin
    if (NATIVE_APP_ORIGINS.has(normalizedOrigin)) return normalizedOrigin
    if (isLocalhostOrigin(origin) || isVercelPreviewOrigin(origin)) {
      return normalizedOrigin
    }
  } catch {
    return null
  }

  return null
}

export function corsHeaders(req?: Request): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    // Let browsers (and the iOS shell) reuse one preflight per endpoint instead
    // of paying a round trip before every call.
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
  const origin = getAllowedOrigin(req)
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

export function optionsResponse(req?: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req),
  })
}
