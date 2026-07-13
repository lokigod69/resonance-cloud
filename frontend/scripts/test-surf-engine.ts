/**
 * Deterministic contract checks for the Wave Rider pure engine.
 *
 * Run: npx tsx scripts/test-surf-engine.ts
 */

import { SAMPLE_DECK } from '../src/games/surf/fixtures/sampleDeck.ts'
import { createRng } from '../src/games/surf/engine/random.ts'
import { createWaveSequencer, normalizeTerm } from '../src/games/surf/engine/sequencer.ts'
import { createSessionEngine } from '../src/games/surf/engine/sessionEngine.ts'
import { DEFAULT_SESSION_CONFIG, type SessionConfig, type SurfDeck, type WaveSpec } from '../src/games/surf/engine/types.ts'

let passes = 0
let failures = 0

function assert(name: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    passes += 1
    console.log(`  ok  ${name}`)
    return
  }
  failures += 1
  console.error(`  FAIL ${name}`)
  if (detail !== undefined) console.error('       ', detail)
}

function config(seed: number, overrides: Partial<SessionConfig> = {}): SessionConfig {
  return { ...DEFAULT_SESSION_CONFIG, seed, ...overrides }
}

function correctLane(wave: WaveSpec): 0 | 1 | 2 {
  return wave.cards.find((card) => card.isCorrect)?.lane as 0 | 1 | 2
}

function wrongLane(wave: WaveSpec): 0 | 1 | 2 {
  return wave.cards.find((card) => !card.isCorrect)?.lane as 0 | 1 | 2
}

function waveSignature(wave: WaveSpec): string {
  return `${wave.target.id}:${wave.cards.map((card) => `${card.lane}/${card.card.id}/${card.isCorrect}`).join(',')}`
}

function takeSequencerWaves(deck: SurfDeck, seed: number, count: number): WaveSpec[] {
  const sequencer = createWaveSequencer(deck, config(seed), createRng(seed))
  return Array.from({ length: count }, (_, index) => sequencer.nextWave(index, 0))
}

console.log('\n[surf engine]')

// 1. Same seed produces the exact same target and lane sequence.
const sequenceOne = takeSequencerWaves(SAMPLE_DECK, 41, 20)
const sequenceTwo = takeSequencerWaves(SAMPLE_DECK, 41, 20)
assert('same seed and deck give identical 20-wave sequences', sequenceOne.map(waveSignature).join('|') === sequenceTwo.map(waveSignature).join('|'))

// 2. Every generated wave has three valid, distinct semantic choices.
assert('each wave has lanes 0/1/2, one correct card, and unique distractors', sequenceOne.every((wave) => {
  const lanes = wave.cards.map((card) => card.lane).sort().join(',')
  const terms = wave.cards.map((card) => normalizeTerm(card.card.term))
  const correctCount = wave.cards.filter((card) => card.isCorrect).length
  return lanes === '0,1,2' && correctCount === 1 && new Set(terms).size === 3 && terms.includes(normalizeTerm(wave.target.term))
}))

// 3. Cycle boundaries cannot immediately repeat the target in a three-card deck.
const threeCardDeck: SurfDeck = { ...SAMPLE_DECK, id: 'surf-three', cards: SAMPLE_DECK.cards.slice(0, 3) }
const threeCardTargets = takeSequencerWaves(threeCardDeck, 7, 12).map((wave) => wave.target.id)
assert('three-card deck has no immediate target repeat across cycles', threeCardTargets.every((id, index) => index === 0 || id !== threeCardTargets[index - 1]), threeCardTargets)

// 4. The correct lane cannot appear three times consecutively.
const longLanes = takeSequencerWaves(SAMPLE_DECK, 93, 200).map(correctLane)
assert('correct lane never repeats three times in a row', longLanes.every((lane, index) => index < 2 || lane !== longLanes[index - 1] || lane !== longLanes[index - 2]))

// 5. Score multiplier advances at combos 3 and 6, then a wrong answer resets it.
const scoring = createSessionEngine(SAMPLE_DECK, config(3, { wavesPerRun: 10 }))
const scoreDeltas = Array.from({ length: 8 }, (_, index) => {
  const wave = scoring.nextWave() as WaveSpec
  return scoring.resolveLane(index === 7 ? wrongLane(wave) : correctLane(wave), wave.index)?.scoreDelta
})
assert('score deltas step at combo 3 and 6 and reset after wrong', scoreDeltas.join(',') === '100,100,100,200,200,200,300,0' && scoring.combo === 0 && scoring.score === 1200, scoreDeltas)

// 6. Three wrong answers consume three lives and complete early.
const livesEngine = createSessionEngine(SAMPLE_DECK, config(5, { wavesPerRun: 20, lives: 3 }))
for (let index = 0; index < 3; index += 1) {
  const wave = livesEngine.nextWave() as WaveSpec
  livesEngine.resolveLane(wrongLane(wave), wave.index)
}
assert('three wrong answers end a three-life session with consistent stats', livesEngine.complete && livesEngine.lives === 0 && livesEngine.stats.wrong === 3 && livesEngine.stats.livesLost === 3 && livesEngine.stats.wavesPlayed === 3, livesEngine.stats)

