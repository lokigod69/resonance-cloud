import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GameShell } from '../shared/GameShell'
import { useGameDeck } from '../shared/useGameDeck'
import { useIOSAudioPrimer } from '../shared/useIOSAudioPrimer'
import { usePhaserMount } from '../shared/usePhaserMount'
import { useRecordGameResult } from '../shared/useRecordGameResult'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { adaptDeck } from './adapters/deckAdapter'
import { RunnerAudio } from './audio/RunnerAudio'
import { DeckPicker, type RunnerDeckChoice } from './components/DeckPicker'
import { PauseOverlay } from './components/PauseOverlay'
import { RoundOverlay } from './components/RoundOverlay'
import { RunnerHUD } from './components/RunnerHUD'
import { SessionComplete } from './components/SessionComplete'
import { EventBus, type GameCard, type LexiconPathEvent, type SessionStats } from './engine'
import { mountRunner, type MountedRunner, type RunnerMode } from './shells/runner'
import styles from './styles.module.css'

type HudState = {
  deckTitle: string
  levelNumber: number
  cardProgress: string
  score: number
  combo: number
  maxCombo: number
  lives: number
}

const INITIAL_HUD: HudState = {
  deckTitle: 'Runner',
  levelNumber: 1,
  cardProgress: '1 / 30',
  score: 0,
  combo: 0,
  maxCombo: 0,
  lives: 3,
}

