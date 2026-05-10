import { useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { GameAttemptEvent } from './gameEvents'

export function useRecordGameResult() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  return useCallback((event: GameAttemptEvent) => {
    if (!userId) return

    supabase
      .from('recall_attempts')
      .insert({
        user_id: userId,
        word_id: event.wordId,
        knew_it: event.passed,
        study_mode: event.gameId,
        metadata: event.metadata ?? null,
      })
      .then(({ error }) => {
        if (error) console.error('[games] recall insert failed:', error)
      })
  }, [userId])
}

