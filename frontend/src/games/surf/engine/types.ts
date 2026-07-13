// Wave Rider ('surf') — pure engine contract. No Phaser or React imports in engine/.
// This file is the frozen interface between engine, scene, and React shell
// (see docs/Product/FABLE_WAVE_RIDER_PLAN.md). Reshape only with Fable review.

export type LaneIndex = 0 | 1 | 2

export type SurfCard = {
  /** words.id (uuid) in deck/due mode; conceptId ("animals.dog") in pack mode. */
  id: string
  /** Target-language term rendered on the buoy sign. */
  term: string
  /** Helper/base-language term rendered as the top prompt. */
  prompt: string
  /** Pre-generated audio for the target term (tts_audio_url / static playback URL). */
  audioUrl?: string | null
  /** Language code for browser-speech fallback (e.g. "es", "ko-KR"). */
  languageCode?: string | null
}

export type SurfDeckSource = 'deck' | 'due' | 'pack'

export type SurfDeck = {
  id: string
  label: string
  source: SurfDeckSource
  languageCode: string | null
  /** Must contain at least MIN_DECK_CARDS entries with unique normalized terms. */
  cards: SurfCard[]
}

export const MIN_DECK_CARDS = 3

/** cruise: buoys park at the decision line and wait. rush: crossing the line commits. */
export type SurfMode = 'cruise' | 'rush'

export type SessionConfig = {
  mode: SurfMode
  /** Waves in a run (default 20). */
  wavesPerRun: number
  /** Starting lives (default 3). */
  lives: number
  /** Seed for the deterministic RNG — same seed + deck ⇒ same session. */
  seed: number
  /** Correct answers needed per level step (default 5). */
  correctPerLevel: number
  /** Spawn→decision-line travel time at level 0, ms (default 5200). */
  baseTravelMs: number
  /** Per-level travel multiplier (default 0.92), floored at minTravelMs. */
  travelRampPerLevel: number
  /** Fastest allowed travel time, ms (default 2600). */
  minTravelMs: number
}

export const DEFAULT_SESSION_CONFIG: Omit<SessionConfig, 'seed'> = {
  mode: 'cruise',
  wavesPerRun: 20,
  lives: 3,
  correctPerLevel: 5,
  baseTravelMs: 5200,
  travelRampPerLevel: 0.92,
  minTravelMs: 2600,
}

export type WaveCardSpec = {
  lane: LaneIndex
  card: SurfCard
  isCorrect: boolean
}

export type WaveSpec = {
  /** 0-based wave number within the session. */
  index: number
  target: SurfCard
  /** Exactly one entry has isCorrect: true; lanes 0/1/2 each appear once. */
  cards: [WaveCardSpec, WaveCardSpec, WaveCardSpec]
  /** Level at spawn time (drives palette + speed on the scene side). */
  level: number
  /** Travel time for this wave, ms — computed from level by the engine. */
  travelMs: number
}

export type SessionStats = {
  correct: number
  wrong: number
  score: number
  bestCombo: number
  livesLost: number
  levelReached: number
  wavesPlayed: number
}

export type ResolveResult = {
  correct: boolean
  chosen: SurfCard
  target: SurfCard
  scoreDelta: number
  combo: number
  lives: number
  level: number
  levelBefore: number
  sessionComplete: boolean
}

export type EngineEvent =
  | { type: 'wave_spawned'; wave: WaveSpec }
  | { type: 'wave_resolved'; waveIndex: number; result: ResolveResult }
  | { type: 'level_up'; level: number }
  | { type: 'session_complete'; stats: SessionStats }

export type EngineListener = (event: EngineEvent) => void

/**
 * Pure session state machine. The scene owns time and animation; the engine owns
 * sequencing, correctness, scoring, lives, and levels. Scene calls nextWave() to
 * spawn, animates travel over wave.travelMs, and calls resolveLane() at the commit
 * moment (player input in cruise; line-crossing in rush).
 */
export interface SessionEngine {
  readonly config: SessionConfig
  readonly deck: SurfDeck
  readonly stats: SessionStats
  readonly level: number
  readonly combo: number
  readonly lives: number
  readonly score: number
  readonly complete: boolean
  /** Next wave, or null when the session is complete / waves exhausted. */
  nextWave(): WaveSpec | null
  /**
   * Resolve the active wave against a lane. Returns null (no-op) if waveIndex is
   * stale or the session is complete — resolving the same wave twice must be safe.
   */
  resolveLane(lane: LaneIndex, waveIndex: number): ResolveResult | null
  /** Subscribe to engine events; returns an unsubscribe function. */
  on(listener: EngineListener): () => void
}
