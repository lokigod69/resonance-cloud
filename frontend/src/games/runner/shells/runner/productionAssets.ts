import Phaser from 'phaser';

const backgroundModules = import.meta.glob('../../assets/production/backgrounds/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const cardModules = import.meta.glob('../../assets/production/cards/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const characterModules = import.meta.glob('../../assets/production/character/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const particleModules = import.meta.glob('../../assets/production/particles/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const audioModules = import.meta.glob('../../assets/production/audio/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

type AssetEntry = {
  key: string;
  path: string;
  url: string;
};

function normalize(path: string): string {
  return path.replace(/\\/g, '/');
}

function basename(path: string): string {
  return normalize(path).split('/').at(-1) ?? path;
}

function entriesFromModules(modules: Record<string, unknown>, prefix: string): AssetEntry[] {
  return Object.entries(modules).map(([path, value]) => {
    const name = basename(path).replace(/\.[^.]+$/, '');
    return {
      key: `${prefix}-${name}`,
      path: normalize(path),
      url: value as string,
    };
  });
}

export const productionBackgrounds = entriesFromModules(backgroundModules, 'prod-bg');
export const productionAudio = entriesFromModules(audioModules, 'prod-audio');
export const productionParticles = entriesFromModules(particleModules, 'prod-particle');
export const productionCharacter = entriesFromModules(characterModules, 'prod-character');
export const productionCards = entriesFromModules(cardModules, 'prod-card').filter(
  (entry) => !entry.path.endsWith('/card-frame.png'),
);

export const cardFrame = entriesFromModules(cardModules, 'prod-card').find((entry) =>
  entry.path.endsWith('/card-frame.png'),
);

export const spiritSheet = productionCharacter.find((entry) =>
  entry.path.endsWith('/spirit-sheet.png'),
);
export const spiritStill = productionCharacter.find((entry) =>
  entry.path.endsWith('/spirit.png'),
);

export function resolveProductionAssetKey(path: string, entries: AssetEntry[], fallback?: AssetEntry): string {
  const file = basename(path);
  const match = entries.find((entry) => basename(entry.path) === file || entry.path.endsWith(path));
  if (!match) {
    if (fallback) {
      return fallback.key;
    }
    throw new Error(`Missing production asset: ${path}`);
  }
  return match.key;
}

export function resolveProductionAssetUrl(path: string, entries: AssetEntry[]): string | undefined {
  const file = basename(path);
  return entries.find((entry) => basename(entry.path) === file || entry.path.endsWith(path))?.url;
}

export function loadProductionAssets(scene: Phaser.Scene): void {
  productionBackgrounds.forEach((entry) => scene.load.image(entry.key, entry.url));
  productionCards.forEach((entry) => scene.load.image(entry.key, entry.url));
  productionParticles.forEach((entry) => scene.load.image(entry.key, entry.url));
  if (cardFrame) scene.load.image(cardFrame.key, cardFrame.url);
  if (spiritSheet) {
    scene.load.spritesheet(spiritSheet.key, spiritSheet.url, {
      frameWidth: 256,
      frameHeight: 256,
      margin: 0,
      spacing: 0,
    });
  }
  if (spiritStill) scene.load.image(spiritStill.key, spiritStill.url);
}

export function cardArtKeyForIndex(index: number): string {
  if (productionCards.length === 0) {
    throw new Error('No production cards found in assets/production/cards.');
  }
  return productionCards[index % productionCards.length].key;
}

export function cardArtUrlForIndex(index: number): string {
  if (productionCards.length === 0) {
    throw new Error('No production cards found in assets/production/cards.');
  }
  return productionCards[index % productionCards.length].url;
}

export function cardFrameUrl(): string | undefined {
  return cardFrame?.url;
}

export const productionParticleKeys = {
  snowflake: productionParticles.find((entry) => entry.path.endsWith('/snowflake.png'))?.key,
  breathRing: productionParticles.find((entry) => entry.path.endsWith('/breath-ring.png'))?.key,
  mistPuff: productionParticles.find((entry) => entry.path.endsWith('/mist-puff.png'))?.key,
};

export type { AssetEntry };
