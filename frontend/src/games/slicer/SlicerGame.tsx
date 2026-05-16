import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Volume2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type PhaserRuntime from 'phaser'
import { createGameEventBus } from '../shared/GameEventBus'
import { GameShell } from '../shared/GameShell'
import { useGameDeck } from '../shared/useGameDeck'
import { useIOSAudioPrimer } from '../shared/useIOSAudioPrimer'
import { usePhaserMount } from '../shared/usePhaserMount'
import { useRecordGameResult } from '../shared/useRecordGameResult'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import type { GameEvent } from '../shared/gameEvents'
import type { DeckDefinition, SessionStats } from './engine/types'
import { wordsToSlicerDeck } from './adapters/deckAdapter'
import { SlicerScene, type SlicerStudyCue } from './scene/SlicerScene'
import { DeckPicker, type SlicerDeckChoice } from './components/DeckPicker'
import { PauseOverlay } from './components/PauseOverlay'
import { RoundOverlay } from './components/RoundOverlay'
import { SessionComplete } from './components/SessionComplete'
import { SlicerHUD } from './components/SlicerHUD'
import { SlicerAudio } from './scene/audio'
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
  const { activeLanguage } = useLanguage()
  const bus = useMemo(() => createGameEventBus(), [])
  const recordResult = useRecordGameResult()
  const { primeOnGesture } = useIOSAudioPrimer()
  const slicerAudioRef = useRef<SlicerAudio | null>(null)
  const audioPrimePromiseRef = useRef<Promise<void> | null>(null)
  const phaserHostRef = useRef<HTMLDivElement | null>(null)

  if (slicerAudioRef.current === null) {
    slicerAudioRef.current = new SlicerAudio()
  }

  const [selectedDeck, setSelectedDeck] = useState<SlicerDeckChoice | null>(null)
  const [hud, setHud] = useState<HudState>(INITIAL_HUD)
  const [paused, setPaused] = useState(false)
  const [roundLabel, setRoundLabel] = useState<string | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null)
  const [restartNonce, setRestartNonce] = useState(0)
  const [readySceneKey, setReadySceneKey] = useState<string | null>(null)
  const [easyMode, setEasyMode] = useState(true)
  const [slicerLanguage, setSlicerLanguage] = useState<string | null>(activeLanguage)
  const [studyCue, setStudyCue] = useState<SlicerStudyCue | null>(null)

  const selectedDeckId = selectedDeck?.isPlayAll ? null : selectedDeck?.id ?? null

  const { rows, loading: deckLoading, error: deckError } = useGameDeck(
    selectedDeck ? 'slicer' : '',
    selectedDeckId,
    selectedDeck?.targetLanguage ?? null,
  )

  const slicerDeck = useMemo<DeckDefinition | null>(() => {
    if (!selectedDeck || rows.length === 0) return null
    return wordsToSlicerDeck(rows, {
      mode: selectedDeck.mode,
      targetLanguage: selectedDeck.targetLanguage,
      baseLanguage: profile?.base_language ?? 'en',
      deckId: selectedDeck.isPlayAll ? `play-all-${selectedDeck.targetLanguage}` : selectedDeck.id,
      deckTitle: selectedDeck.title,
      shuffle: selectedDeck.isPlayAll,
    })
  }, [profile?.base_language, rows, selectedDeck])

  const sceneKey = useMemo(() => {
    if (!slicerDeck) return null
    const imageFingerprint = slicerDeck.words.map((word) => `${word.id}:${word.imageUrl ?? ''}`).join('|')
    return `${slicerDeck.id}:${slicerDeck.mode ?? 'audio_to_image'}:${restartNonce}:${imageFingerprint}`
  }, [restartNonce, slicerDeck])

  const handleExit = useCallback(() => {
    navigate(returnTo)
  }, [navigate, returnTo])

  const handleReturnToPicker = useCallback(() => {
    setSelectedDeck(null)
    setSessionStats(null)
    setPaused(false)
    setRoundLabel(null)
    setReadySceneKey(null)
    setStudyCue(null)
    setHud(INITIAL_HUD)
  }, [])

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

  const preparingDeck = Boolean(selectedDeck && ready && sceneKey && readySceneKey !== sceneKey)

  const primeSceneAudio = useCallback(async () => {
    await audioPrimePromiseRef.current?.catch(() => undefined)
    await primeOnGesture().catch(() => undefined)
  }, [primeOnGesture])

  useEffect(() => {
    if (!ready || !gameRef.current || !slicerDeck || !sceneKey) return undefined
    const game = gameRef.current
    game.scene.add('slicer', SlicerScene, true, {
      deck: slicerDeck,
      bus,
      primeAudioOnGesture: primeSceneAudio,
      onExit: handleExit,
      onSceneReady: () => setReadySceneKey(sceneKey),
      onTargetChange: setStudyCue,
      easyMode,
      audio: slicerAudioRef.current,
    })
  }, [bus, easyMode, gameRef, handleExit, primeSceneAudio, ready, sceneKey, slicerDeck])

  useEffect(() => bus.on((event) => {
    handleGameEvent(event, recordResult, setHud, setRoundLabel, setSessionStats)
  }), [bus, recordResult])

  const handleDeckSelected = useCallback((choice: SlicerDeckChoice) => {
    audioPrimePromiseRef.current = Promise.all([
      primeOnGesture().catch(() => undefined),
      slicerAudioRef.current?.unlock().catch(() => undefined),
    ]).then(() => undefined)
    setSelectedDeck(choice)
    setHud({
      ...INITIAL_HUD,
      deckTitle: choice.title,
    })
    setPaused(false)
    setRoundLabel(null)
    setSessionStats(null)
    setReadySceneKey(null)
    setStudyCue(null)
  }, [primeOnGesture])

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
    setReadySceneKey(null)
    setStudyCue(null)
    setHud({
      ...INITIAL_HUD,
      deckTitle: selectedDeck.title,
    })
  }, [selectedDeck])

  const replayStudyCue = useCallback(() => {
    if (!studyCue) return
    void playTargetAudio(studyCue, primeOnGesture, slicerAudioRef.current)
  }, [primeOnGesture, studyCue])

  const showStudyCue = Boolean(
    selectedDeck
      && studyCue
      && ready
      && !preparingDeck
      && !paused
      && !roundLabel
      && !sessionStats
      && !deckLoading
      && !deckError,
  )

  return (
    <GameShell className={styles.slicerStage} onExit={handleExit}>
      <div ref={phaserHostRef} className={styles.phaserHost} />
      <div className={styles.reactLayer}>
        {!selectedDeck && (
          <DeckPicker
            easyMode={easyMode}
            selectedLanguage={slicerLanguage}
            onEasyModeChange={setEasyMode}
            onLanguageChange={setSlicerLanguage}
            onSelect={handleDeckSelected}
          />
        )}
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
        {selectedDeck && ready && preparingDeck && (
          <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--slicer-border-subtle)] bg-black/55 px-5 py-3 text-center font-[var(--slicer-font-display)] text-xl text-[var(--slicer-text-primary)] shadow-[var(--slicer-shadow-soft)]">
            Preparing cards…
          </div>
        )}
        {showStudyCue && studyCue && (
          <AnswerReference cue={studyCue} onReplay={replayStudyCue} />
        )}
        <RoundOverlay label={roundLabel} />
        <PauseOverlay open={paused} onResume={resumeScene} onExit={handleExit} />
        <SessionComplete stats={sessionStats} onRestart={restartSession} onExit={handleReturnToPicker} />
      </div>
    </GameShell>
  )
}