// 7. The configured twentieth resolution completes the run and blocks new waves.
const fullRun = createSessionEngine(SAMPLE_DECK, config(6, { wavesPerRun: 20, lives: 30 }))
for (let index = 0; index < 20; index += 1) {
  const wave = fullRun.nextWave() as WaveSpec
  fullRun.resolveLane(correctLane(wave), wave.index)
}
assert('twenty resolved waves complete the session and nextWave returns null', fullRun.complete && fullRun.stats.wavesPlayed === 20 && fullRun.nextWave() === null)

// 8. Fifth correct answer emits level_up and higher levels ramp travel time to its floor.
const levelEvents: string[] = []
const levels = createSessionEngine(SAMPLE_DECK, config(8, { correctPerLevel: 5, baseTravelMs: 100, travelRampPerLevel: 0.5, minTravelMs: 30, wavesPerRun: 10 }))
levels.on((event) => levelEvents.push(event.type === 'level_up' ? `${event.type}:${event.level}` : event.type))
let fifthTravelMs = 0
for (let index = 0; index < 5; index += 1) {
  const wave = levels.nextWave() as WaveSpec
  if (index === 4) fifthTravelMs = wave.travelMs
  levels.resolveLane(correctLane(wave), wave.index)
}
const levelTwoWave = levels.nextWave() as WaveSpec
const floorWave = createWaveSequencer(SAMPLE_DECK, config(8, { baseTravelMs: 100, travelRampPerLevel: 0.5, minTravelMs: 30 }), createRng(8)).nextWave(0, 10)
assert('level_up fires on fifth correct and travel time ramps then floors', levelEvents.includes('level_up:1') && fifthTravelMs === 100 && levelTwoWave.travelMs === 50 && floorWave.travelMs === 30, { levelEvents, fifthTravelMs, levelTwoTravelMs: levelTwoWave.travelMs, floorTravelMs: floorWave.travelMs })

// 9. Stale and double resolutions do not mutate the session.
const stale = createSessionEngine(SAMPLE_DECK, config(10))
const staleWave = stale.nextWave() as WaveSpec
const beforeStale = JSON.stringify(stale.stats)
const staleResult = stale.resolveLane(correctLane(staleWave), staleWave.index + 1)
const afterStaleNoop = JSON.stringify(stale.stats)
const resolved = stale.resolveLane(correctLane(staleWave), staleWave.index)
const doubleResult = stale.resolveLane(correctLane(staleWave), staleWave.index)
assert('stale and double resolutions are no-ops', staleResult === null && afterStaleNoop === beforeStale && resolved !== null && doubleResult === null && stale.stats.wavesPlayed === 1)

// 10. Requesting an unresolved wave is idempotent and emits only one spawn event.
const idempotent = createSessionEngine(SAMPLE_DECK, config(11))
let spawns = 0
idempotent.on((event) => { if (event.type === 'wave_spawned') spawns += 1 })
const firstWave = idempotent.nextWave()
const sameWave = idempotent.nextWave()
assert('nextWave is idempotent while unresolved', firstWave === sameWave && spawns === 1)

// 11. Invalid decks fail at engine creation with the contract error.
const tooSmallDeck: SurfDeck = { ...threeCardDeck, cards: threeCardDeck.cards.slice(0, 2) }
const duplicateTermsDeck: SurfDeck = {
  ...threeCardDeck,
  cards: [
    { ...threeCardDeck.cards[0], term: 'Ocho ' },
    { ...threeCardDeck.cards[1], term: 'ocho' },
    threeCardDeck.cards[2],
  ],
}
const validationErrors = [tooSmallDeck, duplicateTermsDeck].map((deck) => {
  try {
    createSessionEngine(deck, config(12))
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
})
assert('two cards and duplicate normalized terms fail validation', validationErrors.every((message) => message === 'surf: deck needs at least 3 unique words'), validationErrors)

// 12b. Degenerate configs fail at creation instead of never completing.
const degenerateErrors = [{ wavesPerRun: 0 }, { lives: 0 }].map((overrides) => {
  try {
    createSessionEngine(SAMPLE_DECK, config(14, overrides))
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
})
assert('wavesPerRun 0 and lives 0 throw at engine creation', degenerateErrors.every((message) => message === 'surf: config needs positive wavesPerRun and lives'), degenerateErrors)

// 12. A life-ending answer emits resolution before session completion.
const ordering = createSessionEngine(SAMPLE_DECK, config(13, { lives: 1 }))
const eventOrder: string[] = []
ordering.on((event) => eventOrder.push(event.type))
const finalWave = ordering.nextWave() as WaveSpec
ordering.resolveLane(wrongLane(finalWave), finalWave.index)
assert('life-ending wrong emits wave_resolved then session_complete', eventOrder.join(',') === 'wave_spawned,wave_resolved,session_complete', eventOrder)

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exitCode = 1
