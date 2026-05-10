import Phaser from 'phaser';
import type { LevelConfig } from '../engine/types';
import { getBiomeSignature, type EmberFxConfig } from './emberAssets';

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
  private shimmerTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  redraw(level: LevelConfig, config: EmberFxConfig): void {
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
    this.drawBiomeOverlay(level.biome, width, height, config);
  }

  destroy(): void {
    this.shimmerTween?.stop();
    this.shimmerTween = undefined;
    this.base?.destroy();
    this.warmth?.destroy();
    this.overlay?.destroy();
    this.base = undefined;
    this.warmth = undefined;
    this.overlay = undefined;
  }

  private drawBiomeOverlay(_biome: string, width: number, height: number, config: EmberFxConfig): void {
    if (!this.overlay) return;
    const signature = getBiomeSignature(config.signature.name);

    if (signature.name === 'stillwater') {
      this.overlay.fillGradientStyle(0xff6b35, 0xff6b35, 0xffd7a0, 0xffd7a0, 0, 0, 0.09, 0.04);
      this.overlay.fillRect(0, height * 0.68, width, height * 0.2);
      this.overlay.fillStyle(0x120905, 0.18);
      this.overlay.fillRect(0, height * 0.82, width, height * 0.18);
    }

    if (signature.name === 'rainfall') {
      this.overlay.lineStyle(1, 0xff6b35, 0.18);
      for (let x = -width * 0.2; x < width * 1.2; x += width * 0.045) {
        this.overlay.lineBetween(x, 0, x - width * 0.055, height * 0.62);
      }
    }

    if (signature.name === 'aurora') {
      this.overlay.fillGradientStyle(0xff6b35, 0xffd700, 0xff6b35, 0xffd700, 0, 0, 0.24, 0);
      this.overlay.fillRect(-width * 0.08, height * 0.29, width * 1.16, Math.max(44, height * 0.09));
      this.overlay.lineStyle(4, 0xffd700, 0.18);
      for (let index = 0; index < 4; index += 1) {
        const y = height * (0.29 + index * 0.022);
        this.overlay.beginPath();
        this.overlay.moveTo(-80, y);
        for (let x = -80; x <= width + 80; x += 180) {
          this.overlay.lineTo(x + 90, y + Math.sin(index + x * 0.01) * 20);
        }
        this.overlay.strokePath();
      }
      this.shimmerTween = this.scene.tweens.add({
        targets: this.overlay,
        alpha: { from: 0.28, to: 0.62 },
        duration: 3600,
        yoyo: true,
        repeat: -1,
      });
    }

    if (signature.name === 'driftwood') {
      this.overlay.fillStyle(0x020101, 0.72);
      for (let x = -110; x < width + 120; x += 160) {
        const h = height * (0.13 + ((x / 160) % 3) * 0.025);
        this.overlay.fillTriangle(x, height, x + 130, height, x + 72, height - h);
        this.overlay.lineStyle(4, 0x8f2f10, 0.36);
        this.overlay.lineBetween(x + 22, height - 14, x + 82, height - h + 22);
      }
    }

    if (signature.name === 'tideline') {
      this.overlay.lineStyle(Math.max(90, Math.round(width * 0.07)), 0x5b1025, 0.3);
      this.overlay.strokeRect(width * 0.015, height * 0.015, width * 0.97, height * 0.97);
      this.overlay.fillGradientStyle(0x5b1025, 0x1a0704, 0x5b1025, 0x1a0704, 0.22, 0, 0.12, 0);
      this.overlay.fillRect(0, 0, width, height);
    }

    if (signature.name === 'geode') {
      this.overlay.lineStyle(2, 0xffd700, 0.2);
      for (let index = 0; index < 14; index += 1) {
        const x = width * (0.06 + (index % 7) * 0.145);
        const y = height * (0.13 + Math.floor(index / 7) * 0.37 + (index % 3) * 0.035);
        this.drawFacet(x, y, 58 + (index % 4) * 18);
      }
    }

    if (signature.name === 'embers') {
      this.overlay.fillGradientStyle(0xff4500, 0xffd700, 0xff4500, 0xffd700, 0.04, 0.1, 0.28, 0.36);
      this.overlay.fillRect(0, height * 0.35, width, height * 0.65);
    }

    if (signature.name === 'mistwood') {
      this.overlay.fillStyle(0x050302, 0.22);
      for (let index = 0; index < 5; index += 1) {
        this.overlay.fillRect(width * (0.07 + index * 0.19), 0, width * 0.04, height);
      }
      this.overlay.fillGradientStyle(0x2b140b, 0x2b140b, 0xff6b35, 0xff6b35, 0.28, 0.28, 0.1, 0.02);
      this.overlay.fillRect(0, height * 0.12, width, height * 0.64);
    }

    if (signature.name === 'solstice') {
      this.overlay.fillGradientStyle(0xffd700, 0xffa42a, 0xff6b35, 0xffd700, 0.22, 0.08, 0.12, 0.3);
      this.overlay.fillRect(width * 0.38, 0, width * 0.62, height);
    }

    if (signature.name === 'reverie' || config.blur >= 1.5) {
      this.overlay.fillStyle(0xff6b35, 0.08);
      this.overlay.fillRect(0, 0, width, height);
      this.addBackgroundBlur(2);
    }
  }

  private drawFacet(x: number, y: number, size: number): void {
    if (!this.overlay) return;
    this.overlay.strokeTriangle(x, y, x + size, y + size * 0.28, x + size * 0.2, y + size);
    this.overlay.lineBetween(x + size * 0.2, y + size, x + size * 0.7, y + size * 0.55);
  }

  private addBackgroundBlur(strength: number): void {
    const targets = [this.base, this.warmth, this.overlay];
    targets.forEach((target) => {
      const filterTarget = target as unknown as {
        filters?: { external?: { addBlur?: (quality?: number, x?: number, y?: number, strength?: number) => unknown } };
      };
      filterTarget?.filters?.external?.addBlur?.(1, strength, strength, strength);
    });
  }
}
