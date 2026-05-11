import { LoadingVerbCycle } from './loadingScreen';
import type { RunnerMode } from '../shells/runner/mode';

export type UiCallbacks = {
  onStart: (mode: RunnerMode) => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onModeChange: (mode: RunnerMode) => void;
};

export type PauseMenuContext = {
  word: string;
  translation: string;
  context: string;
  levelTitle: string;
};

export class Menus {
  readonly root: HTMLElement;
  readonly gameRoot: HTMLElement;
  private readonly host: HTMLElement;
  private readonly startScreen: HTMLElement;
  private readonly pauseScreen: HTMLElement;
  private readonly pauseWord: HTMLElement;
  private readonly pauseTranslation: HTMLElement;
  private readonly pauseContext: HTMLElement;
  private readonly pauseLevel: HTMLElement;
  private readonly loadingVerb: LoadingVerbCycle;
  private readonly keydownHandler?: (event: KeyboardEvent) => void;
  private selectedMode: RunnerMode;

  constructor(
    root: HTMLElement,
    callbacks: UiCallbacks,
    initialMode: RunnerMode,
    options: { enableWindowKeyShortcuts?: boolean } = {},
  ) {
    this.host = root;
    this.selectedMode = initialMode;
    root.innerHTML =
      '<div id="game-root" data-game-root></div><div class="ui-layer" id="ui-layer" data-ui-layer></div>';
    this.gameRoot = root.querySelector('[data-game-root]')!;
    this.root = root.querySelector('[data-ui-layer]')!;
    this.root.innerHTML = `
      <section class="screen" data-start>
        <div class="start-panel">
          <p class="eyebrow">Deck awaits</p>
          <h1>Lexicon Path</h1>
          <p class="lede">Listen for the Word, follow the three quiet lanes, and land on the Card that carries its meaning.</p>
          <div class="mode-toggle" role="group" aria-label="Runner mode">
            <button type="button" data-mode-button="glide">Glide</button>
            <button type="button" data-mode-button="rush">Rush</button>
          </div>
          <button type="button" data-start-button>Begin Session</button>
        </div>
        <div class="loading-verbs" data-loading-verb>Composing</div>
      </section>
      <section class="screen hidden" data-pause>
        <div class="pause-panel">
          <p class="eyebrow">Session paused</p>
          <h2 data-pause-word>Between Words</h2>
          <p class="pause-translation" data-pause-translation>The next Card is forming.</p>
          <p class="lede" data-pause-context>The path will wait where you left it.</p>
          <p class="pause-level" data-pause-level>Stillwater</p>
          <div class="pause-actions">
            <button type="button" data-resume-button>Resume</button>
            <button type="button" data-end-button>End Session</button>
          </div>
        </div>
      </section>
    `;
    this.startScreen = this.root.querySelector('[data-start]')!;
    this.pauseScreen = this.root.querySelector('[data-pause]')!;
    this.pauseWord = this.root.querySelector('[data-pause-word]')!;
    this.pauseTranslation = this.root.querySelector('[data-pause-translation]')!;
    this.pauseContext = this.root.querySelector('[data-pause-context]')!;
    this.pauseLevel = this.root.querySelector('[data-pause-level]')!;
    this.loadingVerb = new LoadingVerbCycle(this.root.querySelector('[data-loading-verb]')!);
    this.loadingVerb.start();

    this.root
      .querySelector('[data-start-button]')!
      .addEventListener('click', () => callbacks.onStart(this.selectedMode));
    this.root.querySelectorAll<HTMLElement>('[data-mode-button]').forEach((button) => {
      button.addEventListener('click', () => {
        this.selectedMode = button.dataset.modeButton === 'rush' ? 'rush' : 'glide';
        this.syncModeToggle();
        callbacks.onModeChange(this.selectedMode);
      });
    });
    this.syncModeToggle();
    this.root.querySelector('[data-resume-button]')!.addEventListener('click', callbacks.onResume);
    this.root.querySelector('[data-end-button]')!.addEventListener('click', callbacks.onRestart);
    if (options.enableWindowKeyShortcuts) {
      this.keydownHandler = (event) => {
        if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
          callbacks.onPause();
        }
        if (event.key.toLowerCase() === 'r') {
          callbacks.onRestart();
        }
      };
      window.addEventListener('keydown', this.keydownHandler);
    }
  }

  hideStart(): void {
    this.loadingVerb.stop();
    this.startScreen.classList.add('hidden');
  }

  showStart(): void {
    this.clearRuntimeChrome();
    this.pauseScreen.classList.add('hidden');
    this.startScreen.classList.remove('hidden');
    this.loadingVerb.start();
  }

  showPause(context: PauseMenuContext): void {
    this.pauseWord.textContent = context.word;
    this.pauseTranslation.textContent = context.translation;
    this.pauseContext.textContent = context.context;
    this.pauseLevel.textContent = context.levelTitle;
    this.pauseScreen.classList.remove('hidden');
  }

  hidePause(): void {
    this.pauseScreen.classList.add('hidden');
  }

  mode(): RunnerMode {
    return this.selectedMode;
  }

  setMode(mode: RunnerMode): void {
    this.selectedMode = mode;
    this.syncModeToggle();
  }

  clearRuntimeChrome(): void {
    this.root
      .querySelectorAll('.hud, .screen:not([data-start]):not([data-pause])')
      .forEach((element) => {
        element.remove();
      });
  }

  destroy(): void {
    this.loadingVerb.stop();
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
    }
    this.host.innerHTML = '';
  }

  private syncModeToggle(): void {
    this.root.querySelectorAll<HTMLElement>('[data-mode-button]').forEach((button) => {
      const mode = button.dataset.modeButton === 'rush' ? 'rush' : 'glide';
      const active = mode === this.selectedMode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
}
