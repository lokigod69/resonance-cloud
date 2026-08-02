import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GameShell } from '../shared/GameShell'
import { useGameDeck } from '../shared/useGameDeck'
import { useIOSAudioPrimer } from '../shared/useIOSAudioPrimer'
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
import { trackLearningAction } from '@/lib/analytics'
import { supabase } from '@/lib/supabase'
import {
  buildStaticThematicPlaybackQuery,
  fetchStaticThematicPlayback,
  getStaticThematicVoiceProfileKeys,
} from '@/lib/staticThematicAudio'
import { DEFAULT_SESSION_CONFIG, MIN_DECK_CARDS, type ResolveResult, type SessionEngine, type SessionStats, type SurfDeck, type SurfMode, type WaveSpec } from './engine/types'
import { createSessionEngine } from './engine/sessionEngine'
import { attachDeckStaticAudio, collectDeckStaticAudioRequests, wordsToSurfDeck } from './adapters/deckAdapter'
import { attachPackAudio, packToSurfDeck } from './adapters/packAdapter'
import { SurfPicker, type SurfPickerOption } from './components/SurfPicker'
import { SurfHUD } from './components/SurfHUD'
import { SurfSessionComplete } from './components/SurfSessionComplete'
import { SurfSfx } from './audio'
import { SurfRenderer, type SurfRendererCallbacks } from './renderer/SurfRenderer'
import styles from './styles.module.css'

type HudState = { score: number; combo: number; lives: number; level: number }
type Phase = 'picker' | 'playing' | 'paused' | 'complete'
type Feedback = { correct: boolean; target: string; prompt: string } | null
type SurfSession = { deck: SurfDeck; mode: SurfMode }

const INITIAL_HUD: HudState = { score: 0, combo: 0, lives: DEFAULT_SESSION_CONFIG.lives, level: 0 }

/** A changed deep-link target (deck / due queue) remounts the whole session via
 * `key` — the React-idiomatic way to tear down a live run instead of manual
 * state resets (a stale session must never keep playing over new params). */
export default function SurfGame() {
  const [searchParams] = useSearchParams()
  const deckKey = searchParams.get('deck') ?? ''
  const dueKey = searchParams.get('queue') === 'due' ? searchParams.get('lang') ?? '' : ''
  return <SurfGameSession key={`${deckKey}|${dueKey}`} />
}

