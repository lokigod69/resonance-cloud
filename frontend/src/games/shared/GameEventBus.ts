import type { GameEvent } from './gameEvents'

export interface GameEventBus {
  emit(event: GameEvent): void
  on(handler: (event: GameEvent) => void): () => void
}

export function createGameEventBus(): GameEventBus {
  const handlers = new Set<(event: GameEvent) => void>()

  return {
    emit(event) {
      for (const handler of [...handlers]) {
        handler(event)
      }
    },
    on(handler) {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },
  }
}

