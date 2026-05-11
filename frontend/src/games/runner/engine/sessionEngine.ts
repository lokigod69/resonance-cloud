import { ComboSystem } from './combo';
import { loadDeck } from './deckLoader';
import { EventBus } from './eventBus';
import { LivesSystem } from './lives';
import { PromptSequencer } from './promptSequencer';
import { ScoreSystem } from './scoring';
import type {
  DistractorStrategy,
  LaneIndex,
  LevelConfig,
  PromptWave,
  RawDeck,
  Resolution,
  SessionStats,
  Upgrade,
} from './types';

export type SessionEngineOptions = {
  deck: RawDeck;
  levels: LevelConfig[];
  bus?: EventBus;
  distractorStrategy: DistractorStrategy;
  seed?: number;
  forceBluff?: boolean;
};

export class SessionEngine {
  private readonly bus: EventBus;
  private readonly score = new ScoreSystem();
  private readonly lives = new LivesSystem(3);
  private readonly combo = new ComboSystem();
  private readonly sequencer: PromptSequencer;
  private activePrompt: PromptWave | null = null;
  private levelIndex = 0;
  private promptsResolved = 0;
  private correct = 0;
  private missed = 0;
  private skipped = 0;
  private bluffsResisted = 0;
  private bluffsFailed = 0;
  private complete = false;
  private readonly upgrades: Upgrade[] = [];
  private readonly options: SessionEngineOptions;
  readonly deck;

  constructor(options: SessionEngineOptions) {
    this.options = options;
    this.deck = loadDeck(options.deck);
    this.bus = options.bus ?? new EventBus();
    this.sequencer = new PromptSequencer({
      deck: this.deck,
      levels: options.levels,
      distractorStrategy: options.distractorStrategy,
      seed: options.seed,
      forceBluff: options.forceBluff,
    });
  }

  get stats(): SessionStats {
    return {
      score: this.score.total,
      lives: this.lives.current,
      combo: this.combo.count,
      multiplier: this.combo.multiplier,
      correct: this.correct,
      missed: this.missed,
      skipped: this.skipped,
      bluffsResisted: this.bluffsResisted,
      bluffsFailed: this.bluffsFailed,
      levelIndex: this.levelIndex,
      promptsResolved: this.promptsResolved,
      upgrades: [...this.upgrades],
      complete: this.complete,
    };
  }

  nextPrompt(): PromptWave {
    if (this.complete) {
      throw new Error('Cannot create a prompt after session completion.');
    }
    this.activePrompt = this.sequencer.next(this.levelIndex);
    this.bus.emit('prompt_spawned', {
      promptId: this.activePrompt.id,
      target: this.activePrompt.target,
      levelIndex: this.levelIndex,
    });
    return this.activePrompt;
  }

  resolveLane(lane: LaneIndex, promptId = this.activePrompt?.id): Resolution {
    const prompt = this.requirePrompt(promptId);

    if (prompt.isBluff) {
      this.bluffsFailed += 1;
      this.combo.recordMiss();
      this.loseLife(prompt, 'bluff_failed');
      this.promptsResolved += 1;
      this.bus.emit('bluff_failed', { promptId: prompt.id, lane, word: prompt.target.word });
      return this.finishIfNeeded({ kind: 'bluff_failed', prompt, stats: this.stats });
    }

    if (lane === prompt.correctLane) {
      const earned = this.combo.recordCorrect();
      this.correct += 1;
      this.score.applyCorrect(this.combo.multiplier);
      this.promptsResolved += 1;
      earned.forEach((upgrade) => {
        this.upgrades.push(upgrade);
        this.bus.emit('upgrade_earned', { upgrade });
      });
      this.bus.emit('card_correct', {
        promptId: prompt.id,
        target: prompt.target,
        word: prompt.target.word,
        levelIndex: this.levelIndex,
        score: this.score.total,
        combo: this.combo.count,
      });
      this.advanceLevelIfNeeded();
      return this.finishIfNeeded({ kind: 'correct', prompt, stats: this.stats });
    }

    this.missed += 1;
    this.combo.recordMiss();
    this.loseLife(prompt, 'wrong_lane');
    this.promptsResolved += 1;
    this.bus.emit('card_missed', {
      promptId: prompt.id,
      target: prompt.target,
      levelIndex: this.levelIndex,
      lane,
      correctLane: prompt.correctLane,
    });
    return this.finishIfNeeded({ kind: 'missed', prompt, stats: this.stats });
  }

  resolveMissedTiming(promptId = this.activePrompt?.id): Resolution {
    const prompt = this.requirePrompt(promptId);
    this.skipped += 1;
    this.combo.recordMiss();
    this.loseLife(prompt, 'timing_window');
    this.promptsResolved += 1;
    this.bus.emit('card_skipped', {
      promptId: prompt.id,
      target: prompt.target,
      word: prompt.target.word,
      levelIndex: this.levelIndex,
    });
    return this.finishIfNeeded({ kind: 'skipped', prompt, stats: this.stats });
  }

  resolveBluffHold(promptId = this.activePrompt?.id): Resolution {
    const prompt = this.requirePrompt(promptId);
    if (!prompt.isBluff) {
      return this.resolveMissedTiming(prompt.id);
    }

    this.bluffsResisted += 1;
    const earned = this.combo.recordCorrect();
    this.score.applyBluffBonus(this.combo.multiplier);
    this.promptsResolved += 1;
    earned.forEach((upgrade) => {
      this.upgrades.push(upgrade);
      this.bus.emit('upgrade_earned', { upgrade });
    });
    this.bus.emit('bluff_resisted', { promptId: prompt.id, word: prompt.target.word });
    this.advanceLevelIfNeeded();
    return this.finishIfNeeded({ kind: 'bluff_resisted', prompt, stats: this.stats });
  }

  private requirePrompt(promptId?: string): PromptWave {
    if (!this.activePrompt || this.activePrompt.id !== promptId) {
      throw new Error('No active prompt matches the requested resolution.');
    }
    const prompt = this.activePrompt;
    this.activePrompt = null;
    return prompt;
  }

  private loseLife(prompt: PromptWave, reason: string): void {
    const remaining = this.lives.lose();
    this.bus.emit('life_lost', { promptId: prompt.id, reason, remaining });
  }

  private advanceLevelIfNeeded(): void {
    const nextLevelIndex = Math.min(
      this.options.levels.length - 1,
      Math.floor(this.correct / 3),
    );
    if (nextLevelIndex > this.levelIndex) {
      this.levelIndex = nextLevelIndex;
      this.bus.emit('level_complete', {
        levelIndex: this.levelIndex,
        levelId: this.options.levels[this.levelIndex - 1]?.id,
      });
    }
  }

  private finishIfNeeded(resolution: Resolution): Resolution {
    if (this.lives.empty || this.promptsResolved >= 30 || this.correct >= 30) {
      this.complete = true;
      const stats = this.stats;
      this.bus.emit('session_complete', { stats });
      return { ...resolution, kind: 'session_complete', stats };
    }
    return { ...resolution, stats: this.stats };
  }
}
