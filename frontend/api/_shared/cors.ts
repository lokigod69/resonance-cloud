const PRODUCTION_ORIGINS = new Set([
  'https://resonanz.pro',
  'https://www.resonanz.pro',
  'https://lingwave.ai',
  'https://www.lingwave.ai',
])

const NATIVE_APP_ORIGINS = new Set([
  'capacitor://localhost',
  'ionic://localhost',
])

function isLocalhostOrigin(origin: URL): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
    && ['http:', 'https:'].includes(origin.protocol)
}

function isVercelPreviewOrigin(origin: URL): boolean {
  return origin.protocol === 'https:' && origin.hostname.endsWith('.vercel.app')
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
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
