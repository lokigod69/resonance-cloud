import { corsHeaders, optionsResponse } from './_shared/cors'
import { ApiError, apiErrorResponse, errorResponse, rejectBodyOverLimit, sanitizedProviderError } from './_shared/http'
import { requireSupabaseUser } from './_shared/auth'
import { consumeApiQuota } from './_shared/quota'

const GROK_TOKEN_BODY_MAX_BYTES = 1024

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number, label: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  console.log(`[grok-token] ${label} — starting (${timeoutMs}ms timeout)`)
  return fetch(url, { ...options, signal: controller.signal })
    .then((res) => {
      clearTimeout(timer)
      console.log(`[grok-token] ${label} — completed (status ${res.status})`)
      return res
    })
    .catch((err) => {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        console.error(`[grok-token] ${label} — TIMED OUT after ${timeoutMs}ms`)
        throw new Error(`${label} timed out after ${timeoutMs / 1000}s`)
      }
      console.error(`[grok-token] ${label} — FAILED:`, err.message)
      throw err
    })
}

export async function OPTIONS(req?: Request): Promise<Response> {
  return optionsResponse(req)
}

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireSupabaseUser(req)
    await rejectBodyOverLimit(req, GROK_TOKEN_BODY_MAX_BYTES)
    await consumeApiQuota(user.id, 'grok_token')
  } catch (err) {
    if (err instanceof ApiError) return apiErrorResponse(req, err)
    console.error('[grok-token] Request gate failed:', err instanceof Error ? err.message : err)
    return errorResponse(req, 400, 'Invalid request')
  }

  const xaiApiKey = process.env.XAI_API_KEY || ''
  if (!xaiApiKey) {
    return errorResponse(req, 500, 'Token service is not configured')
  }

  let response: Response
  try {
    response = await fetchWithTimeout('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${xaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { seconds: 600 },
      }),
    }, 10000, 'xAI realtime client secret')
  } catch (err) {
    console.error('[grok-token] Token exchange failed:', err instanceof Error ? err.message : err)
    return sanitizedProviderError(req, 'Token exchange failed')
  }

  const text = await response.text()
  if (!response.ok) {
    console.error('[grok-token] xAI realtime client secret failed:', response.status)
    return sanitizedProviderError(req, 'Token exchange failed')
  }

  return new Response(text, {
    status: 200,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}
