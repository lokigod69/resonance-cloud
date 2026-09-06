import { createClient, type User } from '@supabase/supabase-js'
import { ApiError } from './http'
import { assertRequestActive, requestFetch } from './requestDeadline'

export interface AuthenticatedUser {
  id: string
  email: string | null
  appMetadata: User['app_metadata']
  userMetadata: User['user_metadata']
}

function getSupabaseAuthEnv() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  }
}

export async function requireSupabaseUser(req: Request): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get('Authorization') || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()
  if (!token) {
    throw new ApiError(401, 'Missing authentication')
  }

  const { url, anonKey } = getSupabaseAuthEnv()
  if (!url || !anonKey) {
    // A server misconfiguration, not a client fault: 503 keeps the client from
    // telling the user to sign in again (A-12).
    throw new ApiError(503, 'Authentication unavailable')
  }

  const supabase = createClient(url, anonKey, {
    global: { fetch: requestFetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data, error } = await supabase.auth.getUser(token)
  assertRequestActive()
  if (error || !data.user) {
    if (error && (error.status === 0 || (error.status ?? 0) >= 500 || error.name === 'AuthRetryableFetchError')) {
      throw new ApiError(503, 'Authentication unavailable')
    }
    throw new ApiError(401, 'Invalid session')
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    appMetadata: data.user.app_metadata,
    userMetadata: data.user.user_metadata,
  }
}
