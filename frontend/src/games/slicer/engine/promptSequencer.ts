import { DefaultDistractorStrategy } from './distractors';
import { SeededRandom } from './random';
import type { DistractorStrategy, GameDeck, LevelConfig, PromptRound } from './types';

export class PromptSequencer {
  private readonly deck: GameDeck;
  private readonly strategy: DistractorStrategy;
  private readonly random: SeededRandom;
  private cursor = 0;
  private roundCounter = 0;

  constructor(
    deck: GameDeck,
    strategy: DistractorStrategy = new DefaultDistractorStrategy(),
    random = new SeededRandom(),
  ) {
    this.deck = deck;
    this.strategy = strategy;
    this.random = random;
  }

  next(level: LevelConfig): PromptRound {
    const cards = this.deck.cards;
    const shouldBluff = level.rules.bluffChance > 0 && this.random.chance(level.rules.bluffChance);
    const target = cards[this.cursor % cards.length];
    this.cursor += 1;
    this.roundCounter += 1;

    if (shouldBluff) {
      const visibleTarget = cards[this.cursor % cards.length];
      const distractors = this.strategy.selectDistractors(visibleTarget, cards, level.arc.cardsPerArc);
      return {
        id: `${level.id}-${this.roundCounter}`,
        levelId: level.id,
        promptWord: target.word,
        promptAudioUrl: target.audioUrl,
        isBluff: true,
        cards: distractors,
      };
    }

    const distractors = this.strategy.selectDistractors(
      target,
      cards,
      Math.min(level.arc.distractorCount, level.arc.cardsPerArc - 1),
    );
    return {
      id: `${level.id}-${this.roundCounter}`,
      levelId: level.id,
      promptWord: target.word,
      promptAudioUrl: target.audioUrl,
      isBluff: false,
      targetCard: target,
      cards: this.shuffle([target, ...distractors], `${level.id}-${this.roundCounter}`),
    };
  }

  reset(): void {
    this.cursor = 0;
    this.roundCounter = 0;
  }

  private shuffle(cards: GameDeck['cards'], label: string): GameDeck['cards'] {
    const random = this.random.fork(label);
    const output = [...cards];
    for (let index = output.length - 1; index > 0; index -= 1) {
      const swapIndex = random.integer(index + 1);
      [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
    }
    return output;
  }
}
