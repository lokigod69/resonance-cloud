import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export type EditImagelessCardInput = {
  word_id: string
  word?: string
  translation?: string
  ipa?: string | null
}

export function useEditImagelessCard() {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function editImagelessCard(input: EditImagelessCardInput) {
    const updates: Record<string, string | null> = {}
    if (input.word !== undefined) updates.word = input.word
    if (input.translation !== undefined) updates.translation = input.translation
    if (input.ipa !== undefined) updates.ipa = input.ipa

    if (!input.word_id) throw new Error('Card is required')
    if (Object.keys(updates).length === 0) return null

    setUpdating(true)
    setError(null)
    try {
      const { data, error: updateError } = await supabase
        .from('words')
        .update(updates)
        .eq('id', input.word_id)
        .select('*')
        .single()

      if (updateError) throw new Error(updateError.message)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update card'
      setError(message)
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setUpdating(false)
    }
  }

  return { editImagelessCard, updating, error }
}
