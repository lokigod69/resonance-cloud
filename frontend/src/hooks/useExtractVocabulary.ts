import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  ExtractVocabularyRequest,
  ExtractVocabularyResponse,
  ImagelessItem,
} from '@/lib/types/imagelessDeck'

export type ExtractVocabularyItem = ImagelessItem

export interface ExtractVocabularyMessage {
  role: 'user' | 'assistant'
  content: string
}

type ExtractVocabularyErrorResponse = Partial<ExtractVocabularyResponse> & { error?: string; detail?: string }

export function useExtractVocabulary() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extractVocabulary = useCallback(async (request: ExtractVocabularyRequest): Promise<ExtractVocabularyItem[]> => {
    setLoading(true)
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Your session expired. Please sign in again.')

      const res = await fetch('/api/extract-vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      })
      const body = await res.json().catch(() => ({})) as ExtractVocabularyErrorResponse
      if (!res.ok) throw new Error(body.error || body.detail || 'Extraction failed')
      return body.items ?? []
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { extractVocabulary, loading, error }
}
