import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''
const xaiApiKey = process.env.XAI_API_KEY || ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

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

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization')
  const jwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (!jwt) {
    return json({ error: 'Missing authentication' }, 401)
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: 'Supabase auth client not configured' }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  console.log('[grok-token] Supabase auth.getUser — starting')
  const { data, error } = await supabase.auth.getUser(jwt)
  console.log(`[grok-token] Supabase auth.getUser — completed (${error ? 'error' : data.user ? 'ok' : 'no-user'})`)
  if (error || !data.user) {
    return json({ error: 'Invalid session' }, 401)
  }

  if (!xaiApiKey) {
    return json({ error: 'XAI_API_KEY not configured' }, 500)
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
    return json({ error: err instanceof Error ? err.message : 'Token exchange failed' }, 502)
  }

  const text = await response.text()
  if (!response.ok) {
    return json({ error: 'Token exchange failed', detail: text }, 502)
  }

  return new Response(text, {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
