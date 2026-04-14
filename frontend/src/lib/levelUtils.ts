export type LevelTier = 'stone' | 'bronze' | 'silver' | 'gold' | 'emerald' | 'amethyst'

export interface LevelInfo {
  level: number
  label: string
  wordCount: number
  wordsInLevel: number
  wordsToNext: number
  progress: string
  tier: LevelTier
}

export function getLevelInfo(wordCount: number): LevelInfo {
  const safe = Math.max(0, wordCount)
  const level = Math.floor(safe / 10) + 1
  const wordsInLevel = safe % 10
  const wordsToNext = 10 - wordsInLevel

  let tier: LevelTier
  if (level <= 1) tier = 'stone'
  else if (level <= 3) tier = 'bronze'
  else if (level <= 5) tier = 'silver'
  else if (level <= 7) tier = 'gold'
  else if (level <= 9) tier = 'emerald'
  else tier = 'amethyst'

  return {
    level,
    label: `L${level}`,
    wordCount: safe,
    wordsInLevel,
    wordsToNext,
    progress: `${wordsInLevel}/10`,
    tier,
  }
}
