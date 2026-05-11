import type { LaneIndex } from '../../engine';

export class LaneInput {
  private downX = 0;
  private downY = 0;
  private readonly scene: Phaser.Scene;
  private readonly onLane: (lane: LaneIndex) => void;
  private readonly onDash: () => void;

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
    const keys = this.scene.input.keyboard?.addKeys('A,D,LEFT,RIGHT,ONE,TWO,THREE,SPACE') as
      | Record<string, Phaser.Input.Keyboard.Key>
      | undefined;
    if (keys) {
      keys.A.on('down', () => this.shift(-1));
      keys.LEFT.on('down', () => this.shift(-1));
      keys.D.on('down', () => this.shift(1));
      keys.RIGHT.on('down', () => this.shift(1));
      keys.ONE.on('down', () => this.onLane(0));
      keys.TWO.on('down', () => this.onLane(1));
      keys.THREE.on('down', () => this.onLane(2));
      keys.SPACE.on('down', () => this.onDash());
    }

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
