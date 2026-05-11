import Phaser from 'phaser';
import WebFont from 'webfontloader';
import { EventBus, type GameDeck, type LevelConfig, type SessionStats } from '../../engine';
import sampleDeck from '../../fixtures/sample-deck.json';
import { levels as defaultLevels } from '../../levels';
import { Hud } from '../../ui/hud';
import { Menus } from '../../ui/menus';
import { SessionComplete } from '../../ui/sessionComplete';
import '../../ui/styles.css';
import { BrowserSpeechAudio, RunnerSoundscape, type AudioBackend } from './audio';
import { GlideRunnerScene } from './glide';
import { RushRunnerScene } from './rush';
import {
  createRunnerSessionEngine,
  type RunnerDebugController,
  type RunnerSceneController,
} from './runnerSession';
import { RUNNER_MODE_STORAGE_KEY, normalizeRunnerMode, type RunnerMode } from './mode';

export type { AudioBackend } from './audio';

export interface MountRunnerOptions {
  parent: HTMLElement;
  mode?: RunnerMode;
  deck?: GameDeck;
  levels?: LevelConfig[];
  eventBus?: EventBus;
  audioBackend?: AudioBackend;
  enableWindowKeyShortcuts?: boolean;
  persistModeToLocalStorage?: boolean;
  onSessionComplete?: (stats: SessionStats) => void;
  onSceneReady?: (mode: RunnerMode) => void;
}

export interface MountedRunner {
  game: Phaser.Game;
  destroy: () => void;
  pause: () => void;
  resume: () => void;
  runScriptedSession: () => Promise<void>;
  setMode: (mode: RunnerMode) => void;
  setDeck: (deck: GameDeck) => void;
}

const fontFamilies = [
  'Inter:400,500,600,700',
  'Outfit:500,600,700',
  'Caveat:700',
  'Patrick Hand:400',
];

