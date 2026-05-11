import Phaser from 'phaser';
import type { LevelConfig } from '../../engine';
import {
  productionBackgrounds,
  productionParticleKeys,
  resolveProductionAssetKey,
} from './productionAssets';
import { laneEdgeX } from './perspective';

type ParticleRecord = {
  image: Phaser.GameObjects.Image;
  speed: number;
  drift: number;
  kind: 'snow' | 'mist' | 'rain' | 'crystal';
};

export class BiomeRenderer {
  private background!: Phaser.GameObjects.Image;
  private graphics!: Phaser.GameObjects.Graphics;
  private foregroundMist!: Phaser.GameObjects.TileSprite;
  private particles: ParticleRecord[] = [];
  private levelId = '';
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(level: LevelConfig): void {
    const backgroundKey = resolveProductionAssetKey(
      level.backgroundPlate,
      productionBackgrounds,
      productionBackgrounds[0],
    );
    this.background = this.scene.add.image(0, 0, backgroundKey);
    this.background.setOrigin(0.5);
    this.background.setDepth(-40);
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(-12);
    this.foregroundMist = this.scene.add.tileSprite(
      0,
      0,
      this.scene.scale.width,
      this.scene.scale.height,
      productionParticleKeys.mistPuff ?? '',
    );
    this.foregroundMist.setDepth(-8);
    this.foregroundMist.setAlpha(0.05);
    this.foregroundMist.setBlendMode(Phaser.BlendModes.SCREEN);
    this.applyLevel(level, true);
  }

  applyLevel(level: LevelConfig, force = false): void {
    if (!force && this.levelId === level.id) return;
    this.levelId = level.id;
    const backgroundKey = resolveProductionAssetKey(
      level.backgroundPlate,
      productionBackgrounds,
      productionBackgrounds[0],
    );
    this.background.setTexture(backgroundKey);
    this.particles.forEach((particle) => particle.image.destroy());
    this.particles = [];

    const snowCount = Math.round(90 * level.particleConfig.snowDensity);
    const mistCount = Math.round(10 * level.particleConfig.mistOpacity);
    const rainCount = Math.round(70 * (level.particleConfig.rainDensity ?? 0));
    const crystalCount = Math.round(48 * (level.particleConfig.crystalDensity ?? 0));
    this.spawnParticleBatch('snow', snowCount);
    this.spawnParticleBatch('mist', mistCount);
    this.spawnParticleBatch('rain', rainCount);
    this.spawnParticleBatch('crystal', crystalCount);
    this.foregroundMist.setAlpha(Math.min(0.12, level.particleConfig.mistOpacity * 0.12));
  }

  private spawnParticleBatch(kind: ParticleRecord['kind'], count: number): void {
    const key =
      kind === 'snow'
        ? productionParticleKeys.snowflake
        : kind === 'mist'
          ? productionParticleKeys.mistPuff
          : productionParticleKeys.snowflake;
    if (!key) return;
    for (let index = 0; index < count; index += 1) {
      const image = this.scene.add.image(
        Math.random() * this.scene.scale.width,
        Math.random() * this.scene.scale.height,
        key,
      );
      image.setDepth(kind === 'mist' ? 6 : 10);
      image.setAlpha(kind === 'mist' ? 0.025 + Math.random() * 0.045 : 0.18 + Math.random() * 0.28);
      image.setBlendMode(Phaser.BlendModes.SCREEN);
      image.setScale(kind === 'mist' ? 0.7 + Math.random() * 1.2 : 0.16 + Math.random() * 0.5);
      this.particles.push({
        image,
        speed: kind === 'rain' ? 2.4 + Math.random() * 3 : 0.22 + Math.random() * 1.4,
        drift: Math.random() * Math.PI * 2,
        kind,
      });
    }
  }

  update(level: LevelConfig, time: number): void {
    this.applyLevel(level);
    const { width, height } = this.scene.scale;
    this.scaleBackground(width, height);
    this.graphics.clear();
    this.paintLanes(level, time, width, height);
    this.foregroundMist.setSize(width, height);
    this.foregroundMist.setPosition(width / 2, height / 2);
    this.foregroundMist.tilePositionX += 0.18;
    this.foregroundMist.tilePositionY += 0.03;
    this.particles.forEach((particle) => {
      particle.drift += 0.012;
      const diagonal = particle.kind === 'rain' ? -1.6 : 0.22;
      particle.image.x += Math.sin(particle.drift) * 0.22 + diagonal;
      particle.image.y += particle.speed;
      particle.image.rotation += particle.kind === 'snow' ? 0.006 : 0;
      if (particle.image.y > height + 60) particle.image.y = -60;
      if (particle.image.x < -80) particle.image.x = width + 40;
      if (particle.image.x > width + 80) particle.image.x = -40;
    });
  }

  private scaleBackground(width: number, height: number): void {
    this.background.setPosition(width / 2, height / 2);
    const scale = Math.max(width / this.background.width, height / this.background.height);
    this.background.setScale(scale);
  }

  private paintLanes(level: LevelConfig, time: number, width: number, height: number): void {
    const horizonY = height * 0.35;
    const floorY = height * 0.96;
    const laneColor = Phaser.Display.Color.HexStringToColor(level.laneTint).color;

    this.graphics.fillStyle(laneColor, 0.04);
    this.graphics.beginPath();
    this.graphics.moveTo(width / 2, horizonY);
    this.graphics.lineTo(laneEdgeX(3, 1, width, level, time), floorY);
    this.graphics.lineTo(laneEdgeX(0, 1, width, level, time), floorY);
    this.graphics.closePath();
    this.graphics.fillPath();

    [0, 1, 2, 3].forEach((edge) => {
      const isOuterEdge = edge === 0 || edge === 3;
      this.graphics.lineStyle(isOuterEdge ? 1.5 : 1.5, laneColor, isOuterEdge ? 0.12 : 0.3);
      this.graphics.beginPath();
      for (let step = 0; step <= 32; step += 1) {
        const progress = step / 32;
        const y = horizonY + (floorY - horizonY) * Math.pow(progress, 1.12);
        const x = laneEdgeX(edge, progress, width, level, time);
        if (step === 0) {
          this.graphics.moveTo(x, y);
        } else {
          this.graphics.lineTo(x, y);
        }
      }
      this.graphics.strokePath();
    });

    this.graphics.lineStyle(1, laneColor, 0.08);
    for (let i = 0; i < 18; i += 1) {
      const progress = i / 18;
      const y = horizonY + (floorY - horizonY) * Math.pow(progress, 1.12);
      this.graphics.lineBetween(
        laneEdgeX(0, progress, width, level, time),
        y,
        laneEdgeX(3, progress, width, level, time),
        y,
      );
    }
  }
}
