import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UseMoveWordsReturn {
  moveWords: (wordIds: string[], targetDeckId: string) => Promise<{ success: boolean; error?: string }>
  moving: boolean
}

/**
 * Hook for moving words between decks.
 * Handles the Supabase UPDATE on words, recomputes word_count on both decks,
 * and recalculates the source deck's status.
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
      // 1. Update the words' deck_id
      const { error: moveError } = await supabase
        .from('words')
        .update({ deck_id: targetDeckId })
        .in('id', wordIds)

      if (moveError) throw new Error(moveError.message)

      // 2. Get accurate counts via exact count queries (avoids drift from stale counts)
      const [sourceCountRes, targetCountRes] = await Promise.all([
        supabase
          .from('words')
          .select('id', { count: 'exact', head: true })
          .eq('deck_id', sourceDeckId),
        supabase
          .from('words')
          .select('id', { count: 'exact', head: true })
          .eq('deck_id', targetDeckId),
      ])

      const sourceCount = sourceCountRes.count ?? 0
      const targetCount = targetCountRes.count ?? 0

      // 3. Recalculate source deck status from remaining words
      let sourceStatus = 'draft'
      if (sourceCount > 0) {
        const { data: remainingWords } = await supabase
          .from('words')
          .select('status')
          .eq('deck_id', sourceDeckId)

        if (remainingWords && remainingWords.length > 0) {
          const allComplete = remainingWords.every((w) => w.status === 'complete')
          const someComplete = remainingWords.some((w) => w.status === 'complete')
          const anyGenerating = remainingWords.some(
            (w) => w.status === 'pending' || w.status === 'processing',
          )

          if (anyGenerating) sourceStatus = 'generating'
          else if (allComplete) sourceStatus = 'complete'
          else if (someComplete) sourceStatus = 'partial'
          else sourceStatus = 'draft'
        }
      }

      // 4. Recalculate target deck status
      let targetStatus = 'draft'
      if (targetCount > 0) {
        const { data: targetWords } = await supabase
          .from('words')
          .select('status')
          .eq('deck_id', targetDeckId)

        if (targetWords && targetWords.length > 0) {
          const allComplete = targetWords.every((w) => w.status === 'complete')
          const someComplete = targetWords.some((w) => w.status === 'complete')
          const anyGenerating = targetWords.some(
            (w) => w.status === 'pending' || w.status === 'processing',
          )

          if (anyGenerating) targetStatus = 'generating'
          else if (allComplete) targetStatus = 'complete'
          else if (someComplete) targetStatus = 'partial'
          else targetStatus = 'draft'
        }
      }

      // 5. Update both decks' word_count and status
      await Promise.all([
        supabase
          .from('decks')
          .update({ word_count: sourceCount, status: sourceStatus })
          .eq('id', sourceDeckId),
        supabase
          .from('decks')
          .update({ word_count: targetCount, status: targetStatus })
          .eq('id', targetDeckId),
      ])

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
