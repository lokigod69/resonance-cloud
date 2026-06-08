import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isStudyQueue, useStudySession, type StudyMode } from './useStudySession'
import { useVideoVersion } from './useVideoVersion'
import { useVideoVolume } from './useVideoVolume'
import { useVideoPlayback } from './useVideoPlayback'
import { useAuth } from './useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { canonicalizeLanguageValue, languagesMatch } from '@/lib/languages'

export type { StudyMode } from './useStudySession'

type DeckOption = { id: string; name: string | null; target_language: string | null }

interface UseStudyUIOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  studyMode?: StudyMode
  queue?: string | null
}

export function useStudyUI({ videoRef, studyMode = 'video', queue }: UseStudyUIOptions) {
  const [searchParams] = useSearchParams()
  const deckParam = searchParams.get('deck')
  const langParam = searchParams.get('lang')
  const queueParam = queue ?? searchParams.get('queue')
  const queueFilter = isStudyQueue(queueParam) ? queueParam : null
  const { user } = useAuth()
  const { activeLanguage, setActiveLanguage } = useLanguage()
  const studyLanguage = canonicalizeLanguageValue(langParam ?? activeLanguage)

  const [deckFilter, setDeckFilter] = useState<string>(deckParam ?? 'all')
  const [allDecks, setAllDecks] = useState<DeckOption[]>([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('decks')
      .select('id, name, target_language')
      .eq('user_id', user.id)
      .then(({ data }) => { if (data) setAllDecks(data) })
  }, [user])

  useEffect(() => {
    const canonicalLangParam = canonicalizeLanguageValue(langParam)
    if (!canonicalLangParam || activeLanguage === canonicalLangParam) return
    setActiveLanguage(canonicalLangParam)
  }, [activeLanguage, langParam, setActiveLanguage])

  // Filter decks to active language
  const decks = studyLanguage
    ? allDecks.filter(d => languagesMatch(d.target_language, studyLanguage))
    : allDecks

  // Reset deck filter when language changes (selected deck may not be in new language)
  useEffect(() => {
    if (deckParam) return // don't override explicit deck param
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets user-controlled filter when activeLanguage changes; canonical reset-on-key pattern
    setDeckFilter('all')
  }, [studyLanguage, deckParam])

  const { words, loading, sessionStats, recordAttempt, scheduleRetry, consumeRetry, restart: restartSession } = useStudySession(deckFilter === 'all' ? null : deckFilter, studyMode, studyLanguage, queueFilter)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const visitedIdsRef = useRef<Set<string>>(new Set())
  const wasPlayingRef = useRef(true)

  // Reset session state when deck filter or language changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical reset-on-key pattern; the parent does not pass a key prop so the reset is handled here
    setCurrentIndex(0)
    setRevealed(false)
    setSessionComplete(false)
    setReviewed(0)
    visitedIdsRef.current = new Set()
  }, [deckFilter, studyLanguage, queueFilter])

  const { isMuted, toggleMute } = useVideoVolume(videoRef, false)
  const { togglePlay, replay, onPlay, onPause } = useVideoPlayback(videoRef)

  const current = words[currentIndex] ?? null
  const { activeVideoUrl, activeThumbnailUrl } = useVideoVersion(current ?? { id: '', video_url: null, thumbnail_url: null })

  const findNextUnvisitedIndex = useCallback((startIndex: number, excludeIndex?: number) => {
    if (words.length === 0) return -1
    for (let step = 1; step <= words.length; step += 1) {
      const idx = (startIndex + step) % words.length
      if (idx === excludeIndex) continue
      if (!visitedIdsRef.current.has(words[idx].id)) return idx
    }
    return -1
  }, [words])

  const advanceToNext = useCallback(() => {
    wasPlayingRef.current = !(videoRef.current?.paused ?? false)
    setReviewed((r) => r + 1)
    setRevealed(false)
    if (current) visitedIdsRef.current.add(current.id)

    // Check retry pocket
    const retryId = consumeRetry()
    if (retryId) {
      const idx = words.findIndex((w) => w.id === retryId)
      if (idx !== -1) {
        setCurrentIndex(idx)
        return
      }
    }

    const next = findNextUnvisitedIndex(currentIndex)
    if (next !== -1) {
      setCurrentIndex(next)
      return
    }

    // Before ending session, drain any pending retries even if gap not fully met
    const forcedRetryId = consumeRetry(true)
    if (forcedRetryId) {
      const idx = words.findIndex((w) => w.id === forcedRetryId)
      if (idx !== -1) {
        setCurrentIndex(idx)
        return
      }
    }

    setSessionComplete(true)
  }, [current, currentIndex, words, consumeRetry, findNextUnvisitedIndex, videoRef])

  // Preserve video pause state across card transitions
  useEffect(() => {
    if (!wasPlayingRef.current && videoRef.current) {
      videoRef.current.pause()
    }
  }, [current?.id, videoRef])

  const handleRemembered = useCallback(() => {
    if (!current) return
    recordAttempt(current.id, true)
    advanceToNext()
  }, [current, recordAttempt, advanceToNext])

  const handleReviewLater = useCallback(() => {
    if (!current) return
    recordAttempt(current.id, false)
    scheduleRetry(current.id)
    advanceToNext()
  }, [current, recordAttempt, scheduleRetry, advanceToNext])

  const restart = useCallback(() => {
    restartSession()
    setCurrentIndex(0)
    setRevealed(false)
    setSessionComplete(false)
    setReviewed(0)
    visitedIdsRef.current = new Set()
  }, [restartSession])

  const selectIndex = useCallback((i: number) => {
    setCurrentIndex(i)
    setRevealed(false)
  }, [])

  const skipPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      setRevealed(false)
    }
  }, [currentIndex])

  const skipNext = useCallback(() => {
    if (words.length <= 1) return
    const next = findNextUnvisitedIndex(currentIndex, currentIndex)
    setCurrentIndex(next !== -1 ? next : (currentIndex + 1) % words.length)
    setRevealed(false)
  }, [currentIndex, findNextUnvisitedIndex, words.length])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (sessionComplete) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || (e.target as HTMLElement)?.closest('[role="listbox"]')) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!revealed) setRevealed(true)
        else handleRemembered()
      }
      if (e.key === 'ArrowLeft') { e.preventDefault(); skipPrev() }
      if (e.key === 'ArrowRight') { e.preventDefault(); skipNext() }
      if (e.key === 'r' || e.key === 'R') replay()
      if (e.key === 'm' || e.key === 'M') toggleMute()
      if (e.key === 'p' || e.key === 'P') togglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, handleRemembered, replay, sessionComplete, toggleMute, togglePlay, skipPrev, skipNext])

  return {
    // Data
    words,
    current,
    currentIndex,
    loading,
    sessionComplete,
    sessionStats,
    reviewed,
    revealed,
    setRevealed,
    decks,
    deckFilter,
    setDeckFilter,
    // Video
    activeVideoUrl,
    activeThumbnailUrl,
    isMuted,
    toggleMute,
    togglePlay,
    replay,
    onPlay,
    onPause,
    // Actions
    handleRemembered,
    handleReviewLater,
    restart,
    selectIndex,
    skipPrev,
    skipNext,
  }
}
