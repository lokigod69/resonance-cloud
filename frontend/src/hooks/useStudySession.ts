import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { CardFaces } from '@/lib/cardFaces'
import { getLanguageQueryValues } from '@/lib/languages'
import { useWordStates, type LemmaState } from '@/hooks/useWordStates'

export type StudyWord = {
  id: string
  word: string
  translation: string | null
  mnemonic: string | null
  etymology: string | null
  ipa?: string | null
  video_url: string | null
  thumbnail_url: string | null
  tts_audio_url: string | null
  video_url_b: string | null
  thumbnail_url_b: string | null
  suno_storage_url: string | null
  suno_storage_url_b: string | null
  suno_audio_url: string | null
  deck_id: string
  deck_type: 'video' | 'card' | 'card_text' | null
  target_language: string | null
  base_language: string | null
  faces?: CardFaces
  text?: string
  promptFace?: string
  answerFace?: string
}

export type StudyMode = 'video' | 'audio' | 'flashcard' | 'canvas'
export type StudyQueue = 'review' | 'learn' | 'strengthen' | 'mastered'

type RetryItem = { wordId: string; cardsSeen: number }

type SessionStats = { remembered: number; reviewLater: number }

type StudyWordRow = Omit<StudyWord, 'target_language' | 'base_language' | 'deck_type'> & {
  decks?: { target_language?: string | null; deck_type?: 'video' | 'card' | 'card_text' | null } | null
}

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
const MAX_RETRIES = 3
const RETRY_GAP = 5

export function isStudyQueue(value: string | null | undefined): value is StudyQueue {
  return value === 'review' || value === 'learn' || value === 'strengthen' || value === 'mastered'
}

export function filterLemmaStatesForQueue(
  lemmaStates: LemmaState[],
  queue?: StudyQueue | null,
): LemmaState[] {
  if (!queue) return lemmaStates

  return lemmaStates.filter((lemma) => {
    switch (queue) {
      case 'review':
        return (lemma.state === 'reviewing' || lemma.state === 'mastered') && lemma.due
      case 'learn':
        return lemma.state === 'new' && lemma.due
      case 'strengthen':
        return lemma.state === 'learning'
      case 'mastered':
        return lemma.state === 'mastered'
      default:
        return false
    }
  })
}

function sortByHeat(
  words: StudyWord[],
  lemmaStates: LemmaState[],
  queue?: StudyQueue | null,
): StudyWord[] {
  const filteredLemmaStates = filterLemmaStatesForQueue(lemmaStates, queue)
  const stateByWordId = new Map<string, LemmaState>()
  for (const lemma of filteredLemmaStates) {
    for (const wordId of lemma.wordIds) {
      stateByWordId.set(wordId, lemma)
    }
  }

  const buckets: Record<Heat, StudyWord[]> = { hot: [], unseen: [], cool: [], warm: [] }
  for (const w of words) {
    const lemma = stateByWordId.get(w.id)
    if (!lemma) continue

    if (lemma.state === 'learning' && lemma.lastKnewIt === false) {
      buckets.hot.push(w)
    } else if (lemma.state === 'new' && lemma.due) {
      buckets.unseen.push(w)
    } else if (queue === 'mastered' && lemma.state === 'mastered') {
      buckets.cool.push(w)
    } else if ((lemma.state === 'reviewing' || lemma.state === 'mastered') && lemma.due) {
      buckets.cool.push(w)
    } else if (lemma.state === 'learning' && lemma.lastKnewIt === true) {
      buckets.warm.push(w)
    }
  }

  return [
    ...shuffle(buckets.hot),
    ...shuffle(buckets.unseen),
    ...shuffle(buckets.cool),
    ...shuffle(buckets.warm),
  ]
}

