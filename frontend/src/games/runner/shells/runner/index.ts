import Phaser from 'phaser';
import { GlideRunnerScene } from './glide';
export { BrowserSpeechAudio, RunnerSoundscape, type AudioBackend } from './audio';
export { mountRunner, type MountedRunner, type MountRunnerOptions } from './mount';
export { RUNNER_MODE_STORAGE_KEY, glideDecisionTimerMs, normalizeRunnerMode } from './mode';
import type { RunnerMode } from './mode';
import { RushRunnerScene } from './rush';

export function createRunnerScene(mode: RunnerMode): Phaser.Scene {
  return mode === 'rush' ? new RushRunnerScene() : new GlideRunnerScene();
}

export type { RunnerMode } from './mode';
export type { PauseContext } from './types';
