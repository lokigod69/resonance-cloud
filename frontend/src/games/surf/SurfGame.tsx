import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type PhaserRuntime from 'phaser'
import { GameShell } from '../shared/GameShell'
import { useGameDeck } from '../shared/useGameDeck'
import { useIOSAudioPrimer } from '../shared/useIOSAudioPrimer'
import { usePhaserMount } from '../shared/usePhaserMount'
import { useRecordGameResult } from '../shared/useRecordGameResult'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { isLemmaDueNow, useWordStates } from '@/hooks/useWordStates'
import { playPronunciation } from '@/hooks/usePronunciation'
import {
  getPublicCategoryGroups,
  getStaticCategorySelectedItems,
  resolveStaticCategoryTargetLanguageCode,
  type Category,
} from '@/data/categories'
import { canonicalizeLanguageValue } from '@/lib/languages'
import { supabase } from '@/lib/supabase'
import {
  buildStaticThematicPlaybackQuery,
  fetchStaticThematicPlayback,
  getStaticThematicVoiceProfileKeys,
} from '@/lib/staticThematicAudio'
import { DEFAULT_SESSION_CONFIG, MIN_DECK_CARDS, type ResolveResult, type SessionEngine, type SessionStats, type SurfDeck, type SurfMode, type WaveSpec } from './engine/types'
import { createSessionEngine } from './engine/sessionEngine'
import { wordsToSurfDeck } from './adapters/deckAdapter'
import { attachPackAudio, packToSurfDeck } from './adapters/packAdapter'
import { SurfPicker, type SurfPickerOption } from './components/SurfPicker'
import { SurfHUD } from './components/SurfHUD'
import { SurfSessionComplete } from './components/SurfSessionComplete'
import { SurfSfx } from './scene/audio'
import { SurfScene } from './scene/SurfScene'
import { paletteForLevel } from './scene/palettes'
import styles from './styles.module.css'

type HudState = { score: number; combo: number; lives: number; level: number }
type Phase = 'picker' | 'playing' | 'paused' | 'complete'
type Feedback = { correct: boolean; target: string; prompt: string } | null
type SurfSession = { deck: SurfDeck; mode: SurfMode }

const INITIAL_HUD: HudState = { score: 0, combo: 0, lives: DEFAULT_SESSION_CONFIG.lives, level: 0 }

