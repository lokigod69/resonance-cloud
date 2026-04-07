import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { LANGUAGES } from '@/lib/languages'

export type StudyWordLite = { word: string; translation: string }

type Heat = 'hot' | 'unseen' | 'cool' | 'warm'
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
const HEAT_ORDER: Heat[] = ['hot', 'unseen', 'cool', 'warm']

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

export function useStudyWords(language: string | null) {
  const { user } = useAuth()
  const [studyWords, setStudyWords] = useState<StudyWordLite[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!user || !language) {
        setStudyWords([])
        return
      }

      // Convert 2-letter code (from Speak page) to full name (stored in decks)
      const langEntry = LANGUAGES.find(l => l.code === language)
      const targetLanguage = langEntry?.value ?? language
      setLoading(true)

      // 1. Decks for this user + language
      const decksRes = await supabase
        .from('decks')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_language', targetLanguage)

      const deckIds = (decksRes.data ?? []).map((d) => d.id as string)
      if (deckIds.length === 0) {
        if (!cancelled) {
          setStudyWords([])
          setLoading(false)
        }
        return
      }

      // 2. Complete words in those decks
      const wordsRes = await supabase
        .from('words')
        .select('id, word, translation')
        .eq('user_id', user.id)
        .eq('status', 'complete')
        .in('deck_id', deckIds)

      const rawWords = (wordsRes.data ?? []) as Array<{
        id: string
        word: string
        translation: string | null
      }>

      if (rawWords.length === 0) {
        if (!cancelled) {
          setStudyWords([])
          setLoading(false)
        }
        return
      }

      // 3. Recall attempts for this user
      const attemptsRes = await supabase
        .from('recall_attempts')
        .select('word_id, knew_it, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const latestAttempt = new Map<string, { knewIt: boolean; createdAt: string }>()
      for (const a of attemptsRes.data ?? []) {
        if (!latestAttempt.has(a.word_id)) {
          latestAttempt.set(a.word_id, { knewIt: a.knew_it, createdAt: a.created_at })
        }
      }

      // 4. Sort by heat priority, take top 10
      const buckets: Record<Heat, typeof rawWords> = { hot: [], unseen: [], cool: [], warm: [] }
      for (const w of rawWords) {
        buckets[getHeat(w.id, latestAttempt)].push(w)
      }
      const sorted = HEAT_ORDER.flatMap((h) => buckets[h])
      const top = sorted
        .map((w) => ({ word: w.word, translation: w.translation ?? '' }))
        .filter((w) => w.word && w.translation)
        .slice(0, 10)

      if (!cancelled) {
        setStudyWords(top)
        setLoading(false)
      }
    }

    run().catch((err) => {
      console.warn('[useStudyWords] fetch failed:', err)
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [user, language])

  return { studyWords, hasWords: studyWords.length > 0, loading }
}
