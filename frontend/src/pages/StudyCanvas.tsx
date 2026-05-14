import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStudySession } from '@/hooks/useStudySession'
import { useLanguage } from '@/contexts/LanguageContext'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import EmberCanvas from '@/components/study/canvas/EmberCanvas'
import FrostCanvas from '@/components/study/canvas/FrostCanvas'
import SyndicateCanvas from '@/components/study/canvas/SyndicateCanvas'
import ZenCanvas from '@/components/study/canvas/ZenCanvas'
import { CanvasShell } from '@/components/study/canvas/CanvasShell'
import type { CanvasAutoReveal, CanvasDirection, CanvasLanguagePair, CanvasMode } from '@/components/study/canvas/types'
import { getCardFaces } from '@/lib/cardFaces'
import { LANGUAGES } from '@/lib/languages'

const PAGE_SIZE = 20
const SESSION_STORAGE_PREFIX = 'resonance-canvas-session'
const DIRECTION_STORAGE_KEY = 'resonance-canvas-direction'
const AUTO_REVEAL_STORAGE_KEY = 'resonance-canvas-auto-reveal'
const DEFAULT_MODE: CanvasMode = 'ember'
const DEFAULT_DIRECTION: CanvasDirection = 'target-visible'
const DEFAULT_AUTO_REVEAL: CanvasAutoReveal = 'off'

type CanvasSessionSnapshot = {
  activeMode: CanvasMode
  showImages: boolean
  currentPage: number
  shuffleNonce: number
  passedWordIds: string[]
  sessionComplete: boolean
}

function isCanvasMode(value: string | null): value is CanvasMode {
  return value === 'ember' || value === 'frost' || value === 'syndicate' || value === 'zen'
}

function isCanvasDirection(value: string | null): value is CanvasDirection {
  return value === 'target-visible' || value === 'base-visible'
}

function isCanvasAutoReveal(value: string | null): value is CanvasAutoReveal {
  return value === 'on' || value === 'off'
}

function createShuffleNonce() {
  return Date.now()
}

function getCanvasSessionStorageKey(deckId: string | null, language: string | null | undefined) {
  return `${SESSION_STORAGE_PREFIX}:${deckId ?? 'all'}:${language ?? 'all'}`
}

function loadStoredSession(key: string): CanvasSessionSnapshot | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) ?? 'null') as Partial<CanvasSessionSnapshot> | null
    const activeMode = typeof parsed?.activeMode === 'string' ? parsed.activeMode : null
    if (!parsed || !isCanvasMode(activeMode)) return null

    return {
      activeMode,
      showImages: parsed.showImages === true,
      currentPage: typeof parsed.currentPage === 'number' && parsed.currentPage >= 0 ? parsed.currentPage : 0,
      shuffleNonce: typeof parsed.shuffleNonce === 'number' ? parsed.shuffleNonce : createShuffleNonce(),
      passedWordIds: Array.isArray(parsed.passedWordIds)
        ? parsed.passedWordIds.filter((id): id is string => typeof id === 'string')
        : [],
      sessionComplete: parsed.sessionComplete === true,
    }
  } catch {
    return null
  }
}

function saveStoredSession(key: string, snapshot: CanvasSessionSnapshot) {
  try {
    sessionStorage.setItem(key, JSON.stringify(snapshot))
  } catch {
    // sessionStorage unavailable; non-fatal
  }
}

function loadStoredDirection(): CanvasDirection {
  try {
    const value = localStorage.getItem(DIRECTION_STORAGE_KEY)
    return isCanvasDirection(value) ? value : DEFAULT_DIRECTION
  } catch {
    return DEFAULT_DIRECTION
  }
}

function loadStoredAutoReveal(): CanvasAutoReveal {
  try {
    const value = localStorage.getItem(AUTO_REVEAL_STORAGE_KEY)
    return isCanvasAutoReveal(value) ? value : DEFAULT_AUTO_REVEAL
  } catch {
    return DEFAULT_AUTO_REVEAL
  }
}

function saveLocalPreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // localStorage unavailable; non-fatal
  }
}

function hashString(input: string) {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createSeededRandom(seed: number) {
  let state = seed || 1
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function normalizeLanguage(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function getLanguageCode(language: string | null | undefined) {
  const normalized = normalizeLanguage(language)
  const match = LANGUAGES.find((item) => (
    item.value.toLowerCase() === normalized
    || item.nativeName.toLowerCase() === normalized
    || item.code.toLowerCase() === normalized
  ))
  if (match) return match.code.toUpperCase()
  const fallback = language?.trim()
  return fallback ? fallback.slice(0, 3).toUpperCase() : '--'
}

export default function StudyCanvas() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { activeLanguage } = useLanguage()

  const deckId = searchParams.get('deck')
  const rawReturnTo = searchParams.get('returnTo')
  const returnTo = rawReturnTo?.startsWith('/') ? rawReturnTo : null
  const sessionStorageKey = useMemo(
    () => getCanvasSessionStorageKey(deckId, activeLanguage),
    [activeLanguage, deckId],
  )
  const initialSession = useMemo(() => loadStoredSession(sessionStorageKey), [sessionStorageKey])

  // Per-tab UI/session state. This is intentionally sessionStorage-backed,
  // because canvas progress is a study session snapshot, not a user preference.
  const [hydratedSessionKey, setHydratedSessionKey] = useState(sessionStorageKey)
  const [activeMode, setActiveMode] = useState<CanvasMode>(() => initialSession?.activeMode ?? DEFAULT_MODE)
  const [showImages, setShowImages] = useState<boolean>(() => initialSession?.showImages ?? false)
  const [direction, setDirection] = useState<CanvasDirection>(loadStoredDirection)
  const [autoReveal, setAutoReveal] = useState<CanvasAutoReveal>(loadStoredAutoReveal)

  // Session state
  const [currentPage, setCurrentPage] = useState(() => initialSession?.currentPage ?? 0)
  const [shuffleNonce, setShuffleNonce] = useState(() => initialSession?.shuffleNonce ?? createShuffleNonce())
  const [passedWords, setPassedWords] = useState<Set<string>>(
    () => new Set(initialSession?.passedWordIds ?? []),
  )
  const [sessionComplete, setSessionComplete] = useState(() => initialSession?.sessionComplete ?? false)

  // Data
  const { words, loading, recordAttempt } = useStudySession(deckId, 'canvas', activeLanguage)

  useEffect(() => {
    saveLocalPreference(DIRECTION_STORAGE_KEY, direction)
  }, [direction])

  useEffect(() => {
    saveLocalPreference(AUTO_REVEAL_STORAGE_KEY, autoReveal)
  }, [autoReveal])

  useEffect(() => {
    if (hydratedSessionKey === sessionStorageKey) return

    const stored = loadStoredSession(sessionStorageKey)
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setActiveMode(stored?.activeMode ?? DEFAULT_MODE)
      setShowImages(stored?.showImages ?? false)
      setCurrentPage(stored?.currentPage ?? 0)
      setShuffleNonce(stored?.shuffleNonce ?? createShuffleNonce())
      setPassedWords(new Set(stored?.passedWordIds ?? []))
      setSessionComplete(stored?.sessionComplete ?? false)
      setHydratedSessionKey(sessionStorageKey)
    })

    return () => {
      cancelled = true
    }
  }, [hydratedSessionKey, sessionStorageKey])

  useEffect(() => {
    if (hydratedSessionKey !== sessionStorageKey) return

    saveStoredSession(sessionStorageKey, {
      activeMode,
      showImages,
      currentPage,
      shuffleNonce,
      passedWordIds: Array.from(passedWords),
      sessionComplete,
    })
  }, [
    activeMode,
    currentPage,
    hydratedSessionKey,
    passedWords,
    sessionComplete,
    sessionStorageKey,
    showImages,
    shuffleNonce,
  ])

  // One deterministic Fisher-Yates shuffle per (words, shuffleNonce). Pure of currentPage.
  const shuffled = useMemo(() => {
    const arr = [...words]
    const random = createSeededRandom(hashString(`${shuffleNonce}:${arr.map((word) => word.id).join('|')}`))
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [words, shuffleNonce])

  const totalPages = Math.max(0, Math.ceil(shuffled.length / PAGE_SIZE))
  const currentPageWords = useMemo(
    () => shuffled
      .slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
      .map((word) => {
        const faces = getCardFaces(word, word)
        const promptFace = direction === 'target-visible' ? faces.target : faces.base
        const answerFace = direction === 'target-visible' ? faces.base : faces.target

        return {
          ...word,
          faces,
          text: promptFace,
          promptFace,
          answerFace,
        }
      }),
    [shuffled, currentPage, direction],
  )

  const languagePair = useMemo<CanvasLanguagePair>(() => {
    const languageWord = words.find((word) => word.target_language || word.base_language)
    const deckTarget = languageWord?.target_language ?? null
    const deckBase = languageWord?.base_language ?? null
    const target = deckTarget ?? activeLanguage ?? null
    const base = deckBase

    return {
      target,
      base,
      targetCode: getLanguageCode(target),
      baseCode: getLanguageCode(base),
      isSameLanguage: !!target && !!base && normalizeLanguage(target) === normalizeLanguage(base),
    }
  }, [activeLanguage, words])

  const hasCompleteDeckLanguagePair = useMemo(() => {
    const languageWord = words.find((word) => word.target_language || word.base_language)
    const deckTarget = languageWord?.target_language ?? null
    const deckBase = languageWord?.base_language ?? null

    return !!deckTarget && !!deckBase && normalizeLanguage(deckTarget) !== normalizeLanguage(deckBase)
  }, [words])

  // Empty pool → instant completion. Only flips to true; explicit handlers reset to false.
  useEffect(() => {
    if (!loading && shuffled.length === 0) {
      queueMicrotask(() => setSessionComplete(true))
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
    setCurrentPage(0)
    setShuffleNonce((n) => n + 1)
    setPassedWords(new Set())
    setSessionComplete(false)
    // The empty-pool effect will re-flip sessionComplete to true if pool is empty.
  }, [])

  const handleToggleImages = useCallback(() => {
    setShowImages((prev) => !prev)
  }, [])

  const handleToggleDirection = useCallback(() => {
    setDirection((prev) => prev === 'target-visible' ? 'base-visible' : 'target-visible')
    setShuffleNonce((n) => n + 1)
    setPassedWords(new Set())
    setSessionComplete(false)
  }, [])

  const handleToggleAutoReveal = useCallback(() => {
    setAutoReveal((prev) => prev === 'on' ? 'off' : 'on')
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
      <CanvasShell>
        <div className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center gap-4">
          <ParticleSpinner preset="heart" size={140} />
          <p className="text-sm text-white/50">Loading…</p>
        </div>
      </CanvasShell>
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
      key={`${activeMode}-${shuffleNonce}-${currentPage}-${direction}`}
      words={currentPageWords}
      masteredWordIds={passedWords}
      showImages={showImages}
      sessionComplete={sessionComplete}
      direction={direction}
      autoReveal={autoReveal}
      languagePair={languagePair}
      canToggleDirection={hasCompleteDeckLanguagePair}
      currentPage={currentPage}
      totalPages={totalPages}
      activeMode={activeMode}
      onPass={handlePass}
      onFail={handleFail}
      onPrevPage={handlePrevPage}
      onNextPage={handleNextPage}
      onSwitchMode={handleSwitchMode}
      onToggleImages={handleToggleImages}
      onToggleDirection={handleToggleDirection}
      onToggleAutoReveal={handleToggleAutoReveal}
      onExit={goToReturnOrStudy}
      onContinue={goToReturnOrStudy}
    />
  )
}
