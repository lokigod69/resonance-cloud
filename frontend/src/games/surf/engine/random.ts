/** A small deterministic PRNG for Wave Rider session generation. */
export type SurfRng = {
  next(): number
  int(maxExclusive: number): number
  shuffle<T>(items: readonly T[]): T[]
}

/**
 * Creates an independent mulberry32 random stream. The seed is coerced to an
 * unsigned 32-bit integer so every JavaScript number has stable behaviour.
 */
export function createRng(seed: number): SurfRng {
  let state = seed >>> 0

  const next = (): number => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }

  return {
    next,
    int(maxExclusive: number): number {
      return Math.floor(next() * maxExclusive)
    },
    shuffle<T>(items: readonly T[]): T[] {
      const shuffled = [...items]
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(next() * (index + 1))
        const current = shuffled[index]
        shuffled[index] = shuffled[swapIndex]
        shuffled[swapIndex] = current
      }
      return shuffled
    },
  }
}
