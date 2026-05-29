import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type DeleteImagelessCardsResult = {
  success: boolean
  error?: string
  deck?: { word_count: number; status: string }
}

export function useDeleteImagelessCard() {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function deleteImagelessCards(word_ids: string[]): Promise<DeleteImagelessCardsResult> {
    if (word_ids.length === 0) return { success: false, error: 'No cards selected' }

    setDeleting(true)
    setError(null)
    try {
      const { data, error: deleteError } = await supabase.rpc('archive_words', {
        p_word_ids: word_ids,
      })

      if (deleteError) throw new Error(deleteError.message)

      const result = data as DeleteImagelessCardsResult | null
      if (result?.success === false) {
        return { success: false, error: result.error || 'Delete failed' }
      }

      return { success: true, deck: result?.deck }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setDeleting(false)
    }
  }

  async function deleteImagelessCard({ word_id }: { word_id: string }) {
    return deleteImagelessCards([word_id])
  }

  return { deleteImagelessCard, deleteImagelessCards, deleting, error }
}
