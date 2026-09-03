import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Volume2 } from 'lucide-react'
import type PhaserRuntime from 'phaser'
import { createGameEventBus } from '../shared/GameEventBus'
import { GameShell } from '../shared/GameShell'
import { useGameDeck } from '../shared/useGameDeck'
import { useIOSAudioPrimer } from '../shared/useIOSAudioPrimer'
import { usePhaserMount } from '../shared/usePhaserMount'
import { useRecordGameResult } from '../shared/useRecordGameResult'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { isLemmaDueNow, useWordStates } from '@/hooks/useWordStates'
import { canonicalizeLanguageValue } from '@/lib/languages'
import { trackLearningAction } from '@/lib/analytics'
import type { GameEvent } from '../shared/gameEvents'
import type { DeckDefinition } from './engine/types'
import { pickImageUrl, wordsToSlicerDeck } from './adapters/deckAdapter'
import { SlicerScene, type SlicerStudyCue } from './scene/SlicerScene'
import { DeckPicker, type SlicerDeckChoice } from './components/DeckPicker'
import { PauseOverlay } from './components/PauseOverlay'
import { RoundOverlay } from './components/RoundOverlay'
import { SessionComplete, type SlicerSessionResult } from './components/SessionComplete'
import { SlicerHUD } from './components/SlicerHUD'
import { SlicerAudio } from './scene/audio'
import styles from './styles.module.css'
import { safeInternalPath } from '@/lib/safeInternalPath'

type CardProgress = { current: number; total: number }

type HudState = {
  deckTitle: string
  roundNumber: number
  cardProgress: CardProgress
  lives: number
}

const DEFAULT_CARDS_PER_ROUND = 5

const INITIAL_HUD: HudState = {
  deckTitle: 'Lexicon Slice',
  roundNumber: 1,
  cardProgress: { current: 1, total: DEFAULT_CARDS_PER_ROUND },
  lives: 3,
}

const INITIAL_TALLY: SlicerSessionResult = { correct: 0, wrong: 0 }

