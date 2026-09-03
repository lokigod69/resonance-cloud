// Unit tests for the First Light home model (spec §14 step 3):
// resolver totality, the dawn function, duePool single-sourcing, and the
// visit-composition rules.
// Run: node scripts/run-home-first-light-test.mjs
// (the runner bundles via esbuild so transitive import.meta.env reads resolve)

import assert from 'node:assert/strict'
import type { HomeVisit } from '../src/hooks/useHomeVisit'

type LemmaLike = {
  lemmaKey: string
  displayWord: string
  translation: string
  wordIds: string[]
  deckIds: string[]
  state: 'new' | 'learning' | 'reviewing' | 'mastered'
  due: boolean
  nextDueAt: string | null
  consecutiveCorrect: number
  totalAttempts: number
  lastAttemptAt: string | null
  lastKnewIt: boolean | null
}

function lemma(partial: Partial<LemmaLike> & { lemmaKey: string }): LemmaLike {
  return {
    displayWord: partial.lemmaKey,
    translation: 'x',
    wordIds: ['w-' + partial.lemmaKey],
    deckIds: ['d1'],
    state: 'reviewing',
    due: true,
    nextDueAt: null,
    consecutiveCorrect: 0,
    totalAttempts: 1,
    lastAttemptAt: null,
    lastKnewIt: null,
    ...partial,
  }
}

const NOW = Date.parse('2026-07-24T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

let passed = 0
let failed = 0
function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
  } catch (error) {
    failed++
    console.error(`FAIL ${name}`)
    console.error(error instanceof Error ? `  ${error.message}` : error)
  }
}

