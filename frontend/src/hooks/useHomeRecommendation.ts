import { useEffect, useState } from 'react'
import type { TodayMission } from '@/hooks/useTodayMission'
import type { UseWordStatesResult } from '@/hooks/useWordStates'
import type { HomeVisit } from '@/hooks/useHomeVisit'

// useHomeRecommendation — the First Light hero resolver (§5 of the spec).
//
// Total by construction: every input state maps to a hero — loading to a
// fixed-height skeleton, an RPC failure to an honest `unavailable` card with
// Retry (never to "nothing is due"), decks-without-complete-words to
// `preparing`. Priority for real heroes: lesson → recall → speak → discover.
//
// The hero COMMITS once per visit: the first real resolution wins, and a
// mission that resolves later goes to the strip/clause, never a hero swap —
// no content jumping. `skeleton`/`unavailable` are transient states, not
// commitments; recovering from a failure may still land any hero.
//
// Recall-first timeout: the guided module (~2.8MB, lazy) may take a while on
// cold cache. When due words exist and the mission hasn't resolved within
// 800ms, the recall hero commits and the lesson surfaces in the strip later.

export const HERO_MISSION_TIMEOUT_MS = 800

export type HomeHero =
  | { kind: 'skeleton' }
  | { kind: 'unavailable' }
  | { kind: 'preparing'; href: string }
  | { kind: 'lesson'; mission: TodayMission }
  | { kind: 'recall'; count: number }
  | { kind: 'stream' }
  | { kind: 'speak' }
  | { kind: 'discover' }

export type ResolveHomeHeroInput = {
  fetched: boolean
  hasError: boolean
  /** Deck(s) exist in the active language (generation may still be running). */
  hasDecks: boolean
  /** wordStates.data.length — zero with decks present means words are forming. */
  wordCount: number
  duePoolCount: number
  mission: TodayMission | null
  /** Mission still genuinely undecided: loading, and either nothing is due
   * (no substitute — wait it out) or the 800ms recall-first timer hasn't
   * fired yet. */
  missionPending: boolean
  /** The mission's lesson segment was already completed today (UTC). */
  lessonDoneToday: boolean
  /** The Word Stream has words on the water (docs/Product/FABLE_WORD_STREAM_PLAN.md). */
  streamLive: boolean
  isSpeakLanguage: boolean
  /** Target for the `preparing` hero's deck link. */
  deckHref: string
}

/** Pure, total resolver — unit-tested for totality. Returns `skeleton` only
 * while a decision genuinely cannot be made yet. */
export function resolveHomeHero(input: ResolveHomeHeroInput): HomeHero {
  const { fetched, hasError, hasDecks, wordCount, duePoolCount, mission, missionPending, lessonDoneToday, streamLive, isSpeakLanguage, deckHref } = input
  if (!fetched) return { kind: 'skeleton' }
  if (hasError) return { kind: 'unavailable' }
  if (hasDecks && wordCount === 0) return { kind: 'preparing', href: deckHref }
  if (mission && !mission.isPathComplete && !lessonDoneToday) return { kind: 'lesson', mission }
  if (missionPending) {
    // The lesson still outranks recall if it lands in time; with no due words
    // there is nothing to fall back to, so keep the skeleton until it settles.
    return { kind: 'skeleton' }
  }
  if (duePoolCount > 0) return { kind: 'recall', count: duePoolCount }
  // Nothing owed: the sea already carries new words, and catching one is the
  // most immediate thing to do — Speak follows (owner call 2026-09-04).
  if (streamLive) return { kind: 'stream' }
  if (isSpeakLanguage) return { kind: 'speak' }
  return { kind: 'discover' }
}

