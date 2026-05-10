import type { LifeLossReason } from './types';

export type LivesSnapshot = {
  remaining: number;
  lost: number;
  isDepleted: boolean;
};

export type LifeLossSnapshot = LivesSnapshot & {
  reason: LifeLossReason;
};

export class LivesTracker {
  private remaining: number;

  constructor(private readonly total = 3) {
    this.remaining = total;
  }

  loseLife(reason: LifeLossReason): LifeLossSnapshot {
    this.remaining = Math.max(0, this.remaining - 1);
    return { ...this.snapshot(), reason };
  }

  reset(): void {
    this.remaining = this.total;
  }

  snapshot(): LivesSnapshot {
    return {
      remaining: this.remaining,
      lost: this.total - this.remaining,
      isDepleted: this.remaining <= 0,
    };
  }
}
