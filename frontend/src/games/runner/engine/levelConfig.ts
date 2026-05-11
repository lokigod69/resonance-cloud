import type { LevelConfig } from './types';

export function validateLevels(levels: LevelConfig[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const ids = new Set<string>();
  const biomeNames = new Set<string>();

  if (levels.length < 10) {
    errors.push('At least ten levels are required.');
  }

  levels.forEach((level, index) => {
    if (level.order !== index + 1) {
      errors.push(`${level.id} order should be ${index + 1}.`);
    }
    if (ids.has(level.id)) {
      errors.push(`Duplicate level id ${level.id}.`);
    }
    ids.add(level.id);
    biomeNames.add(level.biome.name);
    if (level.distractorCount !== 2) {
      errors.push(`${level.id} must use two distractors for three lanes.`);
    }
    if (
      level.forwardSpeed <= 0 ||
      level.timingWindowMs <= 0 ||
      level.audioToTileMs <= 0 ||
      level.audioToSpawnDelay <= 0 ||
      level.cardTravelDuration <= 0 ||
      level.postWaveDelay <= 0
    ) {
      errors.push(`${level.id} has invalid difficulty timings.`);
    }
  });

  if (biomeNames.size !== levels.length) {
    errors.push('Each level must have a distinct biome name.');
  }

  return { valid: errors.length === 0, errors };
}
