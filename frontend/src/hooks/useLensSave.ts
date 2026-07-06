import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { mapLensScanItemsForSave } from '@/lib/lensSaveMapping'
import type { LensScanItem } from '@/lib/lensTypes'

export type LensSaveStatus = 'idle' | 'loading' | 'success' | 'error'

export type LensSaveResult = {
  deckId: string
  inserted: number
  skipped: number
}

type LensSaveRpcResult = {
  deck_id?: string
  deckId?: string
  inserted?: number
  skipped?: number
  error?: string
} | null

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message
  }
  return fallback
}

export function useLensSave() {
  const [status, setStatus] = useState<LensSaveStatus>('idle')
  const [result, setResult] = useState<LensSaveResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function saveLensItems(request: {
    targetLanguage: string
    baseLanguage: string
    items: LensScanItem[]
  }): Promise<LensSaveResult> {
    const pItems = mapLensScanItemsForSave(request.items, { targetLanguage: request.targetLanguage })
    if (pItems.length === 0) {
      throw new Error('No Lens items to save')
    }

    setStatus('loading')
    setError(null)
    setResult(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('submit_lens_save', {
        p_target_language: request.targetLanguage,
        p_base_language: request.baseLanguage,
        p_items: pItems,
      })
      if (rpcError) throw rpcError

      const rpcResult = data as LensSaveRpcResult
      const deckId = rpcResult?.deck_id ?? rpcResult?.deckId ?? null
      if (!deckId) throw new Error(rpcResult?.error ?? 'Lens save failed')

      const saveResult = {
        deckId,
        inserted: Number(rpcResult?.inserted ?? 0),
        skipped: Number(rpcResult?.skipped ?? 0),
      }
      setResult(saveResult)
      setStatus('success')
      return saveResult
    } catch (err) {
      const message = errorMessage(err, 'Lens save failed')
      setError(message)
      setStatus('error')
      throw err instanceof Error ? err : new Error(message)
    }
  }

  return { saveLensItems, status, result, error }
}
