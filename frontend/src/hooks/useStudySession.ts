import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export type StudyWord = {
  id: string
  word: string
  translation: string | null
  mnemonic: string | null
  etymology: string | null
  video_url: string | null
  thumbnail_url: string | null
  video_url_b: string | null
  thumbnail_url_b: string | null
  suno_audio_url: string | null
  deck_id: string
}

type RetryItem = { wordId: string; cardsSeen: number }

type SessionStats = { remembered: number; reviewLater: number }

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Heat = 'hot' | 'unseen' | 'cool' | 'warm'
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
const MAX_RETRIES = 3
const RETRY_GAP = 5

function getHeat(
  wordId: string,
  latestAttempt: Map<string, { knewIt: boolean; createdAt: string }>,
): Heat {
  const attempt = latestAttempt.get(wordId)
  if (!attempt) return 'unseen'
  if (!attempt.knewIt) return 'hot'
  const daysSince = Date.now() - new Date(attempt.createdAt).getTime()
  return daysSince >= THREE_DAYS_MS ? 'cool' : 'warm'
}

function sortByHeat(
  words: StudyWord[],
  latestAttempt: Map<string, { knewIt: boolean; createdAt: string }>,
): StudyWord[] {
  // Group into heat buckets
  const buckets: Record<Heat, StudyWord[]> = { hot: [], unseen: [], cool: [], warm: [] }
  for (const w of words) {
    buckets[getHeat(w.id, latestAttempt)].push(w)
  }
  // Shuffle within each bucket, then concatenate in priority order
  return [
    ...shuffle(buckets.hot),
    ...shuffle(buckets.unseen),
    ...shuffle(buckets.cool),
    ...shuffle(buckets.warm),
  ]
}

export function useStudySession() {
  const { user } = useAuth()
  const [words, setWords] = useState<StudyWord[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionStats, setSessionStats] = useState<SessionStats>({ remembered: 0, reviewLater: 0 })
  const retryQueueRef = useRef<RetryItem[]>([])
  // Track total retries per word across consume/re-schedule cycles (fixes infinite retry bug)
  const retryCountRef = useRef<Map<string, number>>(new Map())

  const fetchAndSort = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [wordsRes, attemptsRes] = await Promise.all([
      supabase
        .from('words')
        .select('id, word, translation, mnemonic, etymology, video_url, thumbnail_url, video_url_b, thumbnail_url_b, suno_audio_url, deck_id')
        .eq('user_id', user.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: true }),
      supabase
        .from('recall_attempts')
        .select('word_id, knew_it, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    const rawWords: StudyWord[] = wordsRes.data ?? []
    const rawAttempts = attemptsRes.data ?? []

    // Build map: word_id → most recent attempt (first occurrence since sorted desc)
    const latestAttempt = new Map<string, { knewIt: boolean; createdAt: string }>()
    for (const a of rawAttempts) {
      if (!latestAttempt.has(a.word_id)) {
        latestAttempt.set(a.word_id, { knewIt: a.knew_it, createdAt: a.created_at })
      }
    }

    setWords(sortByHeat(rawWords, latestAttempt))
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchAndSort()
  }, [fetchAndSort])

  const recordAttempt = useCallback(
    (wordId: string, knewIt: boolean) => {
      if (!user) return

      // Fire-and-forget Supabase insert
      supabase
        .from('recall_attempts')
        .insert({ user_id: user.id, word_id: wordId, knew_it: knewIt })
        .then(({ error }) => {
          if (error) console.error('[study] recall insert failed:', error)
        })

      // Update local stats
      setSessionStats((s) =>
        knewIt
          ? { ...s, remembered: s.remembered + 1 }
          : { ...s, reviewLater: s.reviewLater + 1 },
      )

      // Increment cardsSeen for all retry items
      retryQueueRef.current = retryQueueRef.current.map((item) => ({
        ...item,
        cardsSeen: item.cardsSeen + 1,
      }))

      // If user remembered a word that's in retry queue, remove it
      if (knewIt) {
        retryQueueRef.current = retryQueueRef.current.filter((item) => item.wordId !== wordId)
      }
    },
    [user],
  )

  const scheduleRetry = useCallback((wordId: string) => {
    // Check lifetime retry count (persists across consume/re-schedule cycles)
    const lifetimeCount = retryCountRef.current.get(wordId) ?? 0
    if (lifetimeCount >= MAX_RETRIES) return

    retryCountRef.current.set(wordId, lifetimeCount + 1)

    const queue = retryQueueRef.current
    const existing = queue.find((item) => item.wordId === wordId)
    if (existing) {
      existing.cardsSeen = 0
    } else {
      queue.push({ wordId, cardsSeen: 0 })
    }
  }, [])

  // force=true: return any pending retry even if gap not met (used when session would end)
  const consumeRetry = useCallback((force = false): string | null => {
    const queue = retryQueueRef.current
    if (queue.length === 0) return null
    const dueIdx = force
      ? 0
      : queue.findIndex((item) => item.cardsSeen >= RETRY_GAP)
    if (dueIdx === -1) return null
    const due = queue[dueIdx]
    queue.splice(dueIdx, 1)
    return due.wordId
  }, [])

  const restart = useCallback(() => {
    retryQueueRef.current = []
    retryCountRef.current = new Map()
    setSessionStats({ remembered: 0, reviewLater: 0 })
    fetchAndSort()
  }, [fetchAndSort])

  return {
    words,
    loading,
    sessionStats,
    recordAttempt,
    scheduleRetry,
    consumeRetry,
    restart,
  }
}
