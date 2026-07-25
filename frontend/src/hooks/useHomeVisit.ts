import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { speakConversationLanguageCode } from '@/lib/languages'
import { readTodayProgressState } from '@/lib/todayProgress'
import { isLemmaDueNow, type LemmaState, type UseWordStatesResult } from '@/hooks/useWordStates'
import type { TodayMission } from '@/hooks/useTodayMission'

// useHomeVisit — the First Light visit record and dawn (§4 of the spec).
//
// A visit is composed once per lifecycle key [userId, activeLanguage, utcDate]
// and is immutable afterwards, with one exception: a mission that resolves
// after composition recomposes the visit once if nothing has progressed, and
// may only ADD a segment otherwise. All progress here is in-memory and honest:
// `graded` counts completed retrieval attempts (successes and reveals alike),
// increments only after the recall_attempts insert resolved OK, and stops at
// `proposed`. A reload starts a fresh visit — the SRS row is the durable
// record.
//
// One due quantity: everything on this page (segments, hero gating, buoys,
// `proposed`, backlog count, copy) derives from `selectDuePool`. The counts
// object of useWordStates is never used here — `totalDue` excludes newDue and
// would zero out the most common fresh-deck learner.

export type HomeVisitSegments = {
  lesson?: { pathId: string; lessonId: string }
  recall?: { proposed: number }
  speak?: Record<string, never>
}

export type HomeVisit = {
  key: string
  segments: HomeVisitSegments
  proposed: number
  graded: number
  lessonDone: boolean
  speakDone: boolean
  lapsed: boolean
  startedAt: string
}

export type HomeTierKey = 'night' | 'firstLight' | 'almostMorning' | 'fullDawn'

export const HOME_RECALL_SET_SIZE = 5
export const HOME_LAPSED_SET_SIZE = 3
export const HOME_LAPSE_DAYS = 7
export const HOME_DAWN_FLOOR = 0.15
// Focus wake-ups re-query Supabase at most this often (§11).
const FOCUS_REFRESH_MIN_MS = 30_000

export function utcDateOf(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10)
}

export function utcDayStartIsoOf(nowMs: number): string {
  return `${utcDateOf(nowMs)}T00:00:00.000Z`
}

export function homeVisitKey(userId: string, language: string, utcDate: string): string {
  return `${userId}|${language}|${utcDate}`
}

/** THE due pool (§4): due-now lemmas with at least one word id, minus the
 * lemmas already cleared by a successful grade this visit, sorted by
 * nextDueAt ascending (null first — longest-waiting), tie-broken by lemmaKey
 * for stability. Single source for segments, hero, buoys, backlog, and copy. */
export function selectDuePool(data: LemmaState[], clearedKeys?: ReadonlySet<string>): LemmaState[] {
  return data
    .filter((lemma) => isLemmaDueNow(lemma) && lemma.wordIds.length > 0 && !(clearedKeys?.has(lemma.lemmaKey)))
    .sort((a, b) => {
      const an = a.nextDueAt ?? ''
      const bn = b.nextDueAt ?? ''
      if (an !== bn) return an < bn ? -1 : 1
      return a.lemmaKey < b.lemmaKey ? -1 : 1
    })
}

/** Lapse predicate (§5): the learner HAS attempted this language before, and
 * their latest attempt is older than 7 days. All-null lastAttemptAt is a fresh
 * learner, not a lapsed one — the predicate selects absence of RECENT
 * attempts, not absence of attempts. */
export function isLapsedLanguage(data: LemmaState[], nowMs: number): boolean {
  let latest: string | null = null
  for (const lemma of data) {
    if (lemma.lastAttemptAt && (!latest || lemma.lastAttemptAt > latest)) latest = lemma.lastAttemptAt
  }
  if (!latest) return false
  return Date.parse(latest) < nowMs - HOME_LAPSE_DAYS * 24 * 60 * 60 * 1000
}

