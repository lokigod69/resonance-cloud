export class LivesSystem {
  readonly max: number;
  current: number;

  constructor(max = 3) {
    this.max = max;
    this.current = max;
  }

  lose(): number {
    this.current = Math.max(0, this.current - 1);
    return this.current;
  }

  get empty(): boolean {
    return this.current <= 0;
  }
}
