export const loadingVerbs = [
  'Composing',
  'Imagining',
  'Painting',
  'Rendering',
  'Assembling',
  'Harmonizing',
  'Illustrating',
  'Animating',
  'Dreaming',
  'Crafting',
  'Synthesizing',
  'Conjuring',
];

export class LoadingVerbCycle {
  private index = 0;
  private timer: number | undefined;
  private readonly element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  start(): void {
    this.stop();
    this.element.textContent = loadingVerbs[0];
    this.timer = window.setInterval(() => {
      this.index = (this.index + 1) % loadingVerbs.length;
      this.element.style.opacity = '0';
      window.setTimeout(() => {
        this.element.textContent = loadingVerbs[this.index];
        this.element.style.opacity = '1';
      }, 300);
    }, 4200);
  }

  stop(): void {
    if (this.timer !== undefined) {
      window.clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
