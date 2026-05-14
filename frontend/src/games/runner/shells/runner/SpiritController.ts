import Phaser from 'phaser';

type SpiritState = 'idle' | 'run' | 'shift-left' | 'shift-right' | 'land' | 'fall' | 'burst';

export class SpiritController {
  readonly container: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly progression: Phaser.GameObjects.Sprite;
  private readonly burst: Phaser.GameObjects.Sprite;
  private masteryState = 0;
  private state: SpiritState = 'idle';
  private readonly scene: Phaser.Scene;
  private readonly sheetKey: string;
  private readonly afterimageKey: string | undefined;

  constructor(
    scene: Phaser.Scene,
    sheetKey: string,
    afterimageKey: string | undefined,
    x: number,
    y: number,
  ) {
    this.scene = scene;
    this.sheetKey = sheetKey;
    this.afterimageKey = afterimageKey;
    this.createAnimations();
    this.sprite = scene.add.sprite(0, 0, sheetKey);
    this.sprite.play('spirit-idle');

    this.progression = scene.add.sprite(0, 0, sheetKey, 48);
    this.progression.setAlpha(0);
    this.progression.setBlendMode(Phaser.BlendModes.ADD);

    this.burst = scene.add.sprite(0, 0, sheetKey, 56);
    this.burst.setAlpha(0);
    this.burst.setBlendMode(Phaser.BlendModes.ADD);
    this.resizeForViewport(scene.scale.width, scene.scale.height);

    this.container = scene.add.container(x, y, [this.progression, this.sprite, this.burst]);
    this.container.setDepth(62);

    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (animation: Phaser.Animations.Animation) => {
      if (
        ['spirit-shift-left', 'spirit-shift-right', 'spirit-land', 'spirit-fall'].includes(animation.key)
      ) {
        this.idle();
      }
    });
    this.burst.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.burst.setAlpha(0);
    });
  }

  idle(): void {
    if (this.state === 'idle') return;
    this.state = 'idle';
    this.sprite.play('spirit-idle', true);
  }

  run(): void {
    if (this.state === 'run') return;
    this.state = 'run';
    this.sprite.play('spirit-idle', true);
  }

  shift(direction: 'left' | 'right'): void {
    this.state = direction === 'left' ? 'shift-left' : 'shift-right';
    this.sprite.play(direction === 'left' ? 'spirit-shift-left' : 'spirit-shift-right', true);
  }

  land(): void {
    this.state = 'land';
    this.sprite.play('spirit-land', true);
  }

  fall(): void {
    this.state = 'fall';
    this.sprite.play('spirit-fall', true);
  }

  bulletTime(): void {
    this.state = 'burst';
    this.burst.setAlpha(0.9);
    this.burst.play('spirit-burst', true);
  }

  baseAlignedY(height: number): number {
    this.resizeForViewport(this.scene.scale.width, height);
    const bottomRatio = this.scene.scale.width < 640 ? 0.78 : 0.82;
    return height * bottomRatio - (this.sprite.displayHeight * this.container.scaleY) / 2 - 8;
  }

  resizeForViewport(width: number, height: number): void {
    const mobile = width < 640;
    const targetFrameHeight = Phaser.Math.Clamp(
      height * (mobile ? 0.27 : 0.24),
      mobile ? 190 : 196,
      mobile ? 220 : 226,
    );
    const scale = targetFrameHeight / this.sprite.height;
    this.sprite.setScale(scale);
    this.progression.setScale(scale * 1.03);
    this.burst.setScale(scale * 1.28);
  }

  createAfterimage(x: number, y: number): Phaser.GameObjects.Image | Phaser.GameObjects.Sprite {
    const ghost = this.afterimageKey
      ? this.scene.add.image(x, y, this.afterimageKey)
      : this.scene.add.sprite(x, y, this.sheetKey, this.sprite.frame.name);
    ghost.setDepth(58);
    if (this.afterimageKey) {
      ghost.setScale((this.sprite.displayHeight * this.container.scaleY) / ghost.height);
    } else {
      ghost.setScale(this.sprite.scaleX * this.container.scaleX);
    }
    ghost.setAlpha(0.5);
    ghost.setBlendMode(Phaser.BlendModes.ADD);
    ghost.setTint(Phaser.Display.Color.GetColor(168, 216, 234));
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scale: ghost.scale * 0.98,
      duration: 360,
      ease: 'Sine.easeOut',
      onComplete: () => ghost.destroy(),
    });
    return ghost;
  }

  setMastery(correctHits: number): void {
    const next = Math.min(4, Math.floor(correctHits / 5));
    if (next === this.masteryState) return;
    this.masteryState = next;
    if (next <= 0) {
      this.progression.setAlpha(0);
      this.sprite.clearTint();
      return;
    }
    this.progression.setFrame(48 + next);
    this.progression.setAlpha(0.16 + next * 0.1);
    this.sprite.setTintFill(Phaser.Display.Color.GetColor(210, 240, 255));
    this.scene.time.delayedCall(90, () => this.sprite.clearTint());
  }

  update(time: number): void {
    const scalePulse = 1 + Math.sin(time / 620) * 0.018;
    this.container.setScale(scalePulse);
    this.progression.setRotation(Math.sin(time / 1200) * 0.02);
  }

  private createAnimations(): void {
    const animations = this.scene.anims;
    const create = (key: string, start: number, end: number, frameRate: number, repeat: number) => {
      if (animations.exists(key)) return;
      animations.create({
        key,
        frames: animations.generateFrameNumbers(this.sheetKey, { start, end }),
        frameRate,
        repeat,
      });
    };
    create('spirit-idle', 0, 7, 6, -1);
    create('spirit-run', 8, 15, 12, -1);
    create('spirit-shift-left', 16, 21, 24, 0);
    create('spirit-shift-right', 24, 29, 24, 0);
    create('spirit-land', 32, 37, 20, 0);
    create('spirit-fall', 40, 45, 16, 0);
    create('spirit-burst', 56, 59, 22, 0);
  }
}