function AnswerReference({ cue, onReplay }: { cue: SlicerStudyCue; onReplay: () => void }) {
  const displayText = cue.mode === 'audio_to_image' ? cue.word : cue.translation ?? cue.word

  return (
    <div className="pointer-events-auto absolute inset-x-4 bottom-[max(1.25rem,calc(var(--app-safe-bottom)+0.5rem))] z-30 mx-auto flex max-w-2xl items-center justify-between gap-4 rounded-xl border border-[rgba(255,107,53,0.24)] bg-black/58 px-5 py-3 text-[#fff1d0] shadow-[0_0_36px_rgba(255,69,0,0.16)] backdrop-blur-sm sm:bottom-7 sm:px-6">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[#ff9155]/70">Current answer</div>
        <div
          className="mt-1 font-serif text-lg leading-tight text-[#fff1d0] drop-shadow-[0_0_12px_rgba(255,100,0,0.34)] sm:text-2xl md:text-3xl lg:text-4xl"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {displayText}
        </div>
      </div>
      <button
        type="button"
        onClick={onReplay}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[rgba(255,215,0,0.34)] bg-[#ff6b35]/12 text-[#ffd700] transition hover:bg-[#ff6b35]/22 hover:shadow-[0_0_18px_rgba(255,215,0,0.2)]"
        aria-label="Replay target audio"
      >
        <Volume2 size={22} />
      </button>
    </div>
  )
}

async function playTargetAudio(
  cue: SlicerStudyCue,
  primeOnGesture: () => Promise<void>,
  audio: SlicerAudio | null,
): Promise<void> {
  await primeOnGesture().catch(() => undefined)
  await audio?.unlock().catch(() => undefined)

  if (cue.audioUrl) {
    const player = new Audio(cue.audioUrl)
    await player.play().catch(() => speakTargetCue(cue))
    return
  }

  speakTargetCue(cue)
}

function speakTargetCue(cue: SlicerStudyCue): void {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return
  const utterance = new SpeechSynthesisUtterance(cue.word)
  utterance.lang = cue.targetLanguage
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
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
      cardProgress: typeof event.metadata?.cardProgress === 'string' ? event.metadata.cardProgress : current.cardProgress,
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