export default function RunnerGame() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/games'
  const { session, loading } = useAuth()
  const { activeLanguage } = useLanguage()
  const recordResult = useRecordGameResult()
  const { primeOnGesture } = useIOSAudioPrimer()
  const phaserHostRef = useRef<HTMLDivElement | null>(null)
  const runnerAudioRef = useRef<RunnerAudio | null>(null)
  const runnerHandleRef = useRef<MountedRunner | null>(null)

  if (runnerAudioRef.current === null) {
    runnerAudioRef.current = new RunnerAudio()
  }
  const runnerAudio = runnerAudioRef.current

  const [selectedDeck, setSelectedDeck] = useState<RunnerDeckChoice | null>(null)
  const [runnerLanguage, setRunnerLanguage] = useState<string | null>(activeLanguage)
  const [easyMode, setEasyMode] = useState(true)
  const [audioReady, setAudioReady] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hud, setHud] = useState<HudState>(INITIAL_HUD)
  const [activePrompt, setActivePrompt] = useState<GameCard | null>(null)
  const [levelLabel, setLevelLabel] = useState<string | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Lingwave - Runner'
    return () => {
      document.title = previousTitle
    }
  }, [])

  const selectedDeckId = selectedDeck?.isPlayAll ? null : selectedDeck?.id ?? null
  const runnerMode: RunnerMode = easyMode ? 'glide' : 'rush'

  const { rows, loading: deckLoading, error: deckError } = useGameDeck(
    selectedDeck ? 'runner' : '',
    selectedDeckId,
    selectedDeck?.targetLanguage ?? null,
  )

  const deckState = useMemo(() => {
    if (!selectedDeck || rows.length === 0) return { deck: null, error: null as string | null }

    try {
      const deck = adaptDeck(rows, selectedDeck.targetLanguage)
      return {
        deck: {
          ...deck,
          id: selectedDeck.id,
          name: selectedDeck.title,
        },
        error: null,
      }
    } catch (error) {
      return {
        deck: null,
        error: error instanceof Error ? error.message : 'Runner could not prepare this deck.',
      }
    }
  }, [rows, selectedDeck])

  const runnerDeck = deckState.deck
  const deckPreparationError = selectedDeck && !deckLoading && !deckError && !runnerDeck
    ? deckState.error ?? 'Runner needs at least three words.'
    : null

  const completeSession = useCallback((stats: SessionStats) => {
    setSessionStats((current) => current ?? stats)
  }, [])

  const eventBus = useMemo(() => new EventBus((event: LexiconPathEvent) => {
    switch (event.type) {
      case 'prompt_spawned': {
        const target = readTarget(event.payload)
        if (target) setActivePrompt(target)

        const promptOrdinal = readPromptOrdinal(event.payload.promptId)
        const levelIndex = readNumber(event.payload.levelIndex)
        setHud((current) => ({
          ...current,
          levelNumber: levelIndex === null ? current.levelNumber : levelIndex + 1,
          cardProgress: promptOrdinal === null ? current.cardProgress : `${Math.min(promptOrdinal + 1, 30)} / 30`,
        }))
        return
      }

      case 'card_correct': {
        const target = readTarget(event.payload)
        const levelIndex = readNumber(event.payload.levelIndex)
        const score = readNumber(event.payload.score)
        const combo = readNumber(event.payload.combo)
        if (target) {
          recordResult({
            type: 'game_attempt',
            gameId: 'runner',
            wordId: target.id,
            passed: true,
            timestamp: event.at,
            metadata: { mode: runnerMode, level: levelIndex },
          })
        }
        setHud((current) => ({
          ...current,
          score: score ?? current.score,
          combo: combo ?? current.combo,
          maxCombo: combo === null ? current.maxCombo : Math.max(current.maxCombo, combo),
        }))
        return
      }

      case 'card_missed':
      case 'card_skipped': {
        const target = readTarget(event.payload)
        const levelIndex = readNumber(event.payload.levelIndex)
        if (target) {
          recordResult({
            type: 'game_attempt',
            gameId: 'runner',
            wordId: target.id,
            passed: false,
            timestamp: event.at,
            metadata: { mode: runnerMode, level: levelIndex },
          })
        }
        setHud((current) => ({
          ...current,
          combo: 0,
        }))
        return
      }

      case 'life_lost': {
        const remaining = readNumber(event.payload.remaining)
        if (remaining !== null) {
          setHud((current) => ({ ...current, lives: remaining }))
        }
        return
      }

      case 'level_complete': {
        const completedLevel = readNumber(event.payload.levelIndex)
        const label = completedLevel === null ? 'Level Complete' : `Level ${completedLevel} Complete`
        setLevelLabel(label)
        window.setTimeout(() => setLevelLabel(null), 1350)
        return
      }

      case 'session_complete': {
        const stats = event.payload.stats
        if (isSessionStats(stats)) completeSession(stats)
        return
      }

      default:
        return
    }
  }), [completeSession, recordResult, runnerMode])

  const handleExit = useCallback(() => {
    if (selectedDeck) {
      setSelectedDeck(null)
      setSessionStats(null)
      setPaused(false)
      setLevelLabel(null)
      setActivePrompt(null)
      setAudioReady(false)
      setHud(INITIAL_HUD)
      return
    }
    navigate(returnTo)
  }, [navigate, returnTo, selectedDeck])

  const handleDeckSelected = useCallback((choice: RunnerDeckChoice) => {
    setSelectedDeck(choice)
    setAudioReady(false)
    setPaused(false)
    setSessionStats(null)
    setLevelLabel(null)
    setActivePrompt(null)
    setHud({
      ...INITIAL_HUD,
      deckTitle: choice.title,
    })

    void Promise.all([
      primeOnGesture().catch(() => undefined),
      runnerAudio.prime().catch(() => undefined),
    ]).finally(() => setAudioReady(true))
  }, [primeOnGesture, runnerAudio])

  const pauseRunner = useCallback(() => {
    runnerHandleRef.current?.pause()
    runnerAudio.pause()
    setPaused(true)
  }, [runnerAudio])

  const resumeRunner = useCallback(() => {
    runnerHandleRef.current?.resume()
    runnerAudio.resume()
    setPaused(false)
  }, [runnerAudio])

  const mount = useCallback((parent: HTMLElement) => {
    if (!runnerDeck || !audioReady) return null

    const handle = mountRunner({
      parent,
      mode: runnerMode,
      deck: runnerDeck,
      displayMode: selectedDeck?.displayMode ?? 'image',
      audioBackend: runnerAudio,
      eventBus,
      enableWindowKeyShortcuts: true,
      onSessionComplete: (stats) => {
        completeSession(stats)
      },
    })

    runnerHandleRef.current = handle
    queueMicrotask(() => {
      parent.querySelector<HTMLButtonElement>('[data-start-button]')?.click()
    })

    return {
      destroy: () => {
        if (runnerHandleRef.current === handle) runnerHandleRef.current = null
        handle.destroy()
      },
    }
  }, [audioReady, completeSession, eventBus, runnerAudio, runnerDeck, runnerMode, selectedDeck])

  const { ready } = usePhaserMount({
    parentRef: phaserHostRef,
    enabled: Boolean(runnerDeck) && audioReady,
    mount,
  })

  const replayPrompt = useCallback(() => {
    if (!activePrompt) return
    void runnerAudio.speak(activePrompt.word, activePrompt.audioUrl, activePrompt.languageCode)
  }, [activePrompt, runnerAudio])

  const showAnswerReference = Boolean(
    selectedDeck
      && activePrompt
      && ready
      && !paused
      && !levelLabel
      && !sessionStats
      && !deckLoading
      && !deckError,
  )

  if (loading || !session) {
    return (
      <GameShell className={styles.runnerStage} onExit={handleExit}>
        <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center px-4 text-center text-[#d0f0ff]">
          <div className="rounded-lg border border-[var(--runner-border-strong)] bg-[var(--surface-glass)] p-8 shadow-[var(--runner-shadow-soft)]">
            Loading
          </div>
        </div>
      </GameShell>
    )
  }

  return (
    <GameShell className={styles.runnerStage} onExit={handleExit}>
      <div ref={phaserHostRef} className={styles.phaserHost} />
      <div className={styles.reactLayer}>
        {!selectedDeck && (
          <DeckPicker
            easyMode={easyMode}
            selectedLanguage={runnerLanguage}
            onEasyModeChange={setEasyMode}
            onLanguageChange={setRunnerLanguage}
            onSelect={handleDeckSelected}
          />
        )}

        {selectedDeck && (
          <RunnerHUD
            deckTitle={hud.deckTitle}
            levelNumber={hud.levelNumber}
            cardProgress={hud.cardProgress}
            score={hud.score}
            combo={hud.combo}
            lives={hud.lives}
            paused={paused}
            ready={ready}
            onPause={pauseRunner}
            onResume={resumeRunner}
            onExit={handleExit}
          />
        )}

        {selectedDeck && deckLoading && (
          <StatusPanel>Loading deck...</StatusPanel>
        )}
        {selectedDeck && deckError && (
          <StatusPanel>{deckError.message}</StatusPanel>
        )}
        {deckPreparationError && (
          <StatusPanel>{deckPreparationError}</StatusPanel>
        )}
        {selectedDeck && runnerDeck && !audioReady && (
          <StatusPanel>Preparing audio...</StatusPanel>
        )}

        {showAnswerReference && activePrompt && selectedDeck && (
          <AnswerReference
            card={activePrompt}
            displayMode={selectedDeck.displayMode}
            onReplay={replayPrompt}
          />
        )}

        <RoundOverlay label={levelLabel} />
        <PauseOverlay open={paused} onResume={resumeRunner} onExit={handleExit} />
        <SessionComplete
          stats={sessionStats}
          maxCombo={hud.maxCombo}
          onExit={handleExit}
        />
      </div>
    </GameShell>
  )
}

