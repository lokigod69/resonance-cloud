export class ScoreSystem {
  total = 0;

  applyCorrect(multiplier: number): number {
    const gain = 100 * Math.max(1, multiplier);
    this.total += gain;
    return gain;
  }

  applyBluffBonus(multiplier: number): number {
    const gain = 150 * Math.max(1, multiplier);
    this.total += gain;
    return gain;
  }
}
