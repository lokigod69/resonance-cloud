import Phaser from 'phaser';
import {
  EventBus,
  SessionEngine,
  createRandomFromDeckStrategy,
  type GameDeck,
  type LevelConfig,
  type SessionStats,
} from '../../engine';
import type { Hud } from '../../ui/hud';
import type { SessionComplete } from '../../ui/sessionComplete';
import type { AudioBackend, RunnerSoundscape } from './audio';
import type { RunnerMode } from './mode';
import type { PauseContext } from './types';

export type RunnerCardDisplayMode = 'image' | 'text';

export type RunnerSceneInitData = {
  engine: SessionEngine;
  bus: EventBus;
  audio: AudioBackend;
  soundscape: RunnerSoundscape;
  hud: Hud;
  sessionComplete: SessionComplete;
  levels: LevelConfig[];
  mode: RunnerMode;
  displayMode?: RunnerCardDisplayMode;
  onSceneReady?: (mode: RunnerMode) => void;
  onSessionComplete?: (stats: SessionStats) => void;
  onRestart: () => void;
};

export type RunnerSceneController = Phaser.Scene & {
  init(data?: RunnerSceneInitData): void;
  unlockAudio(): Promise<void>;
  pauseForMenu(): void;
  resumeFromMenu(): void;
  getPauseContext(): PauseContext;
  runScriptedSession(): Promise<void>;
  setVisualLevel(levelOrder: number): void;
  spawnPromptDebug(): void;
  spawnCardsDebug(): void;
  commitSelectedDebug?: () => void;
  resolveCorrectDebug(): void;
  holdBluffDebug(): void;
  stats(): SessionStats;
};

export type RunnerDebugController = {
  setVisualLevel(levelOrder: number): void;
  spawnPrompt(): void;
  spawnCards(): void;
  commitSelected?: () => void;
  resolveCorrect(): void;
  holdBluff(): void;
  stats(): SessionStats | null;
};

export function createRunnerSessionEngine(
  deck: GameDeck,
  levels: LevelConfig[],
  bus: EventBus,
): SessionEngine {
  return new SessionEngine({
    deck,
    levels,
    bus,
    distractorStrategy: createRandomFromDeckStrategy(19),
    seed: 19,
  });
}

export function levelForStats(
  levels: LevelConfig[],
  stats: SessionStats | undefined,
  debugVisualLevelIndex: number | null,
): LevelConfig {
  const index = debugVisualLevelIndex ?? stats?.levelIndex ?? 0;
  return levels[Phaser.Math.Clamp(index, 0, levels.length - 1)];
}

export async function runScriptedSession({
  engine,
  levels,
  hud,
  soundscape,
  sessionComplete,
  resetVisualState,
  getCurrentLevel,
  onRestart,
  onSessionComplete,
}: {
  engine: SessionEngine;
  levels: LevelConfig[];
  hud: Hud;
  soundscape: RunnerSoundscape;
  sessionComplete: SessionComplete;
  resetVisualState: () => void;
  getCurrentLevel: () => LevelConfig;
  onRestart: () => void;
  onSessionComplete?: (stats: SessionStats) => void;
}): Promise<void> {
  if (engine.stats.complete) return;
  resetVisualState();
  while (!engine.stats.complete) {
    const prompt = engine.nextPrompt();
    if (prompt.isBluff) {
      engine.resolveBluffHold(prompt.id);
    } else {
      engine.resolveLane(prompt.correctLane, prompt.id);
    }
  }
  const level = getCurrentLevel() ?? levels[levels.length - 1];
  hud.update(engine.stats, level.title);
  soundscape.play('complete');
  sessionComplete.show(engine.stats, onRestart);
  onSessionComplete?.(engine.stats);
}