async function main() {
  const visitModule = await import('../src/hooks/useHomeVisit')
  const recModule = await import('../src/hooks/useHomeRecommendation')
  const {
    selectDuePool,
    isLapsedLanguage,
    composeHomeVisit,
    dawnForVisit,
    visitForDawn,
    homeTierKey,
    homeVisitKey,
    HOME_DAWN_FLOOR,
  } = visitModule
  const { resolveHomeHero } = recModule

  const mission = {
    pathId: 'de-p4',
    pathShortTitle: 'At the market',
    targetLanguage: 'German',
    vibeId: 'bright',
    lessonId: 'de-p4-l4',
    lessonNumber: 4,
    totalLessons: 10,
    completedCount: 3,
    lessonStatuses: [],
    lessonTitle: 'x',
    phrase: 'x',
    phraseLang: 'de',
    estimatedMinutes: 6,
    isPathComplete: false,
    checkpointPending: false,
    startHref: '/today?x',
    pathHref: '/today?x',
    checkpointHref: '/today/checkpoint?x',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  // ── duePool single-sourcing ────────────────────────────────────────────────

  check('duePool: due new words count (the Opus-3 fresh-deck regression)', () => {
    const data = Array.from({ length: 20 }, (_, i) => lemma({ lemmaKey: `n${i}`, state: 'new', due: true }))
    assert.equal(selectDuePool(data).length, 20)
  })

  check('duePool: learning lemmas are always due; non-due reviewing excluded', () => {
    const data = [
      lemma({ lemmaKey: 'a', state: 'learning', due: false }),
      lemma({ lemmaKey: 'b', state: 'reviewing', due: false }),
      lemma({ lemmaKey: 'c', state: 'mastered', due: true }),
    ]
    assert.deepEqual(selectDuePool(data).map((l) => l.lemmaKey), ['a', 'c'])
  })

  check('duePool: empty wordIds fall out exactly like zero-due (Opus 24)', () => {
    const data = [lemma({ lemmaKey: 'a', wordIds: [] }), lemma({ lemmaKey: 'b' })]
    assert.deepEqual(selectDuePool(data).map((l) => l.lemmaKey), ['b'])
  })

  check('duePool: cleared keys leave the pool; sort is nextDueAt asc, nulls first, stable', () => {
    const data = [
      lemma({ lemmaKey: 'late', nextDueAt: '2026-07-24T10:00:00Z' }),
      lemma({ lemmaKey: 'early', nextDueAt: '2026-07-20T10:00:00Z' }),
      lemma({ lemmaKey: 'b-null', nextDueAt: null }),
      lemma({ lemmaKey: 'a-null', nextDueAt: null }),
      lemma({ lemmaKey: 'cleared', nextDueAt: '2026-07-01T10:00:00Z' }),
    ]
    const pool = selectDuePool(data, new Set(['cleared']))
    assert.deepEqual(pool.map((l) => l.lemmaKey), ['a-null', 'b-null', 'early', 'late'])
  })

  // ── lapse predicate (Codex delta 11) ──────────────────────────────────────

  check('lapse: never-attempted language is fresh, not lapsed', () => {
    assert.equal(isLapsedLanguage([lemma({ lemmaKey: 'a' })], NOW), false)
  })

  check('lapse: latest attempt wins — one recent attempt cancels older ones', () => {
    const data = [
      lemma({ lemmaKey: 'a', lastAttemptAt: new Date(NOW - 30 * DAY).toISOString() }),
      lemma({ lemmaKey: 'b', lastAttemptAt: new Date(NOW - 2 * DAY).toISOString() }),
    ]
    assert.equal(isLapsedLanguage(data, NOW), false)
  })

  check('lapse: latest attempt older than 7 days lapses', () => {
    const data = [lemma({ lemmaKey: 'a', lastAttemptAt: new Date(NOW - 8 * DAY).toISOString() })]
    assert.equal(isLapsedLanguage(data, NOW), true)
  })

  // ── visit composition ─────────────────────────────────────────────────────

  const key = homeVisitKey('u1', 'German', '2026-07-24')

  check('compose: proposed = min(5, pool); recall+lesson+speak segments', () => {
    const pool = selectDuePool(Array.from({ length: 9 }, (_, i) => lemma({ lemmaKey: `l${i}` })))
    const visit = composeHomeVisit({
      key, duePool: pool, lapsed: false, mission, isSpeakLanguage: true, lessonDone: false, nowIso: 'now',
    })
    assert.equal(visit.proposed, 5)
    assert.deepEqual(visit.segments.recall, { proposed: 5 })
    assert.deepEqual(visit.segments.lesson, { pathId: 'de-p4', lessonId: 'de-p4-l4' })
    assert.ok(visit.segments.speak)
  })

  check('compose: lapsed caps proposed at 3 (binding lapse ruling)', () => {
    const pool = selectDuePool(Array.from({ length: 9 }, (_, i) => lemma({ lemmaKey: `l${i}` })))
    const visit = composeHomeVisit({
      key, duePool: pool, lapsed: true, mission: null, isSpeakLanguage: false, lessonDone: false, nowIso: 'now',
    })
    assert.equal(visit.proposed, 3)
  })

  check('compose: complete path composes no lesson segment; empty pool no recall', () => {
    const done = { ...mission, isPathComplete: true }
    const visit = composeHomeVisit({
      key, duePool: [], lapsed: false, mission: done, isSpeakLanguage: false, lessonDone: false, nowIso: 'now',
    })
    assert.equal(visit.segments.lesson, undefined)
    assert.equal(visit.segments.recall, undefined)
    assert.equal(visit.proposed, 0)
  })

  check('lifecycle: key changes with user, language, and utc date', () => {
    assert.notEqual(homeVisitKey('u1', 'German', '2026-07-24'), homeVisitKey('u1', 'German', '2026-07-25'))
    assert.notEqual(homeVisitKey('u1', 'German', '2026-07-24'), homeVisitKey('u1', 'Korean', '2026-07-24'))
    assert.notEqual(homeVisitKey('u1', 'German', '2026-07-24'), homeVisitKey('u2', 'German', '2026-07-24'))
  })

  // ── dawn (total function; §4, corrected per Opus delta 1) ─────────────────

  const baseVisit = (over: Partial<HomeVisit>): HomeVisit => ({
    key,
    segments: { recall: { proposed: 5 } },
    proposed: 5,
    graded: 0,
    lessonDone: false,
    speakDone: false,
    lapsed: false,
    startedAt: 'now',
    ...over,
  })

  check('dawn: null visit sits at the floor', () => {
    assert.equal(dawnForVisit(null), HOME_DAWN_FLOOR)
  })

  check('dawn: recall alone reaches full dawn — no Speak gate', () => {
    assert.equal(dawnForVisit(baseVisit({ graded: 5 })), 1)
  })

  check('dawn: lesson/speak are surplus warmth under the cap', () => {
    const partial = dawnForVisit(baseVisit({ graded: 3, lessonDone: true, speakDone: true }))
    assert.ok(Math.abs(partial - (0.15 + 0.85 * 0.8)) < 1e-9)
    assert.equal(dawnForVisit(baseVisit({ graded: 5, lessonDone: true, speakDone: true })), 1)
  })

  check('dawn: no-recall days meter composed segments only', () => {
    const v = baseVisit({ segments: { lesson: { pathId: 'p', lessonId: 'l' }, speak: {} }, proposed: 0 })
    assert.equal(dawnForVisit(v), HOME_DAWN_FLOOR)
    assert.ok(Math.abs(dawnForVisit({ ...v, lessonDone: true }) - (0.15 + 0.85 * 0.5)) < 1e-9)
    assert.equal(dawnForVisit({ ...v, lessonDone: true, speakDone: true }), 1)
  })

  check('dawn: no segments at all stays at the floor (total function)', () => {
    assert.equal(dawnForVisit(baseVisit({ segments: {}, proposed: 0 })), HOME_DAWN_FLOOR)
  })

  check('dawn: zero-proposed recall segment cannot divide by zero', () => {
    const v = baseVisit({ segments: { recall: { proposed: 0 } }, proposed: 0, graded: 0 })
    assert.ok(Number.isFinite(dawnForVisit(v)))
  })

  check('dawn: pool-empty arm completes the recall segment (Codex delta 9)', () => {
    const partial = baseVisit({ graded: 1 })
    assert.equal(dawnForVisit(visitForDawn(partial, true)), 1)
    // Pool not empty → the honest partial dawn stands.
    assert.ok(dawnForVisit(visitForDawn(partial, false)) < 0.5)
    // No recall segment → substitution never invents one.
    const noRecall = baseVisit({ segments: {}, proposed: 0 })
    assert.equal(dawnForVisit(visitForDawn(noRecall, true)), HOME_DAWN_FLOOR)
    assert.equal(visitForDawn(null, true), null)
  })

  check('tier thresholds: <0.2 night · <0.55 first light · <0.9 almost morning · ≥0.9 full dawn', () => {
    assert.equal(homeTierKey(0.15), 'night')
    assert.equal(homeTierKey(0.2), 'firstLight')
    assert.equal(homeTierKey(0.54), 'firstLight')
    assert.equal(homeTierKey(0.55), 'almostMorning')
    assert.equal(homeTierKey(0.89), 'almostMorning')
    assert.equal(homeTierKey(0.9), 'fullDawn')
    assert.equal(homeTierKey(1), 'fullDawn')
  })

  // ── hero resolver totality (§5, §8.1) ─────────────────────────────────────

  const heroBase = {
    fetched: true,
    hasError: false,
    hasDecks: true,
    wordCount: 10,
    duePoolCount: 3,
    mission: null,
    missionPending: false,
    lessonDoneToday: false,
    streamLive: false,
    isSpeakLanguage: true,
    deckHref: '/deck/d1',
  }

  check('hero: totality — every input combination yields a hero', () => {
    const kinds = new Set<string>()
    for (const fetched of [true, false])
      for (const hasError of [true, false])
        for (const hasDecks of [true, false])
          for (const wordCount of [0, 10])
            for (const duePoolCount of [0, 3])
              for (const m of [null, mission, { ...mission, isPathComplete: true }])
                for (const missionPending of [true, false])
                  for (const lessonDoneToday of [true, false])
                    for (const streamLive of [true, false])
                      for (const isSpeakLanguage of [true, false]) {
                        const hero = resolveHomeHero({
                          fetched, hasError, hasDecks, wordCount, duePoolCount,
                          mission: m, missionPending, lessonDoneToday, streamLive, isSpeakLanguage,
                          deckHref: '/deck/d1',
                        })
                        assert.ok(hero && typeof hero.kind === 'string', 'resolver returned nothing')
                        kinds.add(hero.kind)
                      }
    for (const expected of ['skeleton', 'unavailable', 'preparing', 'lesson', 'recall', 'stream', 'speak', 'discover']) {
      assert.ok(kinds.has(expected), `kind ${expected} unreachable`)
    }
  })

  check('hero: the stream outranks speak/discover only when nothing is owed', () => {
    assert.equal(resolveHomeHero({ ...heroBase, streamLive: true, mission }).kind, 'lesson')
    assert.equal(resolveHomeHero({ ...heroBase, streamLive: true }).kind, 'recall')
    assert.equal(resolveHomeHero({ ...heroBase, streamLive: true, duePoolCount: 0 }).kind, 'stream')
    assert.equal(resolveHomeHero({ ...heroBase, streamLive: true, duePoolCount: 0, isSpeakLanguage: false }).kind, 'stream')
    assert.equal(resolveHomeHero({ ...heroBase, streamLive: true, duePoolCount: 0, hasError: true }).kind, 'unavailable')
    assert.equal(resolveHomeHero({ ...heroBase, streamLive: true, duePoolCount: 0, wordCount: 0 }).kind, 'preparing')
  })

  check('hero: an RPC failure is unavailable, never "nothing is due" (Opus 12)', () => {
    const hero = resolveHomeHero({ ...heroBase, hasError: true, duePoolCount: 0 })
    assert.equal(hero.kind, 'unavailable')
  })

  check('hero: decks with zero complete words are preparing, with the deck link', () => {
    const hero = resolveHomeHero({ ...heroBase, wordCount: 0, duePoolCount: 0 })
    assert.deepEqual(hero, { kind: 'preparing', href: '/deck/d1' })
  })

  check('hero: priority lesson → recall → speak → discover', () => {
    assert.equal(resolveHomeHero({ ...heroBase, mission }).kind, 'lesson')
    assert.equal(resolveHomeHero({ ...heroBase }).kind, 'recall')
    assert.equal(resolveHomeHero({ ...heroBase, duePoolCount: 0 }).kind, 'speak')
    assert.equal(resolveHomeHero({ ...heroBase, duePoolCount: 0, isSpeakLanguage: false }).kind, 'discover')
  })

  check('hero: lesson already done today falls through to recall', () => {
    const hero = resolveHomeHero({ ...heroBase, mission, lessonDoneToday: true })
    assert.equal(hero.kind, 'recall')
  })

  check('hero: complete path never heroes', () => {
    const hero = resolveHomeHero({ ...heroBase, mission: { ...mission, isPathComplete: true } })
    assert.equal(hero.kind, 'recall')
  })

  check('hero: mission pending holds the skeleton; timeout falls through to recall', () => {
    assert.equal(resolveHomeHero({ ...heroBase, missionPending: true }).kind, 'skeleton')
    assert.equal(resolveHomeHero({ ...heroBase, missionPending: false }).kind, 'recall')
  })

  check('hero: new-due-only deck heroes recall (fresh-deck regression)', () => {
    const hero = resolveHomeHero({ ...heroBase, duePoolCount: 20, mission: null })
    assert.deepEqual(hero, { kind: 'recall', count: 20 })
  })

  console.log(`\nhome-first-light: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
