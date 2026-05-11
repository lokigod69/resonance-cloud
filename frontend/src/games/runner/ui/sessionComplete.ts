import type { SessionStats } from '../engine';

export class SessionComplete {
  private screen: HTMLElement | null = null;
  private readonly parent: HTMLElement;

  constructor(parent: HTMLElement) {
    this.parent = parent;
  }

  show(stats: SessionStats, onRestart: () => void): void {
    this.screen?.remove();
    this.screen = document.createElement('section');
    this.screen.className = 'screen';
    this.screen.innerHTML = `
      <div class="complete-panel">
        <p class="eyebrow">Session</p>
        <h2>Session Complete</h2>
        <p class="lede">Your vocabulary moved by melody and motion.</p>
        <div class="stats-grid">
          <div class="stat"><span>Remembered</span><strong>${stats.correct}</strong></div>
          <div class="stat"><span>Review Later</span><strong>${stats.missed + stats.skipped + stats.bluffsFailed}</strong></div>
          <div class="stat"><span>Score</span><strong>${stats.score}</strong></div>
          <div class="stat"><span>Bluffs Held</span><strong>${stats.bluffsResisted}</strong></div>
        </div>
        <button type="button" data-restart>Start Again</button>
      </div>
    `;
    this.parent.appendChild(this.screen);
    this.screen.querySelector('[data-restart]')!.addEventListener('click', onRestart);
  }
}
