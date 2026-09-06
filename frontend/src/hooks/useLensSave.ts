import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { withClientDeadline } from '@/lib/clientDeadline'
import {
  mapLensScanItemsForSave,
  parseLensSaveResult,
  type LensSaveInputItem,
  type LensSaveResult,
} from '@/lib/lensSaveMapping'

export type LensSaveStatus = 'idle' | 'loading' | 'success' | 'error'
export const LENS_SAVE_DEADLINE_MS = 15_000

type LensSaveRpcResult = {
  deck_id?: string
  deckId?: string
  inserted?: number
  skipped?: number
  outcomes?: unknown
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
    items: LensSaveInputItem[]
  }): Promise<LensSaveResult> {
    const pItems = mapLensScanItemsForSave(request.items, { targetLanguage: request.targetLanguage })
    if (pItems.length === 0) {
      throw new Error('No Lens items to save')
    }

    setStatus('loading')
    setError(null)
    setResult(null)

    try {
      // Do not automatically retry a timed-out write: the database may have
      // committed after the client lost the response. A deliberate retry is
      // safe because submit_lens_save deduplicates the same recap client ids.
      const { data, error: rpcError } = await withClientDeadline(
        async (signal) => await supabase.rpc('submit_lens_save', {
          p_target_language: request.targetLanguage,
          p_base_language: request.baseLanguage,
          p_items: pItems,
        }).abortSignal(signal),
        LENS_SAVE_DEADLINE_MS,
      )
      if (rpcError) throw rpcError

      const rpcResult = data as LensSaveRpcResult
      const deckId = rpcResult?.deck_id ?? rpcResult?.deckId ?? null
      if (!deckId) throw new Error(rpcResult?.error ?? 'Lens save failed')

      const saveResult = parseLensSaveResult(rpcResult, pItems.map((item) => item.client_id))
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