type UseHomeRecommendationArgs = {
  wordStates: UseWordStatesResult
  visit: HomeVisit | null
  /** Visit lifecycle key — commit-once is scoped to it. */
  visitKey: string | null
  duePoolCount: number
  hasDecks: boolean
  mission: TodayMission | null
  missionLoading: boolean
  /** The Word Stream has words on the water. Lands asynchronously (lazy
   * library), so it may UPGRADE a committed speak/discover hero — both are
   * "nothing owed" heroes, and swapping between them moves no workload. */
  streamLive: boolean
  isSpeakLanguage: boolean
  deckHref: string
}

export function useHomeRecommendation({
  wordStates,
  visit,
  visitKey,
  duePoolCount,
  hasDecks,
  mission,
  missionLoading,
  streamLive,
  isSpeakLanguage,
  deckHref,
}: UseHomeRecommendationArgs): HomeHero {
  const [committed, setCommitted] = useState<{ key: string; hero: HomeHero } | null>(null)
  const [missionTimedOut, setMissionTimedOut] = useState(false)

  // Recall-first timer: starts once words are fetched while the mission is
  // still loading; firing lets `resolveHomeHero` fall through to recall.
  useEffect(() => {
    if (!missionLoading) return
    if (missionTimedOut) return
    const timer = window.setTimeout(() => setMissionTimedOut(true), HERO_MISSION_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [missionLoading, missionTimedOut])

  useEffect(() => {
    setMissionTimedOut(false)
  }, [visitKey])

  // The visit carries the observed lessonDone — never commit a hero before it
  // exists, or a lesson already completed today could win the card. Under an
  // RPC error the visit stays null by design; `unavailable` handles that arm.
  // The same race exists when the mission lands AFTER composition: for one or
  // two renders the visit has no lesson segment and lessonDone is unobserved —
  // hold the skeleton until the late-mission arm folds it in (the arm always
  // adds the segment for an incomplete path, so this cannot deadlock).
  const missionAwaitingVisit =
    !missionLoading && mission !== null && !mission.isPathComplete
    && visit !== null && !visit.segments.lesson
  const resolved = wordStates.fetched && wordStates.error === null && (!visit || missionAwaitingVisit)
    ? ({ kind: 'skeleton' } as const)
    : resolveHomeHero({
        fetched: wordStates.fetched,
        hasError: wordStates.error !== null,
        hasDecks,
        wordCount: wordStates.data.length,
        duePoolCount,
        mission: missionLoading ? null : mission,
        // The recall-first timeout only exists because recall can substitute;
        // with nothing due there is no substitute — wait the mission out.
        missionPending: missionLoading && (duePoolCount === 0 || !missionTimedOut),
        lessonDoneToday: visit?.lessonDone ?? false,
        streamLive,
        isSpeakLanguage,
        deckHref,
      })

  // Commit-once per visit key. Transient states (skeleton/unavailable) never
  // commit and never overwrite a commitment; the first real hero survives all
  // later resolutions — with one upgrade: `stream` may replace a committed
  // speak/discover (the library lands after those resolve; all three are
  // "nothing owed" heroes, so the swap moves no workload). The effect fires
  // the render after the first real resolution — the same value renders
  // uncommitted for that one frame, so nothing visibly changes.
  const commitKind = resolved.kind !== 'skeleton' && resolved.kind !== 'unavailable'
  const resolvedKind = resolved.kind
  useEffect(() => {
    if (!visitKey || !commitKind) return
    setCommitted((prev) => {
      if (prev?.key !== visitKey) return { key: visitKey, hero: resolved }
      const upgradable = prev.hero.kind === 'speak' || prev.hero.kind === 'discover'
      return resolvedKind === 'stream' && upgradable ? { key: visitKey, hero: resolved } : prev
    })
    // `resolved` is rebuilt per render; the prev-guard makes this idempotent
    // and only the first real hero per key (plus the stream upgrade) is stored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitKey, commitKind, resolvedKind])

  // `unavailable` is a failure surface, not content — it may displace even a
  // committed hero, or a mid-visit RPC failure could never offer Retry.
  if (resolved.kind === 'unavailable') return resolved
  if (visitKey && committed?.key === visitKey) return committed.hero
  return resolved
}
