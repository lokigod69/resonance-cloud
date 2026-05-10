export class SeededRandom {
  private state: number;

  constructor(seed = 'lexicon-slice') {
    this.state = SeededRandom.hash(seed);
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  integer(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  fork(label: string): SeededRandom {
    return new SeededRandom(`${this.state}:${label}`);
  }

  private static hash(seed: string): number {
    let value = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
      value ^= seed.charCodeAt(index);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }
}