export function composeHomeVisit(input: {
  key: string
  duePool: LemmaState[]
  lapsed: boolean
  mission: TodayMission | null
  isSpeakLanguage: boolean
  lessonDone: boolean
  nowIso: string
}): HomeVisit {
  const { key, duePool, lapsed, mission, isSpeakLanguage, lessonDone, nowIso } = input
  const segments: HomeVisitSegments = {}
  if (mission && !mission.isPathComplete) {
    segments.lesson = { pathId: mission.pathId, lessonId: mission.lessonId }
  }
  const proposed = Math.min(lapsed ? HOME_LAPSED_SET_SIZE : HOME_RECALL_SET_SIZE, duePool.length)
  if (proposed > 0) segments.recall = { proposed }
  if (isSpeakLanguage) segments.speak = {}
  return {
    key,
    segments,
    proposed,
    graded: 0,
    lessonDone,
    speakDone: false,
    lapsed,
    startedAt: nowIso,
  }
}

/** Dawn (§4) — a total function of the visit; recall-driven, never a countable
 * meter. Recall alone reaches full dawn; lesson/speak are surplus warmth under
 * the cap. The monotonic clamp lives in the hook, not here. */
export function dawnForVisit(visit: HomeVisit | null): number {
  if (!visit) return HOME_DAWN_FLOOR
  const { segments, proposed, graded, lessonDone, speakDone } = visit
  if (segments.recall) {
    const part = graded / Math.max(1, proposed) + 0.1 * (lessonDone ? 1 : 0) + 0.1 * (speakDone ? 1 : 0)
    return HOME_DAWN_FLOOR + 0.85 * Math.min(1, part)
  }
  const composed = (segments.lesson ? 1 : 0) + (segments.speak ? 1 : 0)
  if (composed > 0) {
    const done = (segments.lesson && lessonDone ? 1 : 0) + (segments.speak && speakDone ? 1 : 0)
    return HOME_DAWN_FLOOR + 0.85 * (done / composed)
  }
  return HOME_DAWN_FLOOR
}

/** Text twin of the dawn (§4): the state line always names the same quantity
 * the sky shows. */
export function homeTierKey(dawn: number): HomeTierKey {
  if (dawn < 0.2) return 'night'
  if (dawn < 0.55) return 'firstLight'
  if (dawn < 0.9) return 'almostMorning'
  return 'fullDawn'
}

/** The visit the dawn should render (§4, Codex delta 9): when a focus refetch
 * empties the pool below `proposed`, the pool-empty arm completes the recall
 * segment — dawn, state line, and strip must all tell that same story, so the
 * dawn term treats the set as cleared. */
export function visitForDawn(visit: HomeVisit | null, poolEmpty: boolean): HomeVisit | null {
  if (!visit || !poolEmpty || !visit.segments.recall || visit.graded >= visit.proposed) return visit
  return { ...visit, graded: visit.proposed }
}

/** Timestamp-scoped lesson completion (§4): completed TODAY (UTC), not ever. */
export function observeLessonDone(
  segments: HomeVisitSegments,
  userId: string | undefined,
  utcDayStartIso: string,
): boolean {
  if (!segments.lesson) return false
  const progress = readTodayProgressState(userId)
  const completedAt = progress.courses[segments.lesson.pathId]?.lessons?.[segments.lesson.lessonId]?.completedAt
  return typeof completedAt === 'string' && completedAt >= utcDayStartIso
}

type UseHomeVisitArgs = {
  userId: string | null
  /** Canonical active language value ('German'), or null before pinning. */
  language: string | null
  wordStates: UseWordStatesResult
  mission: TodayMission | null
  missionLoading: boolean
}

export type UseHomeVisitResult = {
  visit: HomeVisit | null
  duePool: LemmaState[]
  /** Lemmas cleared by a successful grade this visit (misses stay in the pool
   * and drift back — the buoy layer owns their cooldown). */
  clearedKeys: ReadonlySet<string>
  dawn: number
  tierKey: HomeTierKey
  /** Call after a recall_attempts insert resolves OK — never before. */
  recordGraded: (lemmaKey: string, knewIt: boolean) => void
}

