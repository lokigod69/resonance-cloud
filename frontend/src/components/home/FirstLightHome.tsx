import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { useWordStates, type LemmaState } from '@/hooks/useWordStates'
import { useTodayMission } from '@/hooks/useTodayMission'
import { useHomeVisit } from '@/hooks/useHomeVisit'
import { useHomeRecommendation } from '@/hooks/useHomeRecommendation'
import { useHomeWordDetails } from '@/lib/homeWordDetails'
import { playPronunciation, prefetchPronunciationAudio } from '@/hooks/usePronunciation'
import { getLanguageCode, speakConversationLanguageCode } from '@/lib/languages'
import { normalizeNewWordsPerDay } from '@/lib/dailyHabits'
import { WAVE_HORIZON_FRACTION } from '@/lib/waveField'
import { HomeWaveBackground } from '@/components/dashboard/HomeWaveBackground'
import type { WaveRipple } from '@/components/branding/LingwaveWaves'
import FirstLightTopRow from '@/components/home/FirstLightTopRow'
import HomeRecommendationCard from '@/components/home/HomeRecommendationCard'
import CurrentStrip from '@/components/home/CurrentStrip'
import TidelineBuoys from '@/components/home/TidelineBuoys'
import HorizonMoreMarker from '@/components/home/HorizonMoreMarker'
import BuoyPracticeSheet from '@/components/home/BuoyPracticeSheet'

// FirstLightHome — the D-02 "First Light" home (design/DESIGN_SPEC.md).
//
// Composes the whole surface: sky (top row · state line · one recommendation
// card), waterline (status-only CurrentStrip), sea (word buoys riding the
// real swell, opening typed recall in place). Owns the visit store, the buoy
// cooldowns, the chained sheet queue, and the wave inputs (dawn / ripples /
// clock). Home recommends and may start a bounded retrieval; destinations
// sustain.

const MISS_COOLDOWN_MS = 90_000
const CLEAR_MOMENT_MS = 2_000
const REST_BUOY_COUNT = 4

type FirstLightHomeProps = {
  userId: string
  activeLanguage: string
  availableLanguages: string[]
  onSelectLanguage: (lang: string) => void
  onAddLanguage: (lang: string) => void
  /** First deck in the active language — target of the `preparing` hero. */
  deckHref: string
}