export function useStudySession(
  deckId?: string | null,
  studyMode: StudyMode = 'video',
  language?: string | null,
  queue?: StudyQueue | null,
) {
  const { user, profile } = useAuth()
  const userId = user?.id ?? null
  const [words, setWords] = useState<StudyWord[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionStats, setSessionStats] = useState<SessionStats>({ remembered: 0, reviewLater: 0 })
  const retryQueueRef = useRef<RetryItem[]>([])
  // Track total retries per word across consume/re-schedule cycles (fixes infinite retry bug)
  const retryCountRef = useRef<Map<string, number>>(new Map())
  const {
    data: wordStates,
    loading: wordStatesLoading,
    refetch: refetchWordStates,
  } = useWordStates(language ?? '', { deckId: deckId ?? null })

  const fetchAndSort = useCallback(async (isStale?: () => boolean) => {
    if (!userId) return
    setLoading(true)

    // When filtering by language (no specific deck), find deck IDs for that language first
    let langDeckIds: string[] | null = null
    if (!deckId && language) {
      const { data: langDecks } = await supabase
        .from('decks')
        .select('id')
        .eq('user_id', userId)
        .in('target_language', getLanguageQueryValues(language))
      if (isStale?.()) return
      langDeckIds = langDecks?.map(d => d.id) ?? []
      if (langDeckIds.length === 0) {
        setWords([])
        setLoading(false)
        return
      }
    }

    let wordsQuery = supabase
      .from('words')
      .select('id, word, translation, mnemonic, etymology, ipa, video_url, thumbnail_url, tts_audio_url, video_url_b, thumbnail_url_b, suno_storage_url, suno_storage_url_b, suno_audio_url, deck_id, decks(target_language, deck_type)')
      .eq('user_id', userId)
      .eq('status', 'complete')
    if (deckId) {
      wordsQuery = wordsQuery.eq('deck_id', deckId)
    } else if (langDeckIds) {
      wordsQuery = wordsQuery.in('deck_id', langDeckIds)
    }

    const wordsRes = await wordsQuery.order('created_at', { ascending: true })

    if (isStale?.()) return

    let rawWords: StudyWord[] = ((wordsRes.data ?? []) as StudyWordRow[]).map((row) => {
      const { decks, ...word } = row
      return {
        ...word,
        deck_type: decks?.deck_type ?? null,
        target_language: decks?.target_language ?? null,
        base_language: profile?.base_language ?? null,
      }
    })
    // Audio mode: only include words that have a Suno audio URL
    if (studyMode === 'audio') {
      rawWords = rawWords.filter(w => w.suno_storage_url || w.suno_audio_url)
    }

    setWords(sortByHeat(rawWords, wordStates, queue))
    setLoading(false)
  }, [userId, profile?.base_language, deckId, studyMode, language, wordStates, queue])

  useEffect(() => {
    let stale = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- triggers fetch+sort when deps change; setState happens inside async fetchAndSort body
    fetchAndSort(() => stale)
    return () => { stale = true }
  }, [fetchAndSort])

  useEffect(() => {
    retryQueueRef.current = []
    retryCountRef.current = new Map()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets session stats when deckId/studyMode/language change; canonical reset-on-key pattern
    setSessionStats({ remembered: 0, reviewLater: 0 })
  }, [deckId, studyMode, language, queue])

  const recordAttempt = useCallback(
    (wordId: string, knewIt: boolean) => {
      if (!userId) return

      // Fire-and-forget Supabase insert
      supabase
        .from('recall_attempts')
        .insert({ user_id: userId, word_id: wordId, knew_it: knewIt, study_mode: studyMode })
        .then(({ error }) => {
          if (error) console.error('[study] recall insert failed:', error)
          else refetchWordStates()
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
    [userId, studyMode, refetchWordStates],
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
    refetchWordStates()
    fetchAndSort()
  }, [fetchAndSort, refetchWordStates])

  return {
    words,
    loading: loading || wordStatesLoading,
    sessionStats,
    recordAttempt,
    scheduleRetry,
    consumeRetry,
    restart,
  }
}
