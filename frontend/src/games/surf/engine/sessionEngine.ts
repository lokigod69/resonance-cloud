import { createRng } from './random'
import { createWaveSequencer, normalizeTerm } from './sequencer'
import type {
  EngineEvent,
  EngineListener,
  LaneIndex,
  ResolveResult,
  SessionConfig,
  SessionEngine,
  SessionStats,
  SurfDeck,
  WaveSpec,
} from './types'
import { MIN_DECK_CARDS } from './types'

export function createSessionEngine(deck: SurfDeck, config: SessionConfig): SessionEngine {
  const uniqueTerms = new Set(deck.cards.map((card) => normalizeTerm(card.term)))
  if (deck.cards.length < MIN_DECK_CARDS || uniqueTerms.size < MIN_DECK_CARDS) {
    throw new Error('surf: deck needs at least 3 unique words')
  }
  if (config.wavesPerRun <= 0 || config.lives <= 0) {
    // A session that is born complete would never emit session_complete —
    // fail loudly instead of leaving a callback-driven shell hanging.
    throw new Error('surf: config needs positive wavesPerRun and lives')
  }

  const sequencer = createWaveSequencer(deck, config, createRng(config.seed))
  const listeners = new Set<EngineListener>()
  const state: SessionStats = {
    correct: 0,
    wrong: 0,
    score: 0,
    bestCombo: 0,
    livesLost: 0,
    levelReached: 0,
    wavesPlayed: 0,
  }
  let combo = 0
  let lives = config.lives
  let activeWave: WaveSpec | null = null
  let sessionComplete = false

  function currentLevel(): number {
    return Math.floor(state.correct / config.correctPerLevel)
  }

  function emit(event: EngineEvent): void {
    for (const listener of listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('surf: engine listener failed', error)
      }
    }
  }

  return {
    config,
    deck,
    get stats(): SessionStats {
      return { ...state }
    },
    get level(): number {
      return currentLevel()
    },
    get combo(): number {
      return combo
    },
    get lives(): number {
      return lives
    },
    get score(): number {
      return state.score
    },
    get complete(): boolean {
      return sessionComplete
    },
    nextWave(): WaveSpec | null {
      if (sessionComplete) return null
      if (activeWave !== null) return activeWave

      activeWave = sequencer.nextWave(state.wavesPlayed, currentLevel())
      emit({ type: 'wave_spawned', wave: activeWave })
      return activeWave
    },
    resolveLane(lane: LaneIndex, waveIndex: number): ResolveResult | null {
      if (sessionComplete || activeWave === null || activeWave.index !== waveIndex) return null

      const wave = activeWave
      const chosen = wave.cards.find((card) => card.lane === lane)
      if (chosen === undefined) return null

      const levelBefore = currentLevel()
      const correct = chosen.isCorrect
      const scoreDelta = correct ? 100 * (1 + Math.floor(combo / 3)) : 0
      if (correct) {
        combo += 1
        state.correct += 1
      } else {
        combo = 0
        lives -= 1
        state.wrong += 1
        state.livesLost += 1
      }
      state.score += scoreDelta
      state.wavesPlayed += 1
      const level = currentLevel()
      state.bestCombo = Math.max(state.bestCombo, combo)
      state.levelReached = Math.max(state.levelReached, level)
      activeWave = null
      sessionComplete = state.wavesPlayed >= config.wavesPerRun || lives <= 0

      const result: ResolveResult = {
        correct,
        chosen: chosen.card,
        target: wave.target,
        scoreDelta,
        combo,
        lives,
        level,
        levelBefore,
        sessionComplete,
      }
      emit({ type: 'wave_resolved', waveIndex, result })
      if (level > levelBefore) emit({ type: 'level_up', level })
      if (sessionComplete) emit({ type: 'session_complete', stats: { ...state } })
      return result
    },
    on(listener: EngineListener): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
