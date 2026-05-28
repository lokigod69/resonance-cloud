import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { SubmitImagelessImportItem } from '@/lib/types/imagelessDeck'

export type ImagelessImportOrigin = 'manual' | 'category' | 'tutor_extraction'

interface SubmitImagelessImportRequest {
  deckName: string
  targetLanguage: string
  baseLanguage: string
  origin: ImagelessImportOrigin
  items: SubmitImagelessImportItem[]
}

type SubmitImagelessImportResult = string | { deck_id?: string; deckId?: string; id?: string; error?: string } | null

export function useSubmitImagelessImport() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitImagelessImport(request: SubmitImagelessImportRequest): Promise<string> {
    setSubmitting(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('submit_imageless_import', {
        p_deck_name: request.deckName,
        p_target_language: request.targetLanguage,
        p_base_language: request.baseLanguage,
        p_origin: request.origin,
        p_items: request.items,
      })
      if (rpcError) throw rpcError

      const result = data as SubmitImagelessImportResult
      const deckId = typeof result === 'string'
        ? result
        : result?.deck_id ?? result?.deckId ?? result?.id ?? null
      if (!deckId) throw new Error(typeof result === 'object' && result?.error ? result.error : 'Import failed')
      return deckId
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed'
      setError(message)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  return { submitImagelessImport, submitting, error }
}
