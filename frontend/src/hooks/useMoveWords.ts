import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UseMoveWordsReturn {
  moveWords: (wordIds: string[], targetDeckId: string) => Promise<{ success: boolean; error?: string }>
  moving: boolean
}

/**
 * Hook for moving words between decks.
 * Uses the server RPC so deck counters/status are recalculated transactionally.
 */
export function useMoveWords(sourceDeckId: string): UseMoveWordsReturn {
  const [moving, setMoving] = useState(false)

  async function moveWords(
    wordIds: string[],
    targetDeckId: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (wordIds.length === 0) return { success: false, error: 'No words selected' }
    if (targetDeckId === sourceDeckId) return { success: false, error: 'Cannot move to the same deck' }

    setMoving(true)
    try {
      const { error } = await supabase.rpc('move_words_to_deck', {
        p_word_ids: wordIds,
        p_target_deck_id: targetDeckId,
      })

      if (error) throw new Error(error.message)

      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Move failed'
      return { success: false, error: msg }
    } finally {
      setMoving(false)
    }
  }

  return { moveWords, moving }
}
