import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type DeleteWordsResult = {
  success: boolean
  error?: string
  deck?: { word_count: number; status: string }
}

interface UseDeleteWordsReturn {
  deleteWords: (wordIds: string[]) => Promise<DeleteWordsResult>
  deleting: boolean
}

/**
 * Hook for archiving words from a deck.
 * Uses the server RPC so storage cleanup and deck recalculation happen together.
 */
export function useDeleteWords(deckId: string): UseDeleteWordsReturn {
  const [deleting, setDeleting] = useState(false)

  async function deleteWords(wordIds: string[]): Promise<DeleteWordsResult> {
    if (!deckId) return { success: false, error: 'Deck is required' }
    if (wordIds.length === 0) return { success: false, error: 'No words selected' }

    setDeleting(true)
    try {
      const { data, error } = await supabase.rpc('archive_words', {
        p_word_ids: wordIds,
      })

      if (error) throw new Error(error.message)

      const result = data as { success?: boolean; error?: string; deck?: DeleteWordsResult['deck'] } | null
      if (result?.success === false) {
        return { success: false, error: result.error || 'Delete failed' }
      }

      return { success: true, deck: result?.deck }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed'
      return { success: false, error: msg }
    } finally {
      setDeleting(false)
    }
  }

  return { deleteWords, deleting }
}
