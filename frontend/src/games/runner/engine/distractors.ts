import { SeededRandom } from './random';
import type { DistractorStrategy } from './types';

export function createRandomFromDeckStrategy(seed?: number): DistractorStrategy {
  const random = new SeededRandom(seed);

  return {
    id: 'random-from-deck',
    select({ deck, target, count }) {
      const candidates = deck.cards.filter((card) => card.id !== target.id);
      return random.shuffle(candidates).slice(0, count);
    },
  };
}

export const semanticNeighborStrategyPlaceholder: DistractorStrategy = {
  id: 'semantic-neighbor',
  select() {
    throw new Error('semantic-neighbor strategy is an integration extension point for v2.');
  },
};
