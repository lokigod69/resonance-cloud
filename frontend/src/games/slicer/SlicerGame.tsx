import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type PhaserRuntime from 'phaser'
import { createGameEventBus } from '../shared/GameEventBus'
import { GameShell } from '../shared/GameShell'
import { useGameDeck } from '../shared/useGameDeck'
import { useIOSAudioPrimer } from '../shared/useIOSAudioPrimer'
import { usePhaserMount } from '../shared/usePhaserMount'
import { useRecordGameResult } from '../shared/useRecordGameResult'
import { useAuth } from '@/hooks/useAuth'
import type { GameEvent } from '../shared/gameEvents'
import type { DeckDefinition, SessionStats } from './engine/types'
import { wordsToSlicerDeck } from './adapters/deckAdapter'
import { SlicerScene } from './scene/SlicerScene'
import { DeckPicker, type SlicerDeckChoice } from './components/DeckPicker'
import { PauseOverlay } from './components/PauseOverlay'
import { RoundOverlay } from './components/RoundOverlay'
import { SessionComplete } from './components/SessionComplete'
import { SlicerHUD } from './components/SlicerHUD'
import styles from './styles.module.css'

type HudState = {
  deckTitle: string
  roundNumber: number
  cardProgress: string
  score: number
  combo: number
  lives: number
}

const INITIAL_HUD: HudState = {
  deckTitle: 'Lexicon Slice',
  roundNumber: 1,
  cardProgress: '1 / 5',
  score: 0,
  combo: 0,
  lives: 3,
}

export default function SlicerGame() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/games'
  const { profile } = useAuth()
  const bus = useMemo(() => createGameEventBus(), [])
  const recordResult = useRecordGameResult()
  const { primeOnGesture } = useIOSAudioPrimer()
  const phaserHostRef = useRef<HTMLDivElement | null>(null)

  const [selectedDeck, setSelectedDeck] = useState<SlicerDeckChoice | null>(null)
  const [hud, setHud] = useState<HudState>(INITIAL_HUD)
  const [paused, setPaused] = useState(false)
  const [roundLabel, setRoundLabel] = useState<string | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null)
  const [restartNonce, setRestartNonce] = useState(0)

  const { rows, loading: deckLoading, error: deckError } = useGameDeck(
    selectedDeck ? 'slicer' : '',
    selectedDeck?.id ?? null,
    selectedDeck?.targetLanguage ?? null,
  )

  const slicerDeck = useMemo<DeckDefinition | null>(() => {
    if (!selectedDeck || rows.length === 0) return null
    return wordsToSlicerDeck(rows, {
      mode: selectedDeck.mode,
      targetLanguage: selectedDeck.targetLanguage,
      baseLanguage: profile?.base_language ?? 'en',
      deckId: selectedDeck.id,
      deckTitle: selectedDeck.title,
    })
  }, [profile?.base_language, rows, selectedDeck])

  const handleExit = useCallback(() => {
    navigate(returnTo)
  }, [navigate, returnTo])

  const buildConfig = useCallback((Phaser: typeof PhaserRuntime) => {
    void restartNonce
    if (!slicerDeck) return null
    return {
      type: Phaser.AUTO,
      backgroundColor: '#050505',
      width: phaserHostRef.current?.clientWidth || window.innerWidth,
      height: phaserHostRef.current?.clientHeight || window.innerHeight,
      scene: [],
      physics: {
        default: 'arcade',
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        pixelArt: false,
        antialias: true,
      },
      input: {
        activePointers: 2,
        touch: true,
      },
    } satisfies Phaser.Types.Core.GameConfig
  }, [restartNonce, slicerDeck])

  const { gameRef, ready } = usePhaserMount({
    parentRef: phaserHostRef,
    enabled: Boolean(slicerDeck),
    buildConfig,
  })

  useEffect(() => {
    if (!ready || !gameRef.current || !slicerDeck) return undefined
    const game = gameRef.current
    game.scene.add('slicer', SlicerScene, true, {
      deck: slicerDeck,
      bus,
      primeAudioOnGesture: primeOnGesture,
      onExit: handleExit,
    })

    return () => {
      // usePhaserMount owns Phaser.Game teardown; removing the scene here races Phaser internals on refresh.
      game.scene.stop('slicer')
    }
  }, [bus, gameRef, handleExit, primeOnGesture, ready, slicerDeck])

  useEffect(() => bus.on((event) => {
    handleGameEvent(event, recordResult, setHud, setRoundLabel, setSessionStats)
  }), [bus, recordResult])

  const handleDeckSelected = useCallback((choice: SlicerDeckChoice) => {
    setSelectedDeck(choice)
    setHud({
      ...INITIAL_HUD,
      deckTitle: choice.title,
    })
    setPaused(false)
    setRoundLabel(null)
    setSessionStats(null)
  }, [])

  const pauseScene = useCallback(() => {
    gameRef.current?.scene.pause('slicer')
    setPaused(true)
  }, [gameRef])

  const resumeScene = useCallback(() => {
    gameRef.current?.scene.resume('slicer')
    setPaused(false)
  }, [gameRef])

  const restartSession = useCallback(() => {
    if (!selectedDeck) return
    setRestartNonce((current) => current + 1)
    setSessionStats(null)
    setRoundLabel(null)
    setPaused(false)
    setHud({
      ...INITIAL_HUD,
      deckTitle: selectedDeck.title,
    })
  }, [selectedDeck])

  return (
    <GameShell className={styles.slicerStage} onExit={handleExit}>
      <div ref={phaserHostRef} className={styles.phaserHost} />
      <div className={styles.reactLayer}>
        {!selectedDeck && <DeckPicker onSelect={handleDeckSelected} />}
        {selectedDeck && (
          <SlicerHUD
            deckTitle={hud.deckTitle}
            roundNumber={hud.roundNumber}
            cardProgress={hud.cardProgress}
            score={hud.score}
            combo={hud.combo}
            lives={hud.lives}
            paused={paused}
            ready={ready}
            onPause={pauseScene}
            onResume={resumeScene}
            onExit={handleExit}
          />
        )}
        {selectedDeck && deckLoading && (
          <div className="pointer-events-auto absolute inset-x-4 top-24 z-40 mx-auto max-w-sm rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/55 p-4 text-center text-[#ffd2a5]">
            Loading deck...
          </div>
        )}
        {selectedDeck && deckError && (
          <div className="pointer-events-auto absolute inset-x-4 top-24 z-40 mx-auto max-w-sm rounded-lg border border-red-400/30 bg-red-950/50 p-4 text-center text-red-100">
            {deckError.message}
          </div>
        )}
        <RoundOverlay label={roundLabel} />
        <PauseOverlay open={paused} onResume={resumeScene} onExit={handleExit} />
        <SessionComplete stats={sessionStats} onRestart={restartSession} onExit={handleExit} />
      </div>
    </GameShell>
  )
}

