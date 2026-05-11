import type { LevelConfig } from '../../engine';

export type RunnerMode = 'glide' | 'rush';

export const RUNNER_MODE_STORAGE_KEY = 'lexicon-path-runner-mode';

export function normalizeRunnerMode(value: unknown): RunnerMode {
  return value === 'rush' || value === 'glide' ? value : 'glide';
}

export function glideDecisionTimerMs(level: LevelConfig): number {
  const t = Math.max(0, Math.min(1, (level.order - 1) / 9));
  return Math.round(8000 + (3000 - 8000) * t);
}
