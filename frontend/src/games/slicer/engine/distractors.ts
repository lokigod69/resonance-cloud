import { SeededRandom } from './random';
import type { DistractorStrategy, GameCard } from './types';

export class DefaultDistractorStrategy implements DistractorStrategy {
  constructor(private readonly seed = 'rainy-day') {}

  selectDistractors(target: GameCard, pool: GameCard[], count: number): GameCard[] {
    const random = new SeededRandom(`${this.seed}:${target.id}:${count}`);
    const candidates = pool.filter((card) => card.id !== target.id);
    const shuffled = [...candidates];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = random.integer(index + 1);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled.slice(0, Math.max(0, Math.min(count, shuffled.length)));
  }
}
