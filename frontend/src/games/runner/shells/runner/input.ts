import type { LaneIndex } from '../../engine';

export class LaneInput {
  private downX = 0;
  private downY = 0;
  private readonly scene: Phaser.Scene;
  private readonly onLane: (lane: LaneIndex) => void;
  private readonly onDash: () => void;
  private keyboardHandler?: (event: KeyboardEvent) => void;

  constructor(
    scene: Phaser.Scene,
    onLane: (lane: LaneIndex) => void,
    onDash: () => void,
  ) {
    this.scene = scene;
    this.onLane = onLane;
    this.onDash = onDash;
  }

  create(): void {
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (isEditableKeyTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') {
        event.preventDefault();
        this.shift(-1);
        return;
      }
      if (key === 'd' || key === 'arrowright') {
        event.preventDefault();
        this.shift(1);
        return;
      }
      if (key === '1') {
        event.preventDefault();
        this.onLane(0);
        return;
      }
      if (key === '2') {
        event.preventDefault();
        this.onLane(1);
        return;
      }
      if (key === '3') {
        event.preventDefault();
        this.onLane(2);
        return;
      }
      if (key === ' ' || key === 'w') {
        event.preventDefault();
        this.onDash();
      }
    };
    window.addEventListener('keydown', this.keyboardHandler);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyboardHandler) {
        window.removeEventListener('keydown', this.keyboardHandler);
        this.keyboardHandler = undefined;
      }
    });

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.downX = pointer.x;
      this.downY = pointer.y;
    });
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const dx = pointer.x - this.downX;
      const dy = pointer.y - this.downY;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) {
        this.shift(dx > 0 ? 1 : -1);
        return;
      }
      const third = this.scene.scale.width / 3;
      this.onLane(Math.min(2, Math.floor(pointer.x / third)) as LaneIndex);
    });
  }

  private shift(delta: -1 | 1): void {
    const current = Number(this.scene.registry.get('lane') ?? 1);
    this.onLane(Phaser.Math.Clamp(current + delta, 0, 2) as LaneIndex);
  }
}

function isEditableKeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button';
}
