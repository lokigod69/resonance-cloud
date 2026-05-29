import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AppendImagelessCardsParams, AppendImagelessCardsResponse } from '@/lib/types/imagelessDeck'

export function useAppendImagelessCards() {
  const [appending, setAppending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function appendImagelessCards({
    p_deck_id,
    p_items,
    p_origin = 'manual',
  }: AppendImagelessCardsParams): Promise<AppendImagelessCardsResponse> {
    setAppending(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('append_imageless_cards', {
        p_deck_id,
        p_items,
        p_origin,
      })
      if (rpcError) throw new Error(rpcError.message)

      return data as AppendImagelessCardsResponse
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Append failed'
      setError(message)
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setAppending(false)
    }
  }

  return { appendImagelessCards, appending, error }
}