export function mountRunner(options: MountRunnerOptions): MountedRunner {
  const parent = options.parent;
  const enableWindowKeyShortcuts = options.enableWindowKeyShortcuts === true;
  const persistModeToLocalStorage = options.persistModeToLocalStorage === true;
  let deck = options.deck ?? (sampleDeck as GameDeck);
  let runnerLevels = options.levels ?? defaultLevels;
  let eventBus = options.eventBus ?? new EventBus();
  let audioBackend = options.audioBackend ?? new BrowserSpeechAudio();
  let soundscape = new RunnerSoundscape();
  let game: Phaser.Game | null = null;
  let scene: RunnerSceneController | null = null;
  let isPaused = false;
  let isDestroyed = false;
  let isBooting = false;
  let pendingScriptedSession = false;
  let mode = resolveInitialMode(options.mode, persistModeToLocalStorage);

  const parentPosition = parent.style.position;
  const shouldRestoreParentPosition = getComputedStyle(parent).position === 'static';
  if (shouldRestoreParentPosition) {
    parent.style.position = 'relative';
  }

  const chromeRoot = document.createElement('div');
  chromeRoot.className = 'lexicon-runner-shell';
  parent.appendChild(chromeRoot);

  const menus = new Menus(
    chromeRoot,
    {
      onStart: (selectedMode) => {
        menus.hideStart();
        bootGame(selectedMode);
      },
      onPause: () => pauseSession(),
      onResume: () => resumeSession(),
      onRestart: () => restartSession(),
      onModeChange: (selectedMode) => {
        mode = selectedMode;
        persistMode(mode, persistModeToLocalStorage);
      },
    },
    mode,
    { enableWindowKeyShortcuts },
  );

  const debugController: RunnerDebugController = {
    setVisualLevel: (levelOrder) => scene?.setVisualLevel(levelOrder),
    spawnPrompt: () => scene?.spawnPromptDebug(),
    spawnCards: () => scene?.spawnCardsDebug(),
    commitSelected: () => scene?.commitSelectedDebug?.(),
    resolveCorrect: () => scene?.resolveCorrectDebug(),
    holdBluff: () => scene?.holdBluffDebug(),
    stats: () => scene?.stats() ?? null,
  };
  window.__lexiconPathDebug = debugController;

  const primeAudio = () => {
    void audioBackend.prime();
    void soundscape.prime();
  };
  parent.addEventListener('pointerdown', primeAudio, { passive: true });

  const onPauseRequest = () => pauseSession();
  const onAutoplayRequest = () => {
    window.__lexiconPathAutoplay = true;
    void runScriptedSession();
  };
  if (enableWindowKeyShortcuts) {
    window.addEventListener('lexicon-path-pause-request', onPauseRequest);
    window.addEventListener('lexicon-path-autoplay', onAutoplayRequest);
  }

  function bootGame(nextMode: RunnerMode): void {
    if (game || isBooting || isDestroyed) return;
    mode = nextMode;
    persistMode(mode, persistModeToLocalStorage);
    isBooting = true;
    WebFont.load({
      google: { families: fontFamilies },
      active: () => startPhaser(mode),
      inactive: () => startPhaser(mode),
    });
  }

  function startPhaser(sceneMode: RunnerMode): void {
    if (game || isDestroyed) return;
    const engine = createRunnerSessionEngine(deck, runnerLevels, eventBus);
    const hud = new Hud(menus.root, () => pauseSession(), sceneMode);
    const sessionComplete = new SessionComplete(menus.root);
    const runnerScene = createRunnerScene(sceneMode) as RunnerSceneController;
    runnerScene.init({
      engine,
      bus: eventBus,
      audio: audioBackend,
      soundscape,
      hud,
      sessionComplete,
      levels: runnerLevels,
      mode: sceneMode,
      onSceneReady: (readyMode) => {
        options.onSceneReady?.(readyMode);
        if (pendingScriptedSession || window.__lexiconPathAutoplay) {
          pendingScriptedSession = false;
          void runnerScene.runScriptedSession();
        }
      },
      onSessionComplete: options.onSessionComplete,
      onRestart: () => restartSession(),
    });
    scene = runnerScene;
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#0f1720',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: parent.clientWidth || window.innerWidth,
        height: parent.clientHeight || window.innerHeight,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
      scene: runnerScene,
    });
    isBooting = false;
    void runnerScene.unlockAudio();
  }

  function pauseSession(): void {
    if (!game || !scene) return;
    if (isPaused) {
      resumeSession();
      return;
    }
    isPaused = true;
    scene.pauseForMenu();
    menus.showPause(scene.getPauseContext());
    game.scene.pause(scene.scene.key);
  }

  function resumeSession(): void {
    if (!game || !scene || !isPaused) return;
    isPaused = false;
    menus.hidePause();
    game.scene.resume(scene.scene.key);
    scene.resumeFromMenu();
  }

  function restartSession(): void {
    if (parent === document.body) {
      window.location.reload();
      return;
    }
    destroyGame();
    menus.showStart();
  }

  function destroyGame(): void {
    game?.destroy(true, false);
    game = null;
    scene = null;
    isPaused = false;
    isBooting = false;
    menus.clearRuntimeChrome();
    soundscape.pause();
    audioBackend.cancel();
  }

  async function runScriptedSession(): Promise<void> {
    pendingScriptedSession = true;
    if (!game && !isBooting) {
      menus.hideStart();
      bootGame(mode);
      return;
    }
    if (scene) {
      pendingScriptedSession = false;
      await scene.runScriptedSession();
    }
  }

  function setMode(nextMode: RunnerMode): void {
    mode = normalizeRunnerMode(nextMode);
    menus.setMode(mode);
    persistMode(mode, persistModeToLocalStorage);
    if (game) {
      destroyGame();
      menus.showStart();
    }
  }

  function setDeck(nextDeck: GameDeck): void {
    deck = nextDeck;
    if (game) {
      destroyGame();
      menus.showStart();
    }
  }

  function destroy(): void {
    if (isDestroyed) return;
    isDestroyed = true;
    window.removeEventListener('lexicon-path-pause-request', onPauseRequest);
    window.removeEventListener('lexicon-path-autoplay', onAutoplayRequest);
    parent.removeEventListener('pointerdown', primeAudio);
    if (window.__lexiconPathDebug === debugController) {
      delete window.__lexiconPathDebug;
    }
    destroyGame();
    soundscape.destroy();
    menus.destroy();
    chromeRoot.remove();
    if (shouldRestoreParentPosition) {
      parent.style.position = parentPosition;
    }
    audioBackend.cancel();
    runnerLevels = [];
    eventBus = new EventBus();
    audioBackend = new BrowserSpeechAudio();
    soundscape = new RunnerSoundscape();
  }

  return {
    get game() {
      if (!game) {
        throw new Error('Lexicon Path has not started a Phaser game yet.');
      }
      return game;
    },
    destroy,
    pause: pauseSession,
    resume: resumeSession,
    runScriptedSession,
    setMode,
    setDeck,
  };
}

function resolveInitialMode(
  mode: RunnerMode | undefined,
  persistModeToLocalStorage: boolean,
): RunnerMode {
  if (mode) return normalizeRunnerMode(mode);
  if (!persistModeToLocalStorage) return 'glide';
  return normalizeRunnerMode(window.localStorage.getItem(RUNNER_MODE_STORAGE_KEY));
}

function createRunnerScene(mode: RunnerMode): Phaser.Scene {
  return mode === 'rush' ? new RushRunnerScene() : new GlideRunnerScene();
}

function persistMode(mode: RunnerMode, enabled: boolean): void {
  if (!enabled) return;
  window.localStorage.setItem(RUNNER_MODE_STORAGE_KEY, mode);
}

declare global {
  interface Window {
    __lexiconPathAutoplay?: boolean;
    __lexiconPathDebug?: RunnerDebugController;
  }
}
