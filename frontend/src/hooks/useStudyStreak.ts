import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { computeStudyStreak, type StudyStreak } from '@/lib/dailyHabits'

const MS_PER_DAY = 86_400_000
// Window the lookback so the payload stays bounded. A streak can only extend as far back as
// the first unbroken run of days, so any window well beyond a plausible streak is safe.
const LOOKBACK_DAYS = 400
const MAX_ROWS = 5000

export type UseStudyStreakResult = StudyStreak & {
  loading: boolean
  error: Error | null
}

/**
 * Derives the learner's consecutive-day study streak (read-only) from `recall_attempts`.
 *
 * Days are bucketed on the UTC calendar day to match `compute_word_states`' day boundary.
 * `study_mode='runner'` is excluded so the streak shares one definition of "study activity"
 * with the daily new-word cap and the done-for-today signal (game runner does not feed SRS).
 * The streak is global (all languages) — `recall_attempts` carries no language and a habit
 * streak is about showing up, not a single language.
 */
export function useStudyStreak(): UseStudyStreakResult {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [timestamps, setTimestamps] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!userId) {
        setTimestamps([])
        setError(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const windowStart = new Date(Date.now() - LOOKBACK_DAYS * MS_PER_DAY).toISOString()
      const { data, error: queryError } = await supabase
        .from('recall_attempts')
        .select('created_at')
        .eq('user_id', userId)
        .or('study_mode.is.null,study_mode.neq.runner')
        .gte('created_at', windowStart)
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS)

      if (cancelled) return

      if (queryError) {
        setTimestamps([])
        setError(new Error(queryError.message))
        setLoading(false)
        return
      }

      setTimestamps(((data ?? []) as Array<{ created_at: string }>).map((row) => row.created_at))
      setLoading(false)
    }

    run().catch((err) => {
      if (cancelled) return
      setTimestamps([])
      setError(err instanceof Error ? err : new Error(String(err)))
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [userId])

  const { streak, studiedToday } = useMemo(() => computeStudyStreak(timestamps), [timestamps])

  return { streak, studiedToday, loading, error }
}
