import type { LaneIndex, SessionConfig, SurfCard, SurfDeck, WaveCardSpec, WaveSpec } from './types'
import type { createRng } from './random'

export function normalizeTerm(term: string): string {
  return term.normalize('NFC').trim().toLowerCase()
}

export type WaveSequencer = {
  nextWave(index: number, level: number): WaveSpec
}

/**
 * Builds deterministic waves while retaining only sequencing state: target
 * permutation cycles, recent-card preference, and correct-lane streaks.
 */
export function createWaveSequencer(
  deck: SurfDeck,
  config: SessionConfig,
  rng: ReturnType<typeof createRng>,
): WaveSequencer {
  let targetCycle: SurfCard[] = []
  let targetCursor = 0
  let lastTargetTerm: string | null = null
  let previousWaveTerms = new Set<string>()
  let previousCorrectLane: LaneIndex | null = null
  let correctLaneStreak = 0

  const uniqueTargetTerms = new Set(deck.cards.map((card) => normalizeTerm(card.term))).size

  function refillTargetCycle(): void {
    targetCycle = rng.shuffle(deck.cards)
    targetCursor = 0

    if (lastTargetTerm === null || uniqueTargetTerms <= 1) return

    const replacementIndex = targetCycle.findIndex(
      (card) => normalizeTerm(card.term) !== lastTargetTerm,
    )
    if (replacementIndex > 0) {
      const first = targetCycle[0]
      targetCycle[0] = targetCycle[replacementIndex]
      targetCycle[replacementIndex] = first
    }
  }

  function nextTarget(): SurfCard {
    if (targetCursor >= targetCycle.length) refillTargetCycle()
    const target = targetCycle[targetCursor]
    targetCursor += 1
    lastTargetTerm = normalizeTerm(target.term)
    return target
  }

  function chooseDistractors(target: SurfCard): SurfCard[] {
    const targetTerm = normalizeTerm(target.term)
    const candidates = rng.shuffle(deck.cards.filter((card) => normalizeTerm(card.term) !== targetTerm))
    const preferred = candidates.filter((card) => !previousWaveTerms.has(normalizeTerm(card.term)))
    const orderedCandidates = [...preferred, ...candidates.filter((card) => previousWaveTerms.has(normalizeTerm(card.term)))]
    const chosenTerms = new Set<string>()
    const distractors: SurfCard[] = []

    for (const card of orderedCandidates) {
      const term = normalizeTerm(card.term)
      if (chosenTerms.has(term)) continue
      chosenTerms.add(term)
      distractors.push(card)
      if (distractors.length === 2) return distractors
    }

    throw new Error('surf: deck needs at least 3 unique words')
  }

  function chooseCorrectLane(): LaneIndex {
    const candidate = rng.int(3) as LaneIndex
    if (candidate !== previousCorrectLane || correctLaneStreak < 2) return candidate

    const offset = rng.int(2) + 1
    return ((candidate + offset) % 3) as LaneIndex
  }

  return {
    nextWave(index: number, level: number): WaveSpec {
      const target = nextTarget()
      const distractors = chooseDistractors(target)
      const correctLane = chooseCorrectLane()
      const cards: WaveCardSpec[] = [0, 1, 2].map((lane) => ({
        lane: lane as LaneIndex,
        card: lane === correctLane ? target : distractors.shift() as SurfCard,
        isCorrect: lane === correctLane,
      }))

      if (correctLane === previousCorrectLane) {
        correctLaneStreak += 1
      } else {
        previousCorrectLane = correctLane
        correctLaneStreak = 1
      }
      previousWaveTerms = new Set(cards.map(({ card }) => normalizeTerm(card.term)))

      return {
        index,
        target,
        cards: cards as [WaveCardSpec, WaveCardSpec, WaveCardSpec],
        level,
        travelMs: Math.max(
          config.minTravelMs,
          Math.round(config.baseTravelMs * Math.pow(config.travelRampPerLevel, level)),
        ),
      }
    },
  }
}
