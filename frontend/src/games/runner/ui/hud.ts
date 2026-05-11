import type { SessionStats, Upgrade } from '../engine';
import type { RunnerMode } from '../shells/runner/mode';

export class Hud {
  readonly element: HTMLElement;
  private readonly deckProgress: HTMLElement;
  private readonly wordProgress: HTMLElement;
  private readonly level: HTMLElement;
  private readonly orbs: HTMLElement;
  private readonly upgrades: HTMLElement;
  private readonly timerRing: HTMLElement;

  constructor(parent: HTMLElement, onPause: () => void, mode: RunnerMode = 'glide') {
    this.element = document.createElement('div');
    this.element.className = 'hud';
    this.element.innerHTML = `
      <div class="hud-row">
        <div class="hud-glass">
          <span>Deck</span>
          <strong data-deck-progress>0</strong>
        </div>
        <div class="hud-glass">
          <span data-level>Stillwater</span>
          <span class="orbs" data-orbs></span>
        </div>
        <div class="hud-glass">
          <span>Word</span>
          <strong data-word-progress>0</strong>
          ${mode === 'rush' ? '<span class="mode-badge">Rush</span>' : ''}
          <div class="upgrades" data-upgrades></div>
          <span class="pause-ring" data-timer-ring>
            <button type="button" class="pause-button" aria-label="Pause Session" title="Pause Session" data-pause-button>II</button>
          </span>
        </div>
      </div>
    `;
    parent.appendChild(this.element);
    this.deckProgress = this.element.querySelector('[data-deck-progress]')!;
    this.wordProgress = this.element.querySelector('[data-word-progress]')!;
    this.level = this.element.querySelector('[data-level]')!;
    this.orbs = this.element.querySelector('[data-orbs]')!;
    this.upgrades = this.element.querySelector('[data-upgrades]')!;
    this.timerRing = this.element.querySelector('[data-timer-ring]')!;
    this.element.querySelector('[data-pause-button]')!.addEventListener('click', onPause);
  }

  update(stats: SessionStats, levelTitle: string): void {
    this.deckProgress.textContent = `${stats.promptsResolved}`;
    this.wordProgress.textContent = `${stats.correct}`;
    this.level.textContent = levelTitle;
    this.orbs.innerHTML = Array.from(
      { length: 3 },
      (_, index) => `<span class="orb ${index >= stats.lives ? 'empty' : ''}"></span>`,
    ).join('');
    this.upgrades.innerHTML = stats.upgrades.map((upgrade) => this.renderUpgrade(upgrade)).join('');
  }

  updateDecisionTimer(fraction: number, visible: boolean): void {
    const clamped = Math.max(0, Math.min(1, fraction));
    this.timerRing.classList.toggle('visible', visible);
    this.timerRing.style.setProperty('--timer-progress', `${Math.round(clamped * 360)}deg`);
  }

  private renderUpgrade(upgrade: Upgrade): string {
    const icon = upgrade.id === 'slow_time' ? 'T' : upgrade.id === 'echo_sense' ? 'E' : 'G';
    return `<button class="upgrade" title="${upgrade.label}" aria-label="${upgrade.label}">${icon}</button>`;
  }
}
