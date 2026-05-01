import { createClient } from '@supabase/supabase-js'
import { ApiError } from './http'

export type ApiQuotaAction = 'voice_chat' | 'suggest_words' | 'grok_token'

export interface ApiQuotaResult {
  allowed: boolean
  mode: 'enforced' | 'monitor_only'
  action: ApiQuotaAction
  limit_per_minute: number
  limit_per_day: number
  remaining_minute: number
  remaining_day: number
  retry_after_seconds: number
  reason: string | null
}

function getSupabaseQuotaEnv() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
  }
}

function normalizeQuotaResult(value: unknown, action: ApiQuotaAction): ApiQuotaResult {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw || typeof raw !== 'object') {
    throw new ApiError(429, 'Quota check unavailable', { mode: 'fail_closed' })
  }
  const row = raw as Record<string, unknown>
  return {
    allowed: row.allowed === true,
    mode: row.mode === 'enforced' ? 'enforced' : 'monitor_only',
    action,
    limit_per_minute: Number(row.limit_per_minute ?? 0),
    limit_per_day: Number(row.limit_per_day ?? 0),
    remaining_minute: Number(row.remaining_minute ?? 0),
    remaining_day: Number(row.remaining_day ?? 0),
    retry_after_seconds: Number(row.retry_after_seconds ?? 0),
    reason: typeof row.reason === 'string' ? row.reason : null,
  }
}

export async function consumeApiQuota(
  userId: string,
  action: ApiQuotaAction,
  requestFingerprint: string | null = null,
): Promise<ApiQuotaResult> {
  const { url, key } = getSupabaseQuotaEnv()
  if (!url || !key) {
    throw new ApiError(429, 'Quota check unavailable', { mode: 'fail_closed' })
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data, error } = await supabase.rpc('consume_api_quota', {
    p_user_id: userId,
    p_action: action,
    p_request_fingerprint: requestFingerprint,
  })

  if (error) {
    throw new ApiError(429, 'Quota check unavailable', { mode: 'fail_closed' })
  }

  const quota = normalizeQuotaResult(data, action)
  if (!quota.allowed) {
    throw new ApiError(429, 'API quota exceeded', {
      retry_after_seconds: quota.retry_after_seconds,
      remaining_day: quota.remaining_day,
      mode: quota.mode,
      reason: quota.reason,
    })
  }

  return quota
}
