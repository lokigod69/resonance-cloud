import { supabase } from '@/lib/supabase'
import { publicApiUrl } from '@/lib/publicOrigins'
import { mockLensScanProvider } from '@/lib/lensMockProvider'
import type { LensScanProvider, LensScanRequest, LensScanResponse } from '@/lib/lensTypes'

type LensApiErrorResponse = Partial<LensScanResponse> & {
  error?: string
  detail?: string
  retry_after_seconds?: number
}

export class LensScanApiError extends Error {
  readonly status: number
  readonly code: 'quota_exceeded' | 'api_error'

  constructor(message: string, status: number, code: LensScanApiError['code'] = 'api_error') {
    super(message)
    this.name = 'LensScanApiError'
    this.status = status
    this.code = code
  }
}

export function isLensQuotaError(error: unknown): boolean {
  return error instanceof LensScanApiError && error.code === 'quota_exceeded'
}

async function authToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new LensScanApiError('Your session expired. Please sign in again.', 401)
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
        response.status === 429 ? 'quota_exceeded' : 'api_error',
      )
    }

    return body as LensScanResponse
  },
}
