import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useDeleteImagelessDeck() {
  const [deleting, setDeleting] = useState(false)

  async function deleteImagelessDeck(deckId: string): Promise<void> {
    setDeleting(true)
    try {
      const { error } = await supabase.rpc('delete_imageless_deck', {
        p_deck_id: deckId,
      })
      if (error) throw error
    } finally {
      setDeleting(false)
    }
  }

  return { deleteImagelessDeck, deleting }
}
