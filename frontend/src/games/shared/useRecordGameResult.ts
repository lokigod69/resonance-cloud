import { useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { trackLearningAction } from '@/lib/analytics'
import { recallAttemptQueue } from '@/lib/recallAttemptQueue'
import type { GameAttemptEvent } from './gameEvents'

export function useRecordGameResult() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  return useCallback((event: GameAttemptEvent) => {
    if (!userId) return

    void recallAttemptQueue.enqueue({
      userId,
      wordId: event.wordId,
      knewIt: event.passed,
      studyMode: event.gameId,
      metadata: event.metadata ?? null,
      occurredAt: new Date(event.timestamp).toISOString(),
    }).catch(() => undefined)

    trackLearningAction('study_rep', { study_mode: event.gameId, correct: event.passed })
  }, [userId])
}