function handleGameEvent(
  event: GameEvent,
  recordResult: (event: Extract<GameEvent, { type: 'game_attempt' }>) => void,
  setHud: Dispatch<SetStateAction<HudState>>,
  setRoundLabel: Dispatch<SetStateAction<string | null>>,
  setSessionStats: Dispatch<SetStateAction<SessionStats | null>>,
) {
  if (event.type === 'game_attempt') {
    recordResult(event)
    setHud((current) => ({
      ...current,
      combo: typeof event.metadata?.combo === 'number' ? event.metadata.combo : current.combo,
      score: event.passed ? current.score + 100 : current.score,
      lives: event.passed ? current.lives : Math.max(0, current.lives - 1),
    }))
    return
  }

  if (event.type === 'round_complete') {
    const round = typeof event.payload?.round === 'number' ? event.payload.round : null
    setRoundLabel(round ? `Round ${round} Complete` : 'Round Complete')
    window.setTimeout(() => setRoundLabel(null), 1350)
    if (round) {
      setHud((current) => ({
        ...current,
        roundNumber: Math.min(10, round + 1),
        cardProgress: '1 / 5',
      }))
    }
    return
  }

  if (event.type === 'session_complete') {
    const stats = event.payload?.stats
    if (isSessionStats(stats)) setSessionStats(stats)
  }
}

function isSessionStats(value: unknown): value is SessionStats {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Record<keyof SessionStats, unknown>>
  return typeof candidate.score === 'number'
    && typeof candidate.correct === 'number'
    && typeof candidate.missed === 'number'
    && typeof candidate.skipped === 'number'
    && typeof candidate.maxCombo === 'number'
}
