import { DefaultDistractorStrategy } from './distractors';
import { ConsoleEventBus } from './eventBus';
import { LivesTracker } from './lives';
import { PromptSequencer } from './promptSequencer';
import { SeededRandom } from './random';
import { ScoringSystem } from './scoring';
import type {
  DistractorStrategy,
  EventBus,
  GameDeck,
  LevelConfig,
  LifeLossReason,
  PromptRound,
  SessionStats,
  UpgradeId,
} from './types';

type SessionEngineOptions = {
  deck: GameDeck;
  levels: LevelConfig[];
  eventBus?: EventBus;
  distractorStrategy?: DistractorStrategy;
  seed?: string;
};

export class SessionEngine {
  private readonly options: SessionEngineOptions;
  private readonly eventBus: EventBus;
  private readonly scoring = new ScoringSystem();
  private readonly lives = new LivesTracker(3);
  private readonly sequencer: PromptSequencer;
  private current?: PromptRound;
  private levelIndex = 0;
  private roundsInLevel = 0;
  private isComplete = false;
  private stats: SessionStats = SessionEngine.emptyStats();
  private earnedUpgrades = new Set<UpgradeId>();

  constructor(options: SessionEngineOptions) {
    this.options = options;
    this.eventBus = options.eventBus ?? new ConsoleEventBus();
    this.sequencer = new PromptSequencer(
      options.deck,
      options.distractorStrategy ?? new DefaultDistractorStrategy(options.seed),
      new SeededRandom(options.seed),
    );
  }

  start(): PromptRound {
    this.levelIndex = 0;
    this.roundsInLevel = 0;
    this.isComplete = false;
    this.stats = SessionEngine.emptyStats();
    this.earnedUpgrades.clear();
    this.scoring.reset();
    this.lives.reset();
    this.sequencer.reset();
    return this.advanceRound();
  }

  currentRound(): PromptRound | undefined {
    return this.current;
  }

  sliceCard(cardId: string): void {
    if (!this.current || this.isComplete) return;

    if (this.current.isBluff) {
      this.stats.bluffsFailed += 1;
      this.eventBus.emit('bluff_failed', { roundId: this.current.id, cardId });
      this.loseLife('bluff_failed');
      this.completeRound();
      return;
    }

    if (this.current.targetCard?.id === cardId) {
      const score = this.scoring.correctSlice();
      this.stats.correct += 1;
      this.stats.score = score.score;
      this.stats.maxCombo = score.maxCombo;
      this.eventBus.emit('card_correct', {
        cardId,
        roundId: this.current.id,
        score: score.score,
        combo: score.combo,
        multiplier: score.multiplier,
      });
      this.checkUpgrade(score.combo);
      this.completeRound();
      return;
    }

    this.stats.missed += 1;
    this.scoring.missedBeat();
    this.stats.score = this.scoring.snapshot().score;
    this.eventBus.emit('card_missed', { roundId: this.current.id, cardId });
    this.loseLife('wrong_slice');
    this.completeRound();
  }

  passArc(): void {
    if (!this.current || this.isComplete) return;

    if (this.current.isBluff) {
      const score = this.scoring.bluffResisted();
      this.stats.score = score.score;
      this.stats.bluffsResisted += 1;
      this.eventBus.emit('bluff_resisted', { roundId: this.current.id, score: score.score });
      this.completeRound();
      return;
    }

    this.stats.skipped += 1;
    this.scoring.missedBeat();
    this.stats.score = this.scoring.snapshot().score;
    this.eventBus.emit('card_skipped', { roundId: this.current.id, cardId: this.current.targetCard?.id });
    this.loseLife('missed_target');
    this.completeRound();
  }

  snapshot(): {
    level: LevelConfig;
    levelIndex: number;
    round?: PromptRound;
    lives: ReturnType<LivesTracker['snapshot']>;
    scoring: ReturnType<ScoringSystem['snapshot']>;
    stats: SessionStats;
    isComplete: boolean;
  } {
    return {
      level: this.options.levels[this.levelIndex] ?? this.options.levels[this.options.levels.length - 1],
      levelIndex: this.levelIndex,
      round: this.current,
      lives: this.lives.snapshot(),
      scoring: this.scoring.snapshot(),
      stats: { ...this.stats, upgradesEarned: [...this.stats.upgradesEarned] },
      isComplete: this.isComplete,
    };
  }

  private completeRound(): void {
    if (this.lives.snapshot().isDepleted) {
      this.completeSession();
      return;
    }

    this.roundsInLevel += 1;
    const level = this.options.levels[this.levelIndex];
    if (this.roundsInLevel >= level.rules.roundsToComplete) {
      this.stats.completedLevels.push(level.id);
      this.eventBus.emit('level_complete', { levelId: level.id, stats: this.stats });
      this.levelIndex += 1;
      this.roundsInLevel = 0;
      if (this.levelIndex >= this.options.levels.length) {
        this.completeSession();
        return;
      }
    }

    this.advanceRound();
  }

  private advanceRound(): PromptRound {
    const level = this.options.levels[this.levelIndex];
    this.current = this.sequencer.next(level);
    return this.current;
  }

  private loseLife(reason: LifeLossReason): void {
    const snapshot = this.lives.loseLife(reason);
    this.stats.livesLost = snapshot.lost;
    this.eventBus.emit('life_lost', { ...snapshot, reason });
  }

  private checkUpgrade(combo: number): void {
    const thresholds: Array<[number, UpgradeId]> = [
      [10, 'slow_time'],
      [20, 'double_slice'],
      [30, 'echo_sense'],
    ];
    for (const [threshold, upgrade] of thresholds) {
      if (combo >= threshold && !this.earnedUpgrades.has(upgrade)) {
        this.earnedUpgrades.add(upgrade);
        this.stats.upgradesEarned.push(upgrade);
        this.eventBus.emit('upgrade_earned', { upgrade, combo });
      }
    }
  }

  private completeSession(): void {
    if (this.isComplete) return;
    this.isComplete = true;
    this.current = undefined;
    this.eventBus.emit('session_complete', { stats: this.stats });
  }

  private static emptyStats(): SessionStats {
    return {
      score: 0,
      correct: 0,
      missed: 0,
      skipped: 0,
      bluffsResisted: 0,
      bluffsFailed: 0,
      maxCombo: 0,
      livesLost: 0,
      upgradesEarned: [],
      completedLevels: [],
    };
  }
}
