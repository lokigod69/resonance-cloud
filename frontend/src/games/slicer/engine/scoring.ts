export type ScoreSnapshot = {
  score: number;
  combo: number;
  multiplier: number;
  maxCombo: number;
};

export class ScoringSystem {
  private score = 0;
  private combo = 0;
  private maxCombo = 0;

  correctSlice(): ScoreSnapshot {
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const multiplier = this.currentMultiplier();
    this.score += 100 * multiplier;
    return this.snapshot();
  }

  missedBeat(): ScoreSnapshot {
    this.combo = 0;
    return this.snapshot();
  }

  bluffResisted(): ScoreSnapshot {
    this.score += 150;
    return this.snapshot();
  }

  reset(): void {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
  }

  snapshot(): ScoreSnapshot {
    return {
      score: this.score,
      combo: this.combo,
      multiplier: this.currentMultiplier(),
      maxCombo: this.maxCombo,
    };
  }

  private currentMultiplier(): number {
    return Math.max(1, Math.min(4, this.combo));
  }
}
