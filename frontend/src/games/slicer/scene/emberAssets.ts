import type { BiomeName, LevelConfig } from '../engine/types';

export const EMBER_ASSET_KEYS = {
  frameDefault: 'ember-frame-default',
  frameMastered: 'ember-frame-mastered',
  bombIdle: 'ember-bomb-idle',
  particleEmber: 'ember-particle-ember',
  particleSpark: 'ember-particle-spark',
  particleSmoke: 'ember-particle-smoke',
  particleSoot: 'ember-particle-soot',
  sliceTrailBrush: 'ember-slice-trail-brush',
  cardCutSheet: 'ember-card-cut-sheet',
  sparkBurstSheet: 'ember-spark-burst-sheet',
  bombExplosionSheet: 'ember-bomb-explosion-sheet',
} as const;

export const EMBER_CARD_FRAME = {
  width: 640,
  height: 360,
  contentX: 72,
  contentY: 58,
  contentWidth: 496,
  contentHeight: 244,
} as const;

const FX_ASSETS: Array<[string, string]> = [
  [EMBER_ASSET_KEYS.frameDefault, '/games/slicer/cards/frame-default.png'],
  [EMBER_ASSET_KEYS.frameMastered, '/games/slicer/cards/frame-mastered.png'],
  [EMBER_ASSET_KEYS.bombIdle, '/games/slicer/cards/bomb-idle.png'],
  [EMBER_ASSET_KEYS.particleEmber, '/games/slicer/fx/particle-ember.png'],
  [EMBER_ASSET_KEYS.particleSpark, '/games/slicer/fx/particle-spark.png'],
  [EMBER_ASSET_KEYS.particleSmoke, '/games/slicer/fx/particle-smoke.png'],
  [EMBER_ASSET_KEYS.particleSoot, '/games/slicer/fx/particle-soot.png'],
  [EMBER_ASSET_KEYS.sliceTrailBrush, '/games/slicer/fx/slice-trail-brush.png'],
  [EMBER_ASSET_KEYS.cardCutSheet, '/games/slicer/fx/card-cut-sheet.png'],
  [EMBER_ASSET_KEYS.sparkBurstSheet, '/games/slicer/fx/spark-burst-sheet.png'],
  [EMBER_ASSET_KEYS.bombExplosionSheet, '/games/slicer/fx/bomb-explosion-sheet.png'],
];

export type BiomeSignature = {
  name: BiomeName;
  overlayKind:
    | 'mist-veil'
    | 'diagonal-rain'
    | 'shimmer-band'
    | 'charred-wood'
    | 'red-violet-vignette'
    | 'gold-facets'
    | 'ember-glow'
    | 'smoke-layers'
    | 'golden-hour'
    | 'dream-blur';
  emitterAccent: 'none' | 'spark-rain' | 'gold-glints' | 'dense-embers' | 'charcoal-smoke';
  backgroundBlur: number;
};

const BIOME_SIGNATURES: Record<BiomeName, BiomeSignature> = {
  stillwater: { name: 'stillwater', overlayKind: 'mist-veil', emitterAccent: 'none', backgroundBlur: 0 },
  rainfall: { name: 'rainfall', overlayKind: 'diagonal-rain', emitterAccent: 'spark-rain', backgroundBlur: 0 },
  aurora: { name: 'aurora', overlayKind: 'shimmer-band', emitterAccent: 'gold-glints', backgroundBlur: 0 },
  driftwood: { name: 'driftwood', overlayKind: 'charred-wood', emitterAccent: 'none', backgroundBlur: 0 },
  tideline: { name: 'tideline', overlayKind: 'red-violet-vignette', emitterAccent: 'none', backgroundBlur: 0 },
  geode: { name: 'geode', overlayKind: 'gold-facets', emitterAccent: 'gold-glints', backgroundBlur: 0 },
  embers: { name: 'embers', overlayKind: 'ember-glow', emitterAccent: 'dense-embers', backgroundBlur: 0 },
  mistwood: { name: 'mistwood', overlayKind: 'smoke-layers', emitterAccent: 'charcoal-smoke', backgroundBlur: 0 },
  solstice: { name: 'solstice', overlayKind: 'golden-hour', emitterAccent: 'gold-glints', backgroundBlur: 0 },
  reverie: { name: 'reverie', overlayKind: 'dream-blur', emitterAccent: 'charcoal-smoke', backgroundBlur: 2 },
};

