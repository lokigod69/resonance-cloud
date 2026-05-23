import { useMemo } from 'react'
import { useWordStates, type LemmaState } from '@/hooks/useWordStates'

export { LANGUAGES } from '@/lib/languages'

export type StudyWordLite = { word: string; translation: string }

type Heat = 'hot' | 'unseen' | 'cool' | 'warm'
const HEAT_ORDER: Heat[] = ['hot', 'unseen', 'cool', 'warm']

function bucketLemma(lemma: LemmaState): Heat | null {
  if (lemma.state === 'learning' && lemma.lastKnewIt === false) return 'hot'
  if (lemma.state === 'new' && lemma.due) return 'unseen'
  if ((lemma.state === 'reviewing' || lemma.state === 'mastered') && lemma.due) return 'cool'
  if (lemma.state === 'learning' && lemma.lastKnewIt === true) return 'warm'
  return null
}

export function useStudyWords(language: string | null) {
  const { data, loading } = useWordStates(language ?? '')

  const studyWords = useMemo<StudyWordLite[]>(() => {
    if (!language) return []

    const buckets: Record<Heat, LemmaState[]> = { hot: [], unseen: [], cool: [], warm: [] }
    for (const lemma of data) {
      const bucket = bucketLemma(lemma)
      if (bucket) buckets[bucket].push(lemma)
    }

    return HEAT_ORDER.flatMap((heat) => buckets[heat])
      .map((lemma) => ({ word: lemma.displayWord, translation: lemma.translation }))
      .filter((word) => word.word && word.translation)
      .slice(0, 10)
  }, [data, language])

  return { studyWords, hasWords: studyWords.length > 0, loading }
}
