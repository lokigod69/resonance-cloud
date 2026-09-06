import { supabase } from '@/lib/supabase'
import { publicApiUrl } from '@/lib/publicOrigins'
import { mockLensScanProvider } from '@/lib/lensMockProvider'
import type { LensScanProvider, LensScanRequest, LensScanResponse } from '@/lib/lensTypes'

type LensApiErrorResponse = Partial<LensScanResponse> & {
  error?: string
  detail?: string
  code?: string
  retry_after_seconds?: number
}

export type LensScanApiErrorCode =
  | 'daily_quota_exceeded'
  | 'trial_exhausted'
  | 'allowance_exhausted'
  | 'session_expired'
  | 'image_unusable'
  | 'service_unavailable'
  | 'api_error'

export class LensScanApiError extends Error {
  readonly status: number
  readonly code: LensScanApiErrorCode

  constructor(message: string, status: number, code: LensScanApiErrorCode = 'api_error') {
    super(message)
    this.name = 'LensScanApiError'
    this.status = status
    this.code = code
  }
}

export function lensErrorTranslationKey(error: unknown): string {
  if (!(error instanceof LensScanApiError)) return 'lens.error.scanFailed'
  switch (error.code) {
    case 'daily_quota_exceeded': return 'lens.error.dailyQuotaExceeded'
    case 'trial_exhausted': return 'lens.error.trialExhausted'
    case 'allowance_exhausted': return 'lens.error.allowanceExhausted'
    case 'session_expired': return 'lens.error.sessionExpired'
    case 'image_unusable': return 'lens.error.imageUnusable'
    case 'service_unavailable': return 'lens.error.serviceUnavailable'
    default: return 'lens.error.scanFailed'
  }
}

export function classifyLensApiError(status: number, providerCode?: string): LensScanApiErrorCode {
  if (status === 429) return 'daily_quota_exceeded'
  if (status === 403 && providerCode === 'lens_trial_exhausted') return 'trial_exhausted'
  if (status === 403 && providerCode === 'lens_allowance_exhausted') return 'allowance_exhausted'
  if (status === 401) return 'session_expired'
  if (status === 422) return 'image_unusable'
  if (status >= 500) return 'service_unavailable'
  return 'api_error'
}

async function authToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new LensScanApiError('Your session expired. Please sign in again.', 401, 'session_expired')
  return token
}

export const lensApiProvider: LensScanProvider = {
  async scan(request: LensScanRequest, options?: { signal?: AbortSignal }): Promise<LensScanResponse> {
    const token = await authToken()
    const response = await fetch(publicApiUrl('/api/visual-scan'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
      signal: options?.signal,
    })

    if (response.status === 404 && import.meta.env.DEV) {
      return mockLensScanProvider.scan(request, options)
    }

    const body = await response.json().catch(() => ({})) as LensApiErrorResponse
    if (!response.ok) {
      const message = body.detail || body.error || 'Lens scan failed'
      throw new LensScanApiError(
        message,
        response.status,
        classifyLensApiError(response.status, body.code),
      )
    }

    return body as LensScanResponse
  },
}
