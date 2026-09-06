import { supabase } from '@/lib/supabase'
import { publicApiUrl } from '@/lib/publicOrigins'
import type {
  ImagelessItem,
  TranslateAndIpaRequest,
  TranslateAndIpaResponse,
} from '@/lib/types/imagelessDeck'
import { assertClientActive, withClientDeadline } from '@/lib/clientDeadline'

const TRANSLATE_TIMEOUT_MS = 30_000

export type TranslateAndIpaItem = ImagelessItem

type TranslateAndIpaErrorResponse = Partial<TranslateAndIpaResponse> & { error?: string; detail?: string }

export function useTranslateAndIpa() {
  async function translateAndIpa(request: TranslateAndIpaRequest, callerSignal?: AbortSignal): Promise<TranslateAndIpaItem[]> {
    return withClientDeadline(async (signal) => {
      const { data: sessionData } = await supabase.auth.getSession()
      assertClientActive(signal)
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Your session expired. Please sign in again.')

      const res = await fetch(publicApiUrl('/api/translate-and-ipa'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
        signal,
      })

      const body = await res.json().catch(() => ({})) as TranslateAndIpaErrorResponse
      if (!res.ok) throw new Error(body.error || body.detail || 'Translation failed')
      return body.items ?? []
    }, TRANSLATE_TIMEOUT_MS, callerSignal)
  }

  return { translateAndIpa }
}