const LEVEL_FX: Record<BiomeName, { ambientDensity: number; blur: number; diagonalSpark?: boolean; smoke?: boolean }> = {
  stillwater: { ambientDensity: 18, blur: 0.2 },
  rainfall: { ambientDensity: 58, blur: 0.35, diagonalSpark: true },
  aurora: { ambientDensity: 48, blur: 0.45 },
  driftwood: { ambientDensity: 42, blur: 0.3 },
  tideline: { ambientDensity: 54, blur: 0.35 },
  geode: { ambientDensity: 62, blur: 0.25 },
  embers: { ambientDensity: 170, blur: 0.15 },
  mistwood: { ambientDensity: 76, blur: 0.7, smoke: true },
  solstice: { ambientDensity: 96, blur: 0.25 },
  reverie: { ambientDensity: 82, blur: 2, smoke: true },
};

export function listEmberPreloadAssets(): Array<[string, string]> {
  return [...FX_ASSETS];
}

export function getBiomeSignature(biome: BiomeName): BiomeSignature {
  return BIOME_SIGNATURES[biome];
}

export type EmberFxConfig = {
  ambientDensity: number;
  emberFrequency: number;
  sparkFrequency: number;
  blur: number;
  diagonalSpark: boolean;
  smoke: boolean;
  signature: BiomeSignature;
};

export type AmbientParticleTier = {
  name: 'far' | 'mid' | 'near';
  maxParticles: number;
  frequency: number;
  scale: { min: number; max: number };
  alpha: { min: number; max: number };
  speed: { min: number; max: number };
  blurred: boolean;
};

export function getEmberFxConfig(level: LevelConfig, reducedMotion: boolean): EmberFxConfig {
  const config = LEVEL_FX[level.biome];
  const density = reducedMotion ? Math.max(8, Math.round(config.ambientDensity * 0.25)) : config.ambientDensity;
  return {
    ambientDensity: density,
    emberFrequency: Math.max(45, Math.round(9000 / density)),
    sparkFrequency: Math.max(450, Math.round(90000 / density)),
    blur: config.blur,
    diagonalSpark: Boolean(config.diagonalSpark),
    smoke: Boolean(config.smoke),
    signature: getBiomeSignature(level.biome),
  };
}

export function getAmbientParticleTiers(config: EmberFxConfig): AmbientParticleTier[] {
  const cappedDensity = Math.min(200, config.ambientDensity);
  const far = Math.max(1, Math.round(cappedDensity * 0.42));
  const mid = Math.max(1, Math.round(cappedDensity * 0.36));
  const near = Math.max(1, cappedDensity - far - mid);
  return [
    {
      name: 'far',
      maxParticles: far,
      frequency: Math.max(180, Math.round(18000 / far)),
      scale: { min: 0.2, max: 0.4 },
      alpha: { min: 0.3, max: 0.5 },
      speed: { min: 10, max: 25 },
      blurred: true,
    },
    {
      name: 'mid',
      maxParticles: mid,
      frequency: Math.max(120, Math.round(12000 / mid)),
      scale: { min: 0.4, max: 0.7 },
      alpha: { min: 0.5, max: 0.8 },
      speed: { min: 25, max: 50 },
      blurred: false,
    },
    {
      name: 'near',
      maxParticles: near,
      frequency: Math.max(90, Math.round(8000 / near)),
      scale: { min: 0.7, max: 1.2 },
      alpha: { min: 0.7, max: 1 },
      speed: { min: 50, max: 90 },
      blurred: false,
    },
  ];
}
