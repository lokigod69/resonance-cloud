import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStudySession, type StudyMode } from './useStudySession'
import { useVideoVersion } from './useVideoVersion'
import { useVideoVolume } from './useVideoVolume'
import { useVideoPlayback } from './useVideoPlayback'
import { useAuth } from './useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'

export type { StudyMode } from './useStudySession'

type DeckOption = { id: string; name: string | null; target_language: string | null }

interface UseStudyUIOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  studyMode?: StudyMode
}

export function useStudyUI({ videoRef, studyMode = 'video' }: UseStudyUIOptions) {
  const [searchParams] = useSearchParams()
  const deckParam = searchParams.get('deck')
  const { user } = useAuth()
  const { activeLanguage } = useLanguage()

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

  // Filter decks to active language
  const decks = activeLanguage
    ? allDecks.filter(d => d.target_language === activeLanguage)
    : allDecks

  // Reset deck filter when language changes (selected deck may not be in new language)
  useEffect(() => {
    if (deckParam) return // don't override explicit deck param
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets user-controlled filter when activeLanguage changes; canonical reset-on-key pattern
    setDeckFilter('all')
  }, [activeLanguage, deckParam])

  const { words, loading, sessionStats, recordAttempt, scheduleRetry, consumeRetry, restart: restartSession } = useStudySession(deckFilter === 'all' ? null : deckFilter, studyMode, activeLanguage)

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
  }, [deckFilter, activeLanguage])

  const { isMuted, toggleMute } = useVideoVolume(videoRef, false)
  const { togglePlay, replay, onPlay, onPause } = useVideoPlayback(videoRef)

  const current = words[currentIndex] ?? null
  const { activeVideoUrl, activeThumbnailUrl } = useVideoVersion(current ?? { id: '', video_url: null, thumbnail_url: null })

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

    // Linear advance, skipping visited
    let next = currentIndex + 1
    while (next < words.length && visitedIdsRef.current.has(words[next].id)) next++
    if (next >= words.length) {
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
    } else {
      setCurrentIndex(next)
    }
  }, [current, currentIndex, words, consumeRetry, videoRef])

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
    if (currentIndex < words.length - 1) {
      setCurrentIndex((i) => i + 1)
      setRevealed(false)
    }
  }, [currentIndex, words.length])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (sessionComplete) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.closest('[role="listbox"]')) return
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
