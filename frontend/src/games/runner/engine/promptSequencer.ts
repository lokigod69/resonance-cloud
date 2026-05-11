import { SeededRandom } from './random';
import type { DistractorStrategy, GameDeck, LaneIndex, LevelConfig, PromptWave } from './types';

export type PromptSequencerOptions = {
  deck: GameDeck;
  levels: LevelConfig[];
  distractorStrategy: DistractorStrategy;
  seed?: number;
  forceBluff?: boolean;
};

export class PromptSequencer {
  private promptIndex = 0;
  private cardIndex = 0;
  private readonly random: SeededRandom;
  private readonly options: PromptSequencerOptions;

  constructor(options: PromptSequencerOptions) {
    this.options = options;
    this.random = new SeededRandom(options.seed);
  }

  next(levelIndex: number): PromptWave {
    const level = this.options.levels[Math.min(levelIndex, this.options.levels.length - 1)];
    const target = this.options.deck.cards[this.cardIndex % this.options.deck.cards.length];
    this.cardIndex += 1;

    const canBluff = level.bluffFrequency > 0;
    const isBluff =
      this.options.forceBluff === true ||
      (canBluff && this.random.next() < level.bluffFrequency && this.promptIndex > 0);
    const correctLane = this.random.integer(3) as LaneIndex;
    const distractors = this.options.distractorStrategy.select({
      deck: this.options.deck,
      target,
      count: level.distractorCount,
      levelId: level.id,
    });
    const bluffCards = isBluff
      ? distractors
      : [
          ...distractors.slice(0, correctLane),
          target,
          ...distractors.slice(correctLane),
        ].slice(0, 3);
    const cards = ([0, 1, 2] as LaneIndex[]).map((lane) => {
      const card = bluffCards[lane] ?? this.random.pick(this.options.deck.cards);
      return {
        ...card,
        lane,
        isCorrect: !isBluff && lane === correctLane,
      };
    });

    const now = Date.now();
    const prompt: PromptWave = {
      id: `prompt-${this.promptIndex}`,
      index: this.promptIndex,
      level,
      target,
      cards,
      correctLane,
      isBluff,
      startedAt: now,
      decisionAt: now + level.audioToTileMs,
      timingWindowMs: level.timingWindowMs,
    };
    this.promptIndex += 1;
    return prompt;
  }
}
