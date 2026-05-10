import type { BiomeName, LevelConfig } from '../../engine/types';

type LevelInput = Omit<LevelConfig, 'id' | 'biome'> & {
  biome: BiomeName;
};

export function defineLevel(input: LevelInput): LevelConfig {
  return {
    ...input,
    id: `${input.unlockIndex}-${input.biome}`,
  };
}
