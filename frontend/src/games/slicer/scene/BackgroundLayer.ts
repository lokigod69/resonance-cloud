import Phaser from 'phaser';
import type { LevelConfig } from '../engine/types';

type GradientStop = {
  top: number;
  mid: number;
  bottom: number;
  bottomAlpha: number;
};

const BASE_STOPS: Record<string, GradientStop> = {
  stillwater: { top: 0x040403, mid: 0x0d0602, bottom: 0xb63800, bottomAlpha: 0.1 },
  rainfall: { top: 0x050505, mid: 0x170800, bottom: 0xff4500, bottomAlpha: 0.24 },
  aurora: { top: 0x050505, mid: 0x1a0a00, bottom: 0xff6b35, bottomAlpha: 0.26 },
  driftwood: { top: 0x050505, mid: 0x170b02, bottom: 0xd94512, bottomAlpha: 0.2 },
  tideline: { top: 0x050505, mid: 0x1a0704, bottom: 0xff4500, bottomAlpha: 0.25 },
  geode: { top: 0x050505, mid: 0x1a0a00, bottom: 0xff6b35, bottomAlpha: 0.22 },
  embers: { top: 0x070302, mid: 0x2b0e00, bottom: 0xff5a14, bottomAlpha: 0.48 },
  mistwood: { top: 0x040403, mid: 0x100806, bottom: 0xb43d12, bottomAlpha: 0.2 },
  solstice: { top: 0x120902, mid: 0x4a2400, bottom: 0xffb02e, bottomAlpha: 0.46 },
  reverie: { top: 0x0a0502, mid: 0x251006, bottom: 0xff6b35, bottomAlpha: 0.34 },
};

export class BackgroundLayer {
  private readonly scene: Phaser.Scene;
  private base?: Phaser.GameObjects.Graphics;
  private warmth?: Phaser.GameObjects.Graphics;
  private overlay?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  redraw(level: LevelConfig): void {
    this.destroy();
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const stops = BASE_STOPS[level.biome] ?? BASE_STOPS.stillwater;

    this.base = this.scene.add.graphics().setName('procedural-background').setDepth(-30);
    this.base.fillGradientStyle(stops.top, stops.top, stops.mid, stops.mid, 1, 1, 1, 1);
    this.base.fillRect(0, 0, width, height);

    this.warmth = this.scene.add.graphics().setName('procedural-warmth').setDepth(-29);
    this.warmth.fillGradientStyle(stops.mid, stops.mid, stops.bottom, stops.bottom, 0, 0, stops.bottomAlpha, stops.bottomAlpha);
    this.warmth.fillRect(0, height * 0.42, width, height * 0.58);

    this.overlay = this.scene.add.graphics().setName('procedural-biome-overlay').setDepth(-28);
    this.drawRoundHeat(level, width, height);
  }

  destroy(): void {
    this.base?.destroy();
    this.warmth?.destroy();
    this.overlay?.destroy();
    this.base = undefined;
    this.warmth = undefined;
    this.overlay = undefined;
  }

  private drawRoundHeat(level: LevelConfig, width: number, height: number): void {
    if (!this.overlay) return;
    const progress = Phaser.Math.Clamp((level.unlockIndex - 1) / 9, 0, 1);
    this.overlay.fillStyle(0x6e1208, 0.035 + progress * 0.12);
    this.overlay.fillRect(0, 0, width, height);
    this.overlay.fillGradientStyle(
      0x2b0602,
      0x2b0602,
      0xff2a00,
      0xff2a00,
      0,
      0,
      0.1 + progress * 0.22,
      0.08 + progress * 0.18,
    );
    this.overlay.fillRect(0, height * 0.38, width, height * 0.62);
  }
}