export function useHomeVisit({ userId, language, wordStates, mission, missionLoading }: UseHomeVisitArgs): UseHomeVisitResult {
  // The UTC date is STATE, updated only by wake-up detection (focus /
  // visibilitychange / remount) — no midnight timer. Between the real boundary
  // and detection the old visit keeps running untouched (§4).
  const [utcDate, setUtcDate] = useState(() => utcDateOf(Date.now()))
  const key = userId && language ? homeVisitKey(userId, language, utcDate) : null

  const [visit, setVisit] = useState<HomeVisit | null>(null)
  const [clearedKeys, setClearedKeys] = useState<Set<string>>(new Set())
  const [maxDawn, setMaxDawn] = useState(HOME_DAWN_FLOOR)
  const recomposedOnceRef = useRef(false)
  const lastFocusRefreshRef = useRef(0)
  // Live key for in-flight callbacks: a grade that resolves after a language
  // switch or detected rollover must not leak into the new visit (§4).
  const liveKeyRef = useRef<string | null>(null)
  useEffect(() => {
    liveKeyRef.current = key
  }, [key])

  const speakCode = speakConversationLanguageCode(language)
  const utcDayStartIso = `${utcDate}T00:00:00.000Z`

  const duePool = useMemo(
    () => selectDuePool(wordStates.data, clearedKeys),
    [wordStates.data, clearedKeys],
  )

  // Reset visit-scoped state the moment the key changes (language switch or
  // detected rollover). In-flight callbacks for the old key are closure-guarded
  // below and cannot touch the new visit.
  useEffect(() => {
    setVisit(null)
    setClearedKeys(new Set())
    setMaxDawn(HOME_DAWN_FLOOR)
    recomposedOnceRef.current = false
  }, [key])

  // Compose once per key, when the word states have genuinely landed (§4).
  // An RPC failure must never read as "nothing is due" — no visit under error.
  const canCompose = Boolean(key) && wordStates.fetched && !wordStates.error
  useEffect(() => {
    if (!canCompose || !key) return
    setVisit((prev) => {
      if (prev?.key === key) return prev
      const composed = composeHomeVisit({
        key,
        duePool: selectDuePool(wordStates.data),
        lapsed: isLapsedLanguage(wordStates.data, Date.now()),
        mission: missionLoading ? null : mission,
        isSpeakLanguage: speakCode !== null,
        lessonDone: false,
        nowIso: new Date().toISOString(),
      })
      composed.lessonDone = observeLessonDone(composed.segments, userId ?? undefined, utcDayStartIso)
      return composed
    })
    // wordStates.data is intentionally read at compose time only — the visit is
    // immutable once composed; later data changes flow through duePool.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCompose, key])

  // Late mission resolution (§4): nothing progressed → recompose once;
  // otherwise only add the lesson segment. The sky can never darken — dawn is
  // clamped to its running max below.
  useEffect(() => {
    if (!key || !visit || visit.key !== key) return
    if (missionLoading || !mission || mission.isPathComplete || visit.segments.lesson) return
    const progressed = visit.graded > 0 || visit.lessonDone || visit.speakDone
    if (!progressed && !recomposedOnceRef.current) {
      recomposedOnceRef.current = true
      const composed = composeHomeVisit({
        key,
        duePool: selectDuePool(wordStates.data, clearedKeys),
        lapsed: visit.lapsed,
        mission,
        isSpeakLanguage: speakCode !== null,
        lessonDone: false,
        nowIso: visit.startedAt,
      })
      composed.lessonDone = observeLessonDone(composed.segments, userId ?? undefined, utcDayStartIso)
      setVisit(composed)
      return
    }
    setVisit((prev) => {
      if (!prev || prev.key !== key || prev.segments.lesson) return prev
      const segments = { ...prev.segments, lesson: { pathId: mission.pathId, lessonId: mission.lessonId } }
      return {
        ...prev,
        segments,
        lessonDone: observeLessonDone(segments, userId ?? undefined, utcDayStartIso),
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mission, missionLoading, visit])

  // Spoke-today observation (§4): one existence probe — a real exchange
  // (message_count >= 2) in this language since the UTC day start. ended_at is
  // deliberately not required: it is only written by a fire-and-forget update
  // and never on tab-close, so requiring it under-reports. Never over-credits.
  const speakCheckEpochRef = useRef(0)
  const runSpeakCheck = useCallback(() => {
    if (!userId || !speakCode || !key) return
    const epoch = ++speakCheckEpochRef.current
    const guardKey = key
    void supabase
      .from('speak_conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('language', speakCode)
      .gte('started_at', utcDayStartIso)
      .gte('message_count', 2)
      .limit(1)
      .then(({ data, error }) => {
        if (error || epoch !== speakCheckEpochRef.current) return
        if ((data?.length ?? 0) === 0) return
        setVisit((prev) => (prev && prev.key === guardKey && !prev.speakDone ? { ...prev, speakDone: true } : prev))
      })
  }, [key, speakCode, userId, utcDayStartIso])

  useEffect(() => {
    if (!visit || visit.key !== key || !visit.segments.speak || visit.speakDone) return
    runSpeakCheck()
    // Run once per composed visit; focus re-checks are handled by the wake
    // handler below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit?.key])

  // Wake-up handler: rollover detection, lesson re-observation (synchronous
  // localStorage read — free), and the debounced refetch + speak re-check.
  useEffect(() => {
    const onWake = () => {
      if (document.hidden) return
      const nowMs = Date.now()
      const today = utcDateOf(nowMs)
      if (today !== utcDate) {
        setUtcDate(today) // key change → reset + recompose
        return
      }
      setVisit((prev) => {
        if (!prev || prev.key !== key || !prev.segments.lesson || prev.lessonDone) return prev
        const done = observeLessonDone(prev.segments, userId ?? undefined, utcDayStartIso)
        return done ? { ...prev, lessonDone: true } : prev
      })
      if (nowMs - lastFocusRefreshRef.current >= FOCUS_REFRESH_MIN_MS) {
        lastFocusRefreshRef.current = nowMs
        wordStates.refetch()
        runSpeakCheck()
      }
    }
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)
    return () => {
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
    // Depend on the stable refetch, not the per-render wordStates object —
    // resubscribing two listeners every render is churn for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, runSpeakCheck, userId, utcDate, utcDayStartIso, wordStates.refetch])

  // Honest counting (§4): called by the page only after the insert resolved
  // OK. Attempts beyond the proposed set still wrote to recall_attempts — they
  // just don't move visit numbers (no "6 of 5"). Closure-guarded by key: a
  // slow insert that lands after a key change touches neither the new visit
  // nor its cleared set (the attempt itself is durable in recall_attempts).
  const recordGraded = useCallback((lemmaKey: string, knewIt: boolean) => {
    const guardKey = key
    if (liveKeyRef.current !== guardKey) return
    setVisit((prev) => {
      if (!prev || prev.key !== guardKey) return prev
      if (prev.graded >= prev.proposed) return prev
      return { ...prev, graded: prev.graded + 1 }
    })
    if (knewIt) {
      setClearedKeys((prev) => {
        const next = new Set(prev)
        next.add(lemmaKey)
        return next
      })
    }
  }, [key])

  // Dawn: the pool-empty arm completes the recall segment (§4/Codex delta 9)
  // — but ONLY when the empty pool is trusted: on RPC failure useWordStates
  // clears data, and a network blip must never light full dawn (§5/Opus 12).
  // The sky stays monotonic non-decreasing within a visit — a late
  // recomposition can never darken it.
  const currentVisit = visit && visit.key === key ? visit : null
  const trustedPoolEmpty = duePool.length === 0 && wordStates.error === null
  const rawDawn = dawnForVisit(visitForDawn(currentVisit, trustedPoolEmpty))
  const dawn = Math.max(maxDawn, rawDawn)
  useEffect(() => {
    if (rawDawn > maxDawn) {
       
      setMaxDawn(rawDawn)
    }
  }, [maxDawn, rawDawn])

  return {
    visit: currentVisit,
    duePool,
    clearedKeys,
    dawn,
    tierKey: homeTierKey(dawn),
    recordGraded,
  }
}
