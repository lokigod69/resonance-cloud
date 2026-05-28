import { supabase } from '@/lib/supabase'
import type {
  ImagelessItem,
  TranslateAndIpaRequest,
  TranslateAndIpaResponse,
} from '@/lib/types/imagelessDeck'

export type TranslateAndIpaItem = ImagelessItem

type TranslateAndIpaErrorResponse = Partial<TranslateAndIpaResponse> & { error?: string; detail?: string }

export function useTranslateAndIpa() {
  async function translateAndIpa(request: TranslateAndIpaRequest): Promise<TranslateAndIpaItem[]> {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) throw new Error('Your session expired. Please sign in again.')

    const res = await fetch('/api/translate-and-ipa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    })

    const body = await res.json().catch(() => ({})) as TranslateAndIpaErrorResponse
    if (!res.ok) throw new Error(body.error || body.detail || 'Translation failed')
    return body.items ?? []
  }

  return { translateAndIpa }
}