export default function FirstLightHome({
  userId,
  activeLanguage,
  availableLanguages,
  onSelectLanguage,
  onAddLanguage,
  deckHref,
}: FirstLightHomeProps) {
  const { profile } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion() ?? false

  const newWordDailyCap = normalizeNewWordsPerDay(profile?.new_words_per_day)
  const wordStates = useWordStates(activeLanguage, { newWordDailyCap })
  const mission = useTodayMission({
    activeLanguage,
    baseLanguage: profile?.base_language,
    userId,
    enabled: true,
  })

  const visitState = useHomeVisit({
    userId,
    language: activeLanguage,
    wordStates,
    mission: mission.mission,
    missionLoading: mission.loading,
  })
  const { visit, duePool, clearedKeys, dawn, tierKey, recordGraded } = visitState

  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setIsDesktop(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  const maxBuoys = isDesktop ? 12 : 5

  const hero = useHomeRecommendation({
    wordStates,
    visit,
    visitKey: visit?.key ?? null,
    duePoolCount: duePool.length,
    // The populated branch only renders when decks exist in this language.
    hasDecks: true,
    mission: mission.mission,
    missionLoading: mission.loading,
    isSpeakLanguage: speakConversationLanguageCode(activeLanguage) !== null,
    deckHref,
  })

  // ── Wave inputs: dawn target, tap ripples, and the shared clock ───────────
  const ripplesRef = useRef<WaveRipple[]>([])
  const clockRef = useRef(30)
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  const addRipple = useCallback((lemmaKey: string, amp: number) => {
    const pos = positionsRef.current.get(lemmaKey)
    if (!pos) return
    ripplesRef.current = [...ripplesRef.current.slice(-3), { x: pos.x, y: pos.y, start: performance.now(), amp }]
  }, [])

  // ── Buoy cooldowns (§6.3): misses drift back for 90s — never the last
  // unlocked buoy, so a stall is impossible by construction. ────────────────
  const [cooldowns, setCooldowns] = useState<Map<string, number>>(new Map())
  const cooldownTimersRef = useRef<Map<string, number>>(new Map())

  const clearCooldownTimers = useCallback(() => {
    cooldownTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    cooldownTimersRef.current.clear()
  }, [])

  const visibleDue = useMemo(() => duePool.slice(0, maxBuoys), [duePool, maxBuoys])

  // The buoys ACTUALLY on the water, as reported by TidelineBuoys after
  // collision resolution — the queue, the never-lock-last guarantee, and the
  // backlog marker all key off this set. Words in the slot-budget slice with
  // no rendered buoy must never count as "unlocked" or be served by the sheet.
  const [onWaterKeys, setOnWaterKeys] = useState<ReadonlySet<string>>(new Set())
  const onWaterChange = useCallback((keys: string[]) => setOnWaterKeys(new Set(keys)), [])
  const onWaterDue = useMemo(() => {
    const filtered = duePool.filter((lemma) => onWaterKeys.has(lemma.lemmaKey))
    // Before the first report (or across a mode switch with stale keys) fall
    // back to the slot-budget slice so the water is never wrongly "empty".
    return filtered.length > 0 ? filtered : duePool.slice(0, maxBuoys)
  }, [duePool, maxBuoys, onWaterKeys])

  const startCooldown = useCallback((lemmaKey: string) => {
    setCooldowns((prev) => {
      // Unlocked = on the water and not already cooling; if this miss is the
      // last unlocked buoy, the cooldown never applies (§6.3).
      const unlocked = onWaterDue.filter((lemma) => !prev.has(lemma.lemmaKey))
      if (unlocked.length <= 1) return prev
      const next = new Map(prev)
      next.set(lemmaKey, Date.now() + MISS_COOLDOWN_MS)
      const timer = window.setTimeout(() => {
        cooldownTimersRef.current.delete(lemmaKey)
        setCooldowns((current) => {
          if (!current.has(lemmaKey)) return current
          const after = new Map(current)
          after.delete(lemmaKey)
          return after
        })
      }, MISS_COOLDOWN_MS)
      cooldownTimersRef.current.set(lemmaKey, timer)
      return next
    })
  }, [onWaterDue])

  // The never-lock-last guarantee must hold REACTIVELY, not just at the moment
  // a cooldown starts: a correct grade can remove the last unlocked buoy from
  // the pool while others still cool (miss w1, clear w2 → w1 alone and locked).
  // Whenever every buoy ON THE WATER is cooling, release the earliest-expiring
  // cooldown so one buoy is always actionable (§6.3/§6.4).
  useEffect(() => {
    if (onWaterDue.length === 0 || !onWaterDue.every((lemma) => cooldowns.has(lemma.lemmaKey))) return
    let earliest: string | null = null
    let earliestUntil = Infinity
    cooldowns.forEach((until, lemmaKey) => {
      if (until < earliestUntil && onWaterDue.some((lemma) => lemma.lemmaKey === lemmaKey)) {
        earliestUntil = until
        earliest = lemmaKey
      }
    })
    if (earliest === null) return
    const releaseKey: string = earliest
    const timer = cooldownTimersRef.current.get(releaseKey)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      cooldownTimersRef.current.delete(releaseKey)
    }
     
    setCooldowns((prev) => {
      if (!prev.has(releaseKey)) return prev
      const next = new Map(prev)
      next.delete(releaseKey)
      return next
    })
  }, [cooldowns, onWaterDue])

  // ── The chained sheet queue (§6.4) ────────────────────────────────────────
  const [sheet, setSheet] = useState<{ lemma: LemmaState; cooldown: boolean } | null>(null)

  const openSheetAt = useCallback((lemma: LemmaState, cooldown: boolean) => {
    setSheet({ lemma, cooldown })
  }, [])

  // The hero commits once per visit (§5), so this CTA can outlive the water it
  // described. Never a dead button (§8.1): with buoys locked, hand off to the
  // all-due session; with the pool empty, to the library.
  const startRecallRun = useCallback(() => {
    const first = onWaterDue.find((lemma) => !cooldowns.has(lemma.lemmaKey))
    if (first) {
      setSheet({ lemma: first, cooldown: false })
      return
    }
    if (duePool.length > 0) navigate(`/study?lang=${encodeURIComponent(activeLanguage)}`)
    else navigate('/categories')
  }, [activeLanguage, cooldowns, duePool.length, navigate, onWaterDue])

  const submitGrade = useCallback(async (lemma: LemmaState, knewIt: boolean) => {
    const { error } = await supabase
      .from('recall_attempts')
      .insert({ user_id: userId, word_id: lemma.wordIds[0], knew_it: knewIt, study_mode: 'tide' })
    if (error) throw new Error(error.message)
    recordGraded(lemma.lemmaKey, knewIt)
    addRipple(lemma.lemmaKey, knewIt ? 1 : 0.6)
    if (!knewIt) startCooldown(lemma.lemmaKey)
  }, [addRipple, recordGraded, startCooldown, userId])

  // What the queue would serve next, live. The learner asks for it explicitly
  // (§6.4 — the card holds until they press Next), so this is read at click
  // time with the grade's state updates already rendered into it, and the
  // sheet can honestly label the button Next vs Done before they press it.
  // The queue runs over the buoys actually on the water, never a pool word
  // without one.
  const nextInQueue = useMemo(() => {
    if (!sheet) return null
    if (visit && visit.graded >= visit.proposed) return null
    return onWaterDue.find(
      (lemma) =>
        lemma.lemmaKey !== sheet.lemma.lemmaKey &&
        !cooldowns.has(lemma.lemmaKey) &&
        !clearedKeys.has(lemma.lemmaKey),
    ) ?? null
  }, [clearedKeys, cooldowns, onWaterDue, sheet, visit])

  const advanceQueue = useCallback(() => {
    setSheet(nextInQueue ? { lemma: nextInQueue, cooldown: false } : null)
  }, [nextInQueue])

  // Server truth refreshes when the sheet closes — not per grade. Mid-queue the
  // local pool (data minus clearedKeys) already tells the truth, and a per-grade
  // refetch would reshuffle buoys behind the open sheet for nothing (§11).
  const prevSheetOpenRef = useRef(false)
  useEffect(() => {
    const open = sheet !== null
    if (prevSheetOpenRef.current && !open) wordStates.refetch()
    prevSheetOpenRef.current = open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, wordStates.refetch])

  // Key change (language switch / detected rollover): the sheet closes, miss
  // timers cancel, the new visit composes (§4). Rollover is only detected on
  // wake-up triggers, so an actively running mid-queue session never resets
  // out from under the learner.
  const lifecycleKey = `${userId}|${activeLanguage}`
  useEffect(() => {
    return () => {
      setSheet(null)
      setCooldowns(new Map())
      setOnWaterKeys(new Set())
      clearCooldownTimers()
    }
  }, [lifecycleKey, clearCooldownTimers])
  const prevVisitKeyRef = useRef<string | null>(null)
  useEffect(() => {
    const key = visit?.key ?? null
    if (key !== null && prevVisitKeyRef.current !== null && key !== prevVisitKeyRef.current) {
       
      setSheet(null)
      setCooldowns(new Map())
      clearCooldownTimers()
    }
    if (key !== null) prevVisitKeyRef.current = key
  }, [visit?.key, clearCooldownTimers])
  useEffect(() => () => clearCooldownTimers(), [clearCooldownTimers])

  // ── Water state: clear moment, rest buoys ─────────────────────────────────
  // An empty pool is only TRUSTED when the RPC is healthy — on failure
  // useWordStates clears data, and celebrating a network error as "the water
  // is clear" would be the worst lie this surface could tell (§5/§8.1).
  const poolEmptyTrusted = duePool.length === 0 && wordStates.error === null
  const zeroDueArrival = Boolean(visit) && !visit?.segments.recall
  const waterCleared = Boolean(visit?.segments.recall) && poolEmptyTrusted && cooldowns.size === 0
  const [clearMomentDone, setClearMomentDone] = useState(false)
  useEffect(() => {
    if (!waterCleared) {
       
      setClearMomentDone(false)
      return
    }
    const timer = window.setTimeout(() => setClearMomentDone(true), CLEAR_MOMENT_MS)
    return () => window.clearTimeout(timer)
  }, [waterCleared])

  // Rest mode requires the pool to be ACTUALLY empty right now — the visit's
  // zero-due composition is immutable, but the pool can refill on a focus
  // refetch, and a due word must never hide behind a latched rest state.
  const showRestBuoys = poolEmptyTrusted && (zeroDueArrival || (waterCleared && clearMomentDone))
  const restLemmas = useMemo(() => {
    if (!showRestBuoys) return []
    const poolKeys = new Set(duePool.map((lemma) => lemma.lemmaKey))
    return wordStates.data
      .filter((lemma) => !poolKeys.has(lemma.lemmaKey) && lemma.wordIds.length > 0)
      .sort((a, b) => ((b.lastAttemptAt ?? '') < (a.lastAttemptAt ?? '') ? -1 : 1))
      .slice(0, REST_BUOY_COUNT)
  }, [duePool, showRestBuoys, wordStates.data])

  // Detail lookup budget: the visible buoys only (5 mobile / 12 desktop, §7).
  const detailLemmas = useMemo(
    () => (showRestBuoys ? restLemmas : visibleDue),
    [restLemmas, showRestBuoys, visibleDue],
  )
  const details = useHomeWordDetails(detailLemmas, activeLanguage)

  // Warm every buoy's recording as soon as its url resolves. The first card of
  // a visit is the one most likely to be tapped before the static-library
  // lookup has landed — a cold fetch there is what makes the browser's
  // synthetic voice stand in for a word we actually recorded.
  useEffect(() => {
    details.forEach((detail) => prefetchPronunciationAudio(detail.ttsAudioUrl))
  }, [details])

  const onTapRest = useCallback((lemma: LemmaState) => {
    const detail = details.get(lemma.wordIds[0])
    void playPronunciation({
      text: lemma.displayWord,
      audioUrl: detail?.ttsAudioUrl,
      lang: activeLanguage,
      allowSpeechFallback: !detail?.ttsAudioUrl,
    })
  }, [activeLanguage, details])

  // ── State line: the dawn's text twin (§4), aria-live debounced (§12) ──────
  const lessonNumber = visit?.segments.lesson && mission.mission && mission.mission.pathId === visit.segments.lesson.pathId
    ? mission.mission.lessonNumber
    : null

  const tierLabel = t(`home.fl.tier.${tierKey}`)
  const clauses: string[] = []
  if (visit?.lessonDone) clauses.push(t('home.fl.clauseLesson'))
  if (visit?.speakDone) clauses.push(t('home.fl.clauseSpeak'))

  let stateLine: string
  if (!visit || hero.kind === 'preparing') {
    // While words are still forming, "calm water" would contradict the card.
    stateLine = ''
  } else if (visit.lapsed && visit.graded === 0 && visit.proposed > 0) {
    stateLine = t('home.fl.welcomeBack')
  } else if (visit.segments.recall) {
    stateLine = t('home.fl.visitLine', { graded: visit.graded, proposed: visit.proposed, tier: tierLabel })
    if (clauses.length > 0) stateLine += ` · ${clauses.join(' · ')}`
  } else if (clauses.length > 0) {
    stateLine = t('home.fl.visitLineNoRecall', { clause: clauses.join(' · '), tier: tierLabel })
  } else {
    stateLine = t('home.fl.calm')
  }

  // ── SE fold (§2): the strip sits just BELOW the waterline; the card's
  // bottom edge targets the waterline minus 12pt. Only when the compressed
  // card genuinely spills PAST the waterline into the strip's band does the
  // strip hide and fold its tokens into the state line — measured on the card
  // itself, not the sky container (whose bottom IS the waterline by design). ─
  const skyRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [stripFolded, setStripFolded] = useState(false)
  useLayoutEffect(() => {
    const measure = () => {
      const card = cardRef.current
      if (!card) return
      const horizonPx = document.documentElement.clientHeight * WAVE_HORIZON_FRACTION
      setStripFolded(card.getBoundingClientRect().bottom > horizonPx + 4)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [hero.kind, stateLine])

  // Folded strip (§2): the strip's tokens — plural — fold into the state line
  // so nothing the waterline carried is lost, and the screen-reader twin below
  // announces this same complete string.
  const recallDoneFold = visit ? visit.graded >= visit.proposed || poolEmptyTrusted : false
  const speakPendingFold = Boolean(visit?.segments.speak) && !visit?.speakDone
  const allDoneFold = Boolean(visit) && !speakPendingFold
    && (!visit?.segments.lesson || visit.lessonDone)
    && (!visit?.segments.recall || recallDoneFold)
    && Object.keys(visit?.segments ?? {}).length > 0
  let skyLine = stateLine
  if (stripFolded && visit && stateLine) {
    if (lessonNumber !== null) {
      skyLine += ` · ${t('home.fl.current.lesson', { lesson: lessonNumber })}${visit.lessonDone ? ' ✓' : ''}`
    }
    if (allDoneFold) skyLine += ` · ${t('home.fl.current.done')}`
    else if (speakPendingFold) skyLine += ` · ${t('home.fl.current.next', { step: t('nav.speak') })}`
  }

  const [announcedLine, setAnnouncedLine] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnouncedLine(skyLine), 400)
    return () => window.clearTimeout(timer)
  }, [skyLine])

  // ── Desktop THIS VISIT portal (§7) ────────────────────────────────────────
  const [navSlot, setNavSlot] = useState<HTMLElement | null>(null)
  useEffect(() => {
     
    setNavSlot(document.getElementById('app-topnav-right-slot'))
  }, [])

  // Backlog counts against the buoys ACTUALLY on the water — collision
  // resolution can swap or reduce them, and understating the debt would break
  // the binding backlog ruling (§0).
  const backlogCount = duePool.length - onWaterDue.length
  const langCode = getLanguageCode(activeLanguage) || undefined

  const activeDetail = sheet ? details.get(sheet.lemma.wordIds[0]) : undefined

  return (
    <>
      <HomeWaveBackground dawn={dawn} ripplesRef={ripplesRef} clockRef={clockRef} />

      {/* Sky content — normal document flow, sized to the sky (§2): the
          container's bottom edge is the waterline (40% of the visual
          viewport), and the card rides its bottom minus 12pt. On viewports
          shorter than ~660pt the sky compresses before anything scrolls. */}
      <div
        ref={skyRef}
        className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-stretch gap-3 pt-2 [@media(max-height:720px)]:gap-2"
        style={{ height: `calc(${WAVE_HORIZON_FRACTION * 100}dvh - var(--glassy-content-top-offset, 0px))`, minHeight: 0 }}
      >
        <FirstLightTopRow
          languages={availableLanguages}
          activeLanguage={activeLanguage}
          onSelectLanguage={onSelectLanguage}
          onAddLanguage={onAddLanguage}
        />
        {/* Desktop reads this line in the nav's THIS VISIT slot instead —
            rendering both would double it (§7). */}
        <p className="min-h-5 text-left font-display text-sm text-[var(--text-secondary)] md:hidden [@media(max-height:720px)]:text-[13px]" aria-hidden="true">
          {skyLine}
        </p>
        <span className="sr-only" aria-live="polite">{announcedLine}</span>
        <div ref={cardRef} className="mt-auto w-full max-w-md self-start pb-3 lg:max-w-xl lg:self-center">
          <HomeRecommendationCard
            hero={hero}
            phraseLang={mission.mission?.phraseLang}
            onStartRecall={startRecallRun}
            onRetry={wordStates.refetch}
          />
        </div>
      </div>

      {/* Waterline + sea — a viewport-anchored fixed sibling of the wave
          background, NOT inside the home stack: the canvas's 40% is the
          viewport's 40% (§2). */}
      <div className="pointer-events-none fixed inset-0">
        {!stripFolded && (
          <div
            className="absolute inset-x-0"
            style={{ top: `calc(${WAVE_HORIZON_FRACTION * 100}% + 0.5rem)` }}
          >
            <CurrentStrip visit={visit} lessonNumber={lessonNumber} poolEmpty={poolEmptyTrusted} />
          </div>
        )}

        {backlogCount > 0 && (
          <div
            className="absolute right-4"
            style={{ top: `calc(${WAVE_HORIZON_FRACTION * 100}% + 2.25rem)` }}
          >
            <HorizonMoreMarker count={backlogCount} language={activeLanguage} />
          </div>
        )}

        <AnimatePresence>
          {waterCleared && !clearMomentDone && (
            <motion.div
              key="clear-moment"
              className="absolute inset-x-0 flex justify-center"
              style={{ top: `calc(${WAVE_HORIZON_FRACTION * 100}% + 3rem)` }}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <p
                className="font-display text-base font-semibold text-[var(--accent-2)]"
                style={{ textShadow: '0 2px 14px rgba(5,2,8,0.6)' }}
              >
                {t('home.fl.clear')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {showRestBuoys ? (
          <TidelineBuoys
            mode="rest"
            lemmas={restLemmas}
            langCode={langCode}
            clockRef={clockRef}
            cooldowns={cooldowns}
            maxCount={Math.min(REST_BUOY_COUNT, maxBuoys)}
            onTap={onTapRest}
            reduceMotion={reduceMotion}
            buoyAria={(lemma) => t('home.fl.restBuoyAria', { word: lemma.displayWord })}
            positionsRef={positionsRef}
          />
        ) : (
          <TidelineBuoys
            mode="due"
            lemmas={duePool}
            langCode={langCode}
            clockRef={clockRef}
            cooldowns={cooldowns}
            maxCount={maxBuoys}
            onTap={openSheetAt}
            reduceMotion={reduceMotion}
            buoyAria={(lemma) =>
              cooldowns.has(lemma.lemmaKey)
                ? `${lemma.displayWord} · ${t('home.fl.sheetCooldown')}`
                : t('home.fl.buoyAria', { word: lemma.displayWord, gloss: lemma.translation })}
            positionsRef={positionsRef}
            onVisibleChange={onWaterChange}
          />
        )}
      </div>

      {/* Desktop THIS VISIT block portals into the top nav's right slot. */}
      {navSlot && visit
        ? createPortal(
            <span className="hidden text-right font-display text-xs leading-tight text-[var(--text-secondary)] md:block">
              {skyLine}
            </span>,
            navSlot,
          )
        : null}

      <BuoyPracticeSheet
        lemma={sheet?.lemma ?? null}
        detail={activeDetail}
        language={activeLanguage}
        langCode={langCode}
        cooldown={Boolean(sheet && sheet.cooldown && cooldowns.has(sheet.lemma.lemmaKey))}
        hasNext={nextInQueue !== null}
        onGrade={submitGrade}
        onAdvance={advanceQueue}
        onClose={() => setSheet(null)}
      />
    </>
  )
}
