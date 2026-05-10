export type GameAttemptEvent = {
  type: 'game_attempt'
  gameId: string
  wordId: string
  passed: boolean
  timestamp: number
  metadata?: Record<string, unknown>
}

export type GameLifecycleEvent = {
  type: 'session_complete' | 'round_complete' | 'session_aborted'
  gameId: string
  timestamp: number
  payload?: Record<string, unknown>
}

export type GameEvent = GameAttemptEvent | GameLifecycleEvent

