import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { LANGUAGES } from '@/lib/languages'

export type WordState = 'new' | 'learning' | 'reviewing' | 'mastered'

export type LemmaState = {
  lemmaKey: string
  displayWord: string
  translation: string
  wordIds: string[]
  deckIds: string[]
  state: WordState
  due: boolean
  nextDueAt: string | null
  consecutiveCorrect: number
  totalAttempts: number
  lastAttemptAt: string | null
  lastKnewIt: boolean | null
}

export type WordStateCounts = {
  new: number
  newDue: number
  learning: number
  reviewing: number
  reviewingDue: number
  mastered: number
  masteredDue: number
  totalDue: number
}

export type UseWordStatesResult = {
  data: LemmaState[]
  loading: boolean
  error: Error | null
  refetch: () => void
  counts: WordStateCounts
}

type ComputeWordStateRow = {
  lemma_key: string
  display_word: string
  translation: string | null
  word_ids: string[] | null
  deck_ids: string[] | null
  state: WordState
  due: boolean
  next_due_at: string | null
  consecutive_correct: number | null
  total_attempts: number | null
  last_attempt_at: string | null
  last_knew_it: boolean | null
}

const EMPTY_COUNTS: WordStateCounts = {
  new: 0,
  newDue: 0,
  learning: 0,
  reviewing: 0,
  reviewingDue: 0,
  mastered: 0,
  masteredDue: 0,
  totalDue: 0,
}

function toTargetLanguage(language: string): string {
  const normalized = language.trim()
  if (!normalized) return ''

  const lower = normalized.toLowerCase()
  return (
    LANGUAGES.find((l) => l.code.toLowerCase() === lower)?.value
    ?? LANGUAGES.find((l) => l.value.toLowerCase() === lower)?.value
    ?? normalized
  )
}

function mapRow(row: ComputeWordStateRow): LemmaState {
  return {
    lemmaKey: row.lemma_key,
    displayWord: row.display_word,
    translation: row.translation ?? '',
    wordIds: row.word_ids ?? [],
    deckIds: row.deck_ids ?? [],
    state: row.state,
    due: row.due,
    nextDueAt: row.next_due_at,
    consecutiveCorrect: row.consecutive_correct ?? 0,
    totalAttempts: row.total_attempts ?? 0,
    lastAttemptAt: row.last_attempt_at,
    lastKnewIt: row.last_knew_it,
  }
}

export function useWordStates(
  language: string,
  opts?: { deckId?: string | null; newWordDailyCap?: number },
): UseWordStatesResult {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const targetLanguage = toTargetLanguage(language)
  const deckId = opts?.deckId ?? null
  const newWordDailyCap = opts?.newWordDailyCap ?? 10
  const [data, setData] = useState<LemmaState[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const refetch = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!userId || !targetLanguage) {
        setData([])
        setError(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const { data: rows, error: rpcError } = await supabase.rpc('compute_word_states', {
        p_user_id: userId,
        p_target_language: targetLanguage,
        p_deck_id: deckId,
        p_new_word_daily_cap: newWordDailyCap,
      })

      if (cancelled) return

      if (rpcError) {
        setData([])
        setError(new Error(rpcError.message))
        setLoading(false)
        return
      }

      setData(((rows ?? []) as ComputeWordStateRow[]).map(mapRow))
      setLoading(false)
    }

    run().catch((err) => {
      if (cancelled) return
      setData([])
      setError(err instanceof Error ? err : new Error(String(err)))
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [userId, targetLanguage, deckId, newWordDailyCap, reloadKey])

  const counts = useMemo(() => {
    if (data.length === 0) return EMPTY_COUNTS

    return data.reduce<WordStateCounts>((acc, lemma) => {
      if (lemma.state === 'new') {
        acc.new += 1
        if (lemma.due) acc.newDue += 1
      } else if (lemma.state === 'learning') {
        acc.learning += 1
      } else if (lemma.state === 'reviewing') {
        acc.reviewing += 1
        if (lemma.due) acc.reviewingDue += 1
      } else if (lemma.state === 'mastered') {
        acc.mastered += 1
        if (lemma.due) acc.masteredDue += 1
      }

      acc.totalDue = acc.learning + acc.reviewingDue + acc.masteredDue
      return acc
    }, { ...EMPTY_COUNTS })
  }, [data])

  return { data, loading, error, refetch, counts }
}