export default function SurfGame() {
  const { profile } = useAuth()
  const { activeLanguage } = useLanguage()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { primeOnGesture } = useIOSAudioPrimer()
  const recordResult = useRecordGameResult()
  const phaserHostRef = useRef<HTMLDivElement | null>(null)
  const autoStartedDueRef = useRef(false)
  const [sfx] = useState(() => new SurfSfx())
  const [phase, setPhase] = useState<Phase>('picker')
  const [engine, setEngine] = useState<SessionEngine | null>(null)
  const [session, setSession] = useState<SurfSession | null>(null)
  const [runKey, setRunKey] = useState(0)
  const [wave, setWave] = useState<WaveSpec | null>(null)
  const [hud, setHud] = useState<HudState>(INITIAL_HUD)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [completeStats, setCompleteStats] = useState<SessionStats | null>(null)
  const [muted, setMuted] = useState(sfx.muted)

  const queryLanguage = canonicalizeLanguageValue(searchParams.get('lang'))
  const language = queryLanguage || activeLanguage || null
  const dueLanguage = searchParams.get('queue') === 'due'
    ? canonicalizeLanguageValue(searchParams.get('lang')) || null
    : null
  const returnTo = searchParams.get('returnTo') || '/dashboard'
  const { rows, loading: deckLoading } = useGameDeck('surf', null, language)
  const dueStates = useWordStates(dueLanguage ?? '')
  const dueResolved = dueStates.fetched && !dueStates.loading
  const dueWordIds = useMemo(() => {
    if (!dueLanguage) return null
    return new Set(
      dueStates.data
        .filter(isLemmaDueNow)
        .map((lemma) => lemma.wordIds[0])
        .filter((id): id is string => Boolean(id)),
    )
  }, [dueLanguage, dueStates.data])

  const allDeck = useMemo(() => wordsToSurfDeck(rows, {
    id: `surf-all-${language ?? 'unknown'}`,
    label: language ?? '',
    source: 'deck',
    language,
  }), [language, rows])
  const dueDeck = useMemo(() => wordsToSurfDeck(
    dueWordIds ? rows.filter((row) => dueWordIds.has(row.id)) : [],
    { id: `surf-due-${dueLanguage ?? 'unknown'}`, label: t('surf.picker.dueWords'), source: 'due', language: dueLanguage },
  ), [dueLanguage, dueWordIds, rows, t])
  const dueReady = Boolean(dueLanguage && dueResolved && !deckLoading)
  const duePickerFallback = Boolean(dueLanguage && dueReady && dueDeck.cards.length < MIN_DECK_CARDS)
  const options = useMemo<SurfPickerOption[]>(() => {
    const next: SurfPickerOption[] = []
    if (dueLanguage && dueReady && dueDeck.cards.length >= MIN_DECK_CARDS) {
      next.push({ id: dueDeck.id, label: t('surf.picker.dueWords'), count: dueDeck.cards.length, source: 'due' })
    }
    if (allDeck.cards.length >= MIN_DECK_CARDS) {
      next.push({ id: allDeck.id, label: t('surf.picker.playAll', { language: language ?? '' }), count: allDeck.cards.length, source: 'deck' })
    }
    return next
  }, [allDeck, dueDeck, dueLanguage, dueReady, language, t])
  const packs = useMemo(
    () => getPublicCategoryGroups().flatMap((group) => group.categories).filter((category) => Boolean(category.staticWordLevels?.length)),
    [],
  )

  const buildConfig = useCallback((Phaser: typeof PhaserRuntime) => ({
    type: Phaser.AUTO,
    backgroundColor: `#${paletteForLevel(0).skyTop.toString(16).padStart(6, '0')}`,
    width: phaserHostRef.current?.clientWidth || window.innerWidth,
    height: phaserHostRef.current?.clientHeight || window.innerHeight,
    scene: [],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, pixelArt: false },
    input: { activePointers: 2, touch: true },
  } satisfies Phaser.Types.Core.GameConfig), [])
  const { gameRef, ready } = usePhaserMount({ parentRef: phaserHostRef, enabled: phase !== 'picker', buildConfig })

  const primeAudio = useCallback(() => {
    void primeOnGesture().catch(() => undefined)
    void sfx.unlock().then(() => sfx.load()).catch(() => undefined)
  }, [primeOnGesture, sfx])

  const startSession = useCallback((deck: SurfDeck, mode: SurfMode, prime = true) => {
    if (deck.cards.length < MIN_DECK_CARDS) return
    if (prime) primeAudio()
    setWave(null)
    setHud(INITIAL_HUD)
    setFeedback(null)
    setCompleteStats(null)
    setSession({ deck, mode })
    setEngine(createSessionEngine(deck, {
      ...DEFAULT_SESSION_CONFIG,
      mode,
      seed: Date.now(),
      wavesPerRun: Math.min(20, Math.max(10, deck.cards.length * 2)),
    }))
    setRunKey((current) => current + 1)
    setPhase('playing')
  }, [primeAudio])

  const startWords = useCallback((option: SurfPickerOption, mode: SurfMode) => {
    startSession(option.source === 'due' ? dueDeck : allDeck, mode)
  }, [allDeck, dueDeck, startSession])

  const startPack = useCallback((category: Category, level: number, mode: SurfMode) => {
    const languageCode = resolveStaticCategoryTargetLanguageCode(language)
    const items = getStaticCategorySelectedItems(category, 24, level, language, profile?.base_language ?? 'English')
    const deck = packToSurfDeck(items, {
      id: `surf-pack-${category.id ?? category.name}-${level}-${languageCode}`,
      label: t(category.labelKey),
      languageCode,
    })
    if (deck.cards.length < MIN_DECK_CARDS) return
    const categorySlug = items[0]?.categoryId ?? category.id ?? category.name
    const voiceProfileKeys = getStaticThematicVoiceProfileKeys({ targetLanguageCode: languageCode, categorySlug })
    void fetchStaticThematicPlayback(supabase, buildStaticThematicPlaybackQuery({
      targetLanguageCode: languageCode,
      categorySlug,
      levelNumber: level,
      conceptIds: deck.cards.map((card) => card.id),
      voiceProfileKeys,
    }))
      .then((lookup) => attachPackAudio(deck, lookup, voiceProfileKeys?.[0]))
      .catch(() => undefined)
    startSession(deck, mode)
  }, [language, profile?.base_language, startSession, t])

  useEffect(() => {
    autoStartedDueRef.current = false
  }, [dueLanguage])

  useEffect(() => {
    if (
      !dueLanguage
      || !dueReady
      || duePickerFallback
      || autoStartedDueRef.current
      || phase !== 'picker'
    ) return
    autoStartedDueRef.current = true
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) startSession(dueDeck, 'cruise', false)
    })
    return () => {
      cancelled = true
    }
  }, [dueDeck, dueLanguage, duePickerFallback, dueReady, phase, startSession])

  const onResolve = useCallback((result: ResolveResult) => {
    setFeedback({ correct: result.correct, target: result.target.term, prompt: result.target.prompt })
    void playPronunciation({ text: result.target.term, audioUrl: result.target.audioUrl, lang: result.target.languageCode })
    if (session && session.deck.source !== 'pack') {
      recordResult({
        type: 'game_attempt',
        gameId: 'surf',
        wordId: result.target.id,
        passed: result.correct,
        timestamp: Date.now(),
        metadata: { source: session.deck.source, mode: session.mode, level: result.levelBefore },
      })
    }
  }, [recordResult, session])

  const callbacks = useMemo(() => ({
    onWave: setWave,
    onResolve,
    onHud: setHud,
    onSessionComplete: (stats: SessionStats) => {
      setCompleteStats(stats)
      setPhase('complete')
    },
  }), [onResolve])

  useEffect(() => {
    if (!ready || !gameRef.current || !engine) return undefined
    const game = gameRef.current
    if (game.scene.getScene('surf')) game.scene.remove('surf')
    game.scene.add('surf', SurfScene, true, { engine, sfx, callbacks })
    return () => {
      if (game.scene.getScene('surf')) game.scene.remove('surf')
    }
  }, [callbacks, engine, gameRef, ready, runKey, sfx])

  const getScene = useCallback((): SurfScene | null => {
    try {
      return gameRef.current?.scene.getScene('surf') as SurfScene ?? null
    } catch {
      return null
    }
  }, [gameRef])
  const pause = useCallback(() => {
    getScene()?.pause()
    setPhase('paused')
  }, [getScene])
  const resume = useCallback(() => {
    getScene()?.resume()
    setPhase('playing')
  }, [getScene])
  const toggleMuted = useCallback(() => {
    const next = !sfx.muted
    sfx.setMuted(next)
    setMuted(next)
  }, [sfx])
  const hideFeedback = useCallback(() => setFeedback(null), [])
  const playAgain = useCallback(() => {
    if (session) startSession(session.deck, session.mode)
  }, [session, startSession])
  const exit = useCallback(() => navigate(returnTo), [navigate, returnTo])
  // ESC mid-run pauses instead of exiting; a second ESC (or Exit button) leaves.
  const shellExit = phase === 'playing' ? pause : exit

  return (
    <GameShell className={styles.stage} onExit={shellExit}>
      <div ref={phaserHostRef} className={styles.phaserHost} onPointerDownCapture={primeAudio} />
      {phase === 'picker' && (
        <SurfPicker
          language={language}
          returnTo={returnTo}
          options={options}
          packs={packs}
          loading={deckLoading || Boolean(dueLanguage && !dueResolved)}
          needsMoreWords={duePickerFallback || (!deckLoading && allDeck.cards.length < MIN_DECK_CARDS)}
          onStartWords={startWords}
          onStartPack={startPack}
        />
      )}
      {phase !== 'picker' && (
        <SurfHUD
          wave={wave}
          hud={hud}
          feedback={feedback}
          muted={muted}
          onFeedbackHidden={hideFeedback}
          onPause={pause}
          onToggleMuted={toggleMuted}
        />
      )}
      {phase === 'paused' && (
        <section className={styles.pauseCard} aria-live="polite">
          <p className={styles.completeKicker}>{t('surf.hud.pause')}</p>
          <div className={styles.actions}>
            <button type="button" onClick={resume}>{t('surf.hud.resume')}</button>
            <button type="button" className={styles.secondaryButton} onClick={exit}>{t('surf.complete.exit')}</button>
          </div>
        </section>
      )}
      {phase === 'complete' && completeStats && <SurfSessionComplete stats={completeStats} onPlayAgain={playAgain} onExit={exit} />}
    </GameShell>
  )
}
