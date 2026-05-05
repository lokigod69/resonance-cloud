import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStudySession } from '@/hooks/useStudySession'
import { useLanguage } from '@/contexts/LanguageContext'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import EmberCanvas from '@/components/study/canvas/EmberCanvas'
import FrostCanvas from '@/components/study/canvas/FrostCanvas'
import SyndicateCanvas from '@/components/study/canvas/SyndicateCanvas'
import ZenCanvas from '@/components/study/canvas/ZenCanvas'
import type { CanvasMode } from '@/components/study/canvas/types'

const PAGE_SIZE = 20
const MODE_STORAGE_KEY = 'resonance-canvas-mode'
const IMAGES_STORAGE_KEY = 'resonance-canvas-show-images'
const DEFAULT_MODE: CanvasMode = 'ember'

function isCanvasMode(value: string | null): value is CanvasMode {
  return value === 'ember' || value === 'frost' || value === 'syndicate' || value === 'zen'
}

function loadStoredMode(): CanvasMode {
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY)
    return isCanvasMode(stored) ? stored : DEFAULT_MODE
  } catch {
    return DEFAULT_MODE
  }
}

function loadStoredShowImages(): boolean {
  try {
    return localStorage.getItem(IMAGES_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export default function StudyCanvas() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { activeLanguage } = useLanguage()

  const deckId = searchParams.get('deck')
  const rawReturnTo = searchParams.get('returnTo')
  const returnTo = rawReturnTo?.startsWith('/') ? rawReturnTo : null

  // Persistent UI state
  const [activeMode, setActiveMode] = useState<CanvasMode>(loadStoredMode)
  const [showImages, setShowImages] = useState<boolean>(loadStoredShowImages)

  // Session state
  const [currentPage, setCurrentPage] = useState(0)
  const [shuffleNonce, setShuffleNonce] = useState(0)
  const [passedWords, setPassedWords] = useState<Set<string>>(new Set())
  const [sessionComplete, setSessionComplete] = useState(false)

  // Data
  const { words, loading, recordAttempt } = useStudySession(deckId, 'canvas', activeLanguage)

  // One Fisher-Yates shuffle per (words, shuffleNonce). Pure of currentPage.
  const shuffled = useMemo(() => {
    const arr = [...words]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shuffleNonce is the explicit re-shuffle trigger
  }, [words, shuffleNonce])

  const totalPages = Math.max(0, Math.ceil(shuffled.length / PAGE_SIZE))
  const currentPageWords = useMemo(
    () => shuffled.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [shuffled, currentPage],
  )

  // Empty pool → instant completion. Only flips to true; explicit handlers reset to false.
  useEffect(() => {
    if (!loading && shuffled.length === 0) {
      setSessionComplete(true)
    }
  }, [loading, shuffled.length])

  const goToReturnOrStudy = useCallback(() => {
    navigate(returnTo || '/study')
  }, [navigate, returnTo])

  // Esc anywhere in Canvas exits.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        goToReturnOrStudy()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goToReturnOrStudy])

  const handleSwitchMode = useCallback((mode: CanvasMode) => {
    setActiveMode(mode)
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode)
    } catch {
      // localStorage unavailable; non-fatal
    }
    setCurrentPage(0)
    setShuffleNonce((n) => n + 1)
    setPassedWords(new Set())
    setSessionComplete(false)
    // The empty-pool effect will re-flip sessionComplete to true if pool is empty.
  }, [])

  const handleToggleImages = useCallback(() => {
    setShowImages((prev) => {
      const next = !prev
      try {
        localStorage.setItem(IMAGES_STORAGE_KEY, next ? 'true' : 'false')
      } catch {
        // non-fatal
      }
      return next
    })
  }, [])

  const handlePass = useCallback(
    (wordId: string) => {
      recordAttempt(wordId, true)
      const nextPassed = new Set(passedWords)
      nextPassed.add(wordId)
      // Page complete?
      if (nextPassed.size >= currentPageWords.length && currentPageWords.length > 0) {
        if (currentPage < totalPages - 1) {
          // Advance to next page; reset passed set (mode component remounts via key change)
          setCurrentPage(currentPage + 1)
          setPassedWords(new Set())
        } else {
          // Last page: session complete
          setPassedWords(nextPassed)
          setSessionComplete(true)
        }
      } else {
        setPassedWords(nextPassed)
      }
    },
    [recordAttempt, passedWords, currentPageWords.length, currentPage, totalPages],
  )

  const handleFail = useCallback(
    (wordId: string) => {
      recordAttempt(wordId, false)
      // No passedWords mutation — failed cards stay live on the page.
    },
    [recordAttempt],
  )

  const handlePrevPage = useCallback(() => {
    setCurrentPage((c) => {
      const next = Math.max(0, c - 1)
      if (next !== c) setPassedWords(new Set())
      return next
    })
  }, [])

  const handleNextPage = useCallback(() => {
    setCurrentPage((c) => {
      const next = c < totalPages - 1 ? c + 1 : c
      if (next !== c) setPassedWords(new Set())
      return next
    })
  }, [totalPages])

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center gap-4">
        <ParticleSpinner preset="heart" size={140} />
        <p className="text-sm text-white/50">Loading…</p>
      </div>
    )
  }

  const ActiveModeComponent =
    activeMode === 'ember'
      ? EmberCanvas
      : activeMode === 'frost'
        ? FrostCanvas
        : activeMode === 'syndicate'
          ? SyndicateCanvas
          : ZenCanvas

  return (
    <ActiveModeComponent
      key={`${activeMode}-${shuffleNonce}-${currentPage}`}
      words={currentPageWords}
      showImages={showImages}
      sessionComplete={sessionComplete}
      currentPage={currentPage}
      totalPages={totalPages}
      activeMode={activeMode}
      onPass={handlePass}
      onFail={handleFail}
      onPrevPage={handlePrevPage}
      onNextPage={handleNextPage}
      onSwitchMode={handleSwitchMode}
      onToggleImages={handleToggleImages}
      onExit={goToReturnOrStudy}
      onContinue={goToReturnOrStudy}
    />
  )
}