export default function SlicerGame() {
  const { profile } = useAuth()
  const { activeLanguage } = useLanguage()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Playful dive-in from home: ?queue=due&lang=X skips the picker and slices
  // today's due pool (the same buckets the Word Tide draws from).
  const dueLanguage = searchParams.get('queue') === 'due'
    ? canonicalizeLanguageValue(searchParams.get('lang')) || null
    : null
  const returnTo = safeInternalPath(searchParams.get('returnTo'), '/dashboard')
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
  const [sessionResult, setSessionResult] = useState<SlicerSessionResult | null>(null)
  const tallyRef = useRef<SlicerSessionResult>(INITIAL_TALLY)
  const [restartNonce] = useState(0)
  const [readySceneKey, setReadySceneKey] = useState<string | null>(null)
  const [easyMode, setEasyMode] = useState(true)
  const [slicerLanguage, setSlicerLanguage] = useState<string | null>(activeLanguage)
  const [studyCue, setStudyCue] = useState<SlicerStudyCue | null>(null)

  // Due mode resolves its word pool before a deck exists: SRS lemma states for
  // the language, narrowed to what's due now. The hook idles on '' outside due
  // mode. `fetched` distinguishes a genuinely empty pool from one still loading
  // so the picker fallback never flashes before the first load lands.
  const dueStates = useWordStates(dueLanguage ?? '')
  const dueResolved = dueStates.fetched && !dueStates.loading
  const dueWordIds = useMemo(() => {
    if (!dueLanguage) return null
    // One card per lemma (first word id, like the Word Tide) — a lemma living
    // in several decks must not spawn duplicate cards.
    return new Set(
      dueStates.data
        .filter(isLemmaDueNow)
        .map((lemma) => lemma.wordIds[0])
        .filter((id): id is string => Boolean(id)),
    )
  }, [dueLanguage, dueStates.data])
  // Dead end (pool emptied between home and here, or states errored) → the
  // picker takes over so the player still gets a session.
  const duePickerFallback = Boolean(dueLanguage) && dueResolved && (dueWordIds?.size ?? 0) === 0

  // Due mode never touches the picker: its "selection" is derived from the due
  // pool. Audio priming happens on the first in-game gesture instead (the scene
  // primes on pointerdown), since navigation ate the launching tap.
  const dueChoice = useMemo<SlicerDeckChoice | null>(() => {
    if (!dueLanguage || !dueResolved || !dueWordIds || dueWordIds.size === 0) return null
    return {
      id: `due-${dueLanguage}`,
      title: t('slicer.dueWords.title'),
      targetLanguage: dueLanguage,
      mode: 'audio_to_image',
      isPlayAll: true,
    }
  }, [dueLanguage, dueResolved, dueWordIds, t])
  const activeDeck = selectedDeck ?? dueChoice
  // A picker selection (including the empty-pool fallback) always outranks due
  // mode — its rows must NOT be narrowed to the (possibly empty) due set.
  const inDueSession = !selectedDeck && dueChoice !== null

  const selectedDeckId = activeDeck?.isPlayAll ? null : activeDeck?.id ?? null

  const { rows, loading: deckLoading, error: deckError } = useGameDeck(
    activeDeck ? 'slicer' : '',
    selectedDeckId,
    activeDeck?.targetLanguage ?? null,
  )

  const sessionRows = useMemo(() => (
    inDueSession && dueWordIds ? rows.filter((row) => dueWordIds.has(row.id)) : rows
  ), [inDueSession, dueWordIds, rows])

  const slicerDeck = useMemo<DeckDefinition | null>(() => {
    if (!activeDeck || sessionRows.length === 0) return null
    // Due pools mix generated and text-only cards: image mode when anything
    // has an image (cards without one fall back to their text label).
    const mode = inDueSession
      ? (sessionRows.some((row) => pickImageUrl(row)) ? 'audio_to_image' : 'audio_to_text')
      : activeDeck.mode
    return wordsToSlicerDeck(sessionRows, {
      mode,
      targetLanguage: activeDeck.targetLanguage,
      baseLanguage: profile?.base_language ?? 'en',
      deckId: activeDeck.isPlayAll ? `play-all-${activeDeck.targetLanguage}` : activeDeck.id,
      deckTitle: activeDeck.title,
      shuffle: activeDeck.isPlayAll,
    })
  }, [activeDeck, inDueSession, profile?.base_language, sessionRows])

  const sceneKey = useMemo(() => {
    if (!slicerDeck) return null
    const imageFingerprint = slicerDeck.words.map((word) => `${word.id}:${word.imageUrl ?? ''}`).join('|')
    return `${slicerDeck.id}:${slicerDeck.mode ?? 'audio_to_image'}:${restartNonce}:${imageFingerprint}`
  }, [restartNonce, slicerDeck])

  const handleReturnToPicker = useCallback(() => {
    setSelectedDeck(null)
    setSessionResult(null)
    tallyRef.current = INITIAL_TALLY
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

  const preparingDeck = Boolean(activeDeck && ready && sceneKey && readySceneKey !== sceneKey)

  const primeSceneAudio = useCallback(async () => {
    await audioPrimePromiseRef.current?.catch(() => undefined)
    await primeOnGesture().catch(() => undefined)
  }, [primeOnGesture])

  const handleExitToSummary = useCallback(() => {
    gameRef.current?.scene.pause('slicer')
    setPaused(false)
    setSessionResult((current) => current ?? { ...tallyRef.current })
  }, [gameRef])

  useEffect(() => {
    if (!ready || !gameRef.current || !slicerDeck || !sceneKey) return undefined
    const game = gameRef.current
    game.scene.add('slicer', SlicerScene, true, {
      deck: slicerDeck,
      bus,
      primeAudioOnGesture: primeSceneAudio,
      onExit: handleExitToSummary,
      onSceneReady: () => setReadySceneKey(sceneKey),
      onTargetChange: setStudyCue,
      easyMode,
      audio: slicerAudioRef.current,
    })
  }, [bus, easyMode, gameRef, handleExitToSummary, primeSceneAudio, ready, sceneKey, slicerDeck])

  useEffect(() => bus.on((event) => {
    handleGameEvent(event, recordResult, setHud, setRoundLabel, setSessionResult, tallyRef)
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
    setSessionResult(null)
    tallyRef.current = INITIAL_TALLY
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

  const replayStudyCue = useCallback(() => {
    if (!studyCue) return
    void playTargetAudio(studyCue, primeOnGesture, slicerAudioRef.current)
  }, [primeOnGesture, studyCue])

  const showStudyCue = Boolean(
    activeDeck
      && studyCue
      && ready
      && !preparingDeck
      && !paused
      && !roundLabel
      && !sessionResult
      && !deckLoading
      && !deckError,
  )

  return (
    // GameShell's onExit fires on window ESC. When the viewer is still at the
    // in-app DeckPicker (no session yet) we hand it `undefined` so GameShell
    // falls back to its built-in navigate(returnTo) — otherwise ESC at the
    // picker would pop a meaningless 0/0 summary instead of leaving Slicer.
    <GameShell className={styles.slicerStage} onExit={activeDeck ? handleExitToSummary : undefined}>
      <div ref={phaserHostRef} className={styles.phaserHost} />
      <div className={styles.reactLayer}>
        {!activeDeck && (!dueLanguage || duePickerFallback) && (
          <DeckPicker
            easyMode={easyMode}
            selectedLanguage={slicerLanguage}
            onEasyModeChange={setEasyMode}
            onLanguageChange={setSlicerLanguage}
            onSelect={handleDeckSelected}
          />
        )}
        {!activeDeck && dueLanguage && !duePickerFallback && (
          <div className="pointer-events-auto absolute inset-x-4 top-24 z-40 mx-auto max-w-sm rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/55 p-4 text-center text-[#ffd2a5]">
            {t('slicer.loadingDeck')}
          </div>
        )}
        {activeDeck && (
          <SlicerHUD
            deckTitle={selectedDeck ? hud.deckTitle : activeDeck.title}
            roundNumber={hud.roundNumber}
            cardProgress={hud.cardProgress}
            lives={hud.lives}
            paused={paused}
            ready={ready}
            onPause={pauseScene}
            onResume={resumeScene}
            onExit={handleExitToSummary}
          />
        )}
        {activeDeck && deckLoading && (
          <div className="pointer-events-auto absolute inset-x-4 top-24 z-40 mx-auto max-w-sm rounded-lg border border-[rgba(255,107,53,0.24)] bg-black/55 p-4 text-center text-[#ffd2a5]">
            {t('slicer.loadingDeck')}
          </div>
        )}
        {activeDeck && deckError && (
          <div className="pointer-events-auto absolute inset-x-4 top-24 z-40 mx-auto max-w-sm rounded-lg border border-red-400/30 bg-red-950/50 p-4 text-center text-red-100">
            {deckError.message}
          </div>
        )}
        {activeDeck && ready && preparingDeck && (
          <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--slicer-border-subtle)] bg-black/55 px-5 py-3 text-center font-[var(--slicer-font-display)] text-xl text-[var(--slicer-text-primary)] shadow-[var(--slicer-shadow-soft)]">
            Preparing cards…
          </div>
        )}
        {showStudyCue && studyCue && (
          <AnswerReference cue={studyCue} onReplay={replayStudyCue} />
        )}
        <RoundOverlay label={roundLabel} />
        <PauseOverlay open={paused && !sessionResult} onResume={resumeScene} onExit={handleExitToSummary} />
        <SessionComplete
          result={sessionResult}
          onExit={inDueSession ? () => navigate(returnTo) : handleReturnToPicker}
          exitLabel={inDueSession ? t('slicer.dueWords.exit') : undefined}
        />
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
        <div className={`mt-1 font-serif text-lg leading-tight text-[#fff1d0] drop-shadow-[0_0_12px_rgba(255,100,0,0.34)] sm:text-2xl md:text-3xl lg:text-4xl ${styles.answerClamp}`}>
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
  setSessionResult: Dispatch<SetStateAction<SlicerSessionResult | null>>,
  tallyRef: { current: SlicerSessionResult },
) {
  if (event.type === 'game_attempt') {
    recordResult(event)
    tallyRef.current = {
      correct: tallyRef.current.correct + (event.passed ? 1 : 0),
      wrong: tallyRef.current.wrong + (event.passed ? 0 : 1),
    }
    const nextCardProgress = readCardProgress(event.metadata?.cardProgress)
    setHud((current) => ({
      ...current,
      cardProgress: nextCardProgress ?? current.cardProgress,
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
        cardProgress: { current: 1, total: current.cardProgress.total },
      }))
    }
    return
  }

  if (event.type === 'session_complete') {
    trackLearningAction('game_round', {
      game: 'slicer',
      score: tallyRef.current.correct,
      wrong: tallyRef.current.wrong,
    })
    setSessionResult((current) => current ?? { ...tallyRef.current })
  }
}

function readCardProgress(value: unknown): CardProgress | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as { current?: unknown; total?: unknown }
  if (typeof candidate.current !== 'number' || typeof candidate.total !== 'number') return null
  return { current: candidate.current, total: candidate.total }
}