function SurfGameSession() {
  const { profile } = useAuth()
  const { activeLanguage } = useLanguage()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { primeOnGesture } = useIOSAudioPrimer()
  const recordResult = useRecordGameResult()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<SurfRenderer | null>(null)
  const autoStartedDueRef = useRef(false)
  const autoStartedDeckRef = useRef(false)
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
  const deckParam = searchParams.get('deck')
  const dueLanguage = searchParams.get('queue') === 'due'
    ? canonicalizeLanguageValue(searchParams.get('lang')) || null
    : null
  const returnTo = searchParams.get('returnTo') || '/dashboard'
  const { rows, loading: deckLoading } = useGameDeck('surf', deckParam, language)
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

  const deckTargetLanguage = rows[0]?.decks?.target_language ?? null
  const deckLabel = rows[0]?.decks?.name?.trim() || language || ''
  const allDeck = useMemo(() => wordsToSurfDeck(rows, {
    id: `surf-all-${language ?? 'unknown'}`,
    label: deckParam ? deckLabel : language ?? '',
    source: 'deck',
    language,
  }), [deckLabel, deckParam, language, rows])
  const dueRows = useMemo(
    () => dueWordIds ? rows.filter((row) => dueWordIds.has(row.id)) : [],
    [dueWordIds, rows],
  )
  const dueOnlyDeck = useMemo(() => wordsToSurfDeck(
    dueRows,
    { id: `surf-due-${dueLanguage ?? 'unknown'}`, label: deckParam ? deckLabel : t('surf.picker.dueWords'), source: 'due', language: dueLanguage },
  ), [deckLabel, deckParam, dueLanguage, dueRows, t])
  const dueDeck = deckParam && dueOnlyDeck.cards.length < MIN_DECK_CARDS ? allDeck : dueOnlyDeck
  const dueSessionRows = deckParam && dueOnlyDeck.cards.length < MIN_DECK_CARDS ? rows : dueRows
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

  const primeAudio = useCallback(() => {
    void primeOnGesture().catch(() => undefined)
    void sfx.unlock().then(() => sfx.load()).catch(() => undefined)
  }, [primeOnGesture, sfx])

  const attachStaticAudio = useCallback((deck: SurfDeck, sourceRows: typeof rows) => {
    const targetLanguageCode = resolveStaticCategoryTargetLanguageCode(language ?? deckTargetLanguage)
    collectDeckStaticAudioRequests(sourceRows).forEach(({ categorySlug, level, conceptIds, rowIdByConceptId }) => {
      const voiceProfileKeys = getStaticThematicVoiceProfileKeys({ targetLanguageCode, categorySlug })
      void fetchStaticThematicPlayback(supabase, buildStaticThematicPlaybackQuery({
        targetLanguageCode,
        categorySlug,
        levelNumber: level,
        conceptIds,
        voiceProfileKeys,
      }))
        .then((lookup) => attachDeckStaticAudio(deck, lookup, rowIdByConceptId, voiceProfileKeys?.[0]))
        .catch(() => undefined)
    })
  }, [deckTargetLanguage, language])

  const startSession = useCallback((deck: SurfDeck, mode: SurfMode, prime = true, sourceRows?: typeof rows) => {
    if (deck.cards.length < MIN_DECK_CARDS) return
    if (prime) primeAudio()
    if (deck.source !== 'pack' && sourceRows) attachStaticAudio(deck, sourceRows)
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
  }, [attachStaticAudio, primeAudio])

  const startWords = useCallback((option: SurfPickerOption, mode: SurfMode) => {
    startSession(option.source === 'due' ? dueDeck : allDeck, mode, true, option.source === 'due' ? dueSessionRows : rows)
  }, [allDeck, dueDeck, dueSessionRows, rows, startSession])

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

  // Each visit owns its AudioContext; browsers cap how many can stay alive.
  useEffect(() => () => sfx.dispose(), [sfx])

  useEffect(() => {
    if (
      !dueLanguage
      || deckParam
      || !dueReady
      || duePickerFallback
      || autoStartedDueRef.current
      || phase !== 'picker'
    ) return
    autoStartedDueRef.current = true
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) startSession(dueDeck, 'cruise', false, dueSessionRows)
    })
    return () => {
      cancelled = true
    }
  }, [deckParam, dueDeck, dueLanguage, duePickerFallback, dueReady, dueSessionRows, phase, startSession])

  useEffect(() => {
    const deckReady = !deckLoading && (!dueLanguage || dueResolved)
    const sessionDeck = dueLanguage ? dueDeck : allDeck
    const sessionRows = dueLanguage ? dueSessionRows : rows
    if (
      !deckParam
      || !deckReady
      || sessionDeck.cards.length < MIN_DECK_CARDS
      || autoStartedDeckRef.current
      || phase !== 'picker'
    ) return
    autoStartedDeckRef.current = true
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) startSession(sessionDeck, 'cruise', false, sessionRows)
    })
    return () => {
      cancelled = true
    }
  }, [allDeck, deckLoading, deckParam, dueDeck, dueLanguage, dueResolved, dueSessionRows, phase, rows, startSession])

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

  const callbacks = useMemo<SurfRendererCallbacks>(() => ({
    onWave: setWave,
    onResolve,
    onHud: setHud,
    onSessionComplete: (stats: SessionStats) => {
      trackLearningAction('game_round', {
        game: 'surf',
        score: stats.score,
        correct: stats.correct,
        wrong: stats.wrong,
      })
      setCompleteStats(stats)
      setPhase('complete')
    },
  }), [onResolve])

  const callbacksRef = useRef(callbacks)
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])
  const rendererCallbacks = useMemo<SurfRendererCallbacks>(() => ({
    onWave: (nextWave) => callbacksRef.current.onWave(nextWave),
    onResolve: (result) => callbacksRef.current.onResolve(result),
    onHud: (nextHud) => callbacksRef.current.onHud(nextHud),
    onSessionComplete: (stats) => callbacksRef.current.onSessionComplete(stats),
  }), [])

  // A run stays mounted across playing/paused/complete; only a fresh runKey
  // (or leaving for the picker) rebuilds the renderer.
  const runActive = phase !== 'picker'
  useEffect(() => {
    if (!runActive || !engine || !hostRef.current) return undefined
    const renderer = new SurfRenderer(hostRef.current, { engine, sfx, callbacks: rendererCallbacks })
    rendererRef.current = renderer
    return () => {
      renderer.destroy()
      if (rendererRef.current === renderer) rendererRef.current = null
    }
  }, [engine, rendererCallbacks, runActive, runKey, sfx])

  const pause = useCallback(() => {
    rendererRef.current?.pause()
    setPhase('paused')
  }, [])
  const resume = useCallback(() => {
    rendererRef.current?.resume()
    setPhase('playing')
  }, [])
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
      <div ref={hostRef} className={styles.stageHost} onPointerDownCapture={primeAudio} />
      {phase === 'picker' && (
        <SurfPicker
          language={language}
          returnTo={returnTo}
          options={options}
          packs={packs}
          loading={deckLoading || Boolean(dueLanguage && !dueResolved)}
          needsMoreWords={deckParam
            ? !deckLoading && allDeck.cards.length < MIN_DECK_CARDS
            : duePickerFallback || (!deckLoading && allDeck.cards.length < MIN_DECK_CARDS)}
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