function StatusPanel({ children }: { children: string }) {
  return (
    <div className="pointer-events-auto absolute inset-x-4 top-24 z-40 mx-auto max-w-sm rounded-lg border border-[var(--runner-border-strong)] bg-[var(--surface-glass)] p-4 text-center text-[#d0f0ff] shadow-[var(--runner-shadow-soft)] backdrop-blur-md">
      {children}
    </div>
  )
}

function AnswerReference({
  card,
  displayMode,
  onReplay,
}: {
  card: GameCard
  displayMode: RunnerDeckChoice['displayMode']
  onReplay: () => void
}) {
  const displayText = displayMode === 'image' ? card.word : card.translation

  return (
    <div
      data-runner-interactive="true"
      className="pointer-events-auto absolute bottom-5 left-1/2 z-30 flex w-[min(calc(100vw-2rem),42rem)] -translate-x-1/2 items-center justify-between gap-4 rounded-lg border-2 border-[var(--runner-border-strong)] bg-[var(--surface-glass)] px-5 py-3 text-[#d0f0ff] shadow-[var(--runner-shadow-soft)] backdrop-blur-md sm:bottom-7 sm:px-6"
    >
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[#a8d8ea]/70">Current answer</div>
        <div className="mt-1 truncate font-[var(--runner-font-display)] text-3xl leading-tight text-[#d0f0ff] drop-shadow-[0_0_12px_rgba(168,216,234,0.34)] sm:text-5xl">
          {displayText}
        </div>
      </div>
      <button
        type="button"
        onClick={onReplay}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[color:var(--accent)] bg-[#2a4a6a]/70 text-[#d0f0ff] transition hover:bg-[#2a4a6a] hover:shadow-[0_0_18px_rgba(79,195,247,0.28)]"
        aria-label="Replay target audio"
      >
        <Volume2 size={22} />
      </button>
    </div>
  )
}

function readTarget(payload: Record<string, unknown>): GameCard | null {
  const target = payload.target
  if (!target || typeof target !== 'object') return null

  const candidate = target as Partial<GameCard>
  return typeof candidate.id === 'string'
    && typeof candidate.word === 'string'
    && typeof candidate.translation === 'string'
    && typeof candidate.imageUrl === 'string'
    && typeof candidate.languageCode === 'string'
    ? candidate as GameCard
    : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readPromptOrdinal(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const match = /^prompt-(\d+)$/.exec(value)
  return match ? Number(match[1]) : null
}

function isSessionStats(value: unknown): value is SessionStats {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Record<keyof SessionStats, unknown>>
  return typeof candidate.score === 'number'
    && typeof candidate.correct === 'number'
    && typeof candidate.missed === 'number'
    && typeof candidate.skipped === 'number'
    && typeof candidate.combo === 'number'
    && typeof candidate.lives === 'number'
}
