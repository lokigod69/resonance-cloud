import Phaser from 'phaser';

export function createPostOverlay(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const overlay = scene.add.graphics();
  overlay.setDepth(200);
  overlay.setScrollFactor(0);
  return overlay;
}

export function paintPostOverlay(
  overlay: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  missFlash: number,
): void {
  overlay.clear();
  overlay.fillStyle(0xffffff, 0.018);
  for (let y = 0; y < height; y += 4) {
    overlay.fillRect(0, y, width, 1);
  }
  overlay.fillStyle(0x000000, 0.22);
  overlay.fillRect(0, 0, width, height * 0.06);
  overlay.fillRect(0, height * 0.94, width, height * 0.06);
  overlay.fillStyle(0x000000, 0.12);
  overlay.fillRect(0, 0, width * 0.04, height);
  overlay.fillRect(width * 0.96, 0, width * 0.04, height);
  if (missFlash > 0) {
    overlay.fillStyle(0x020508, missFlash * 0.55);
    overlay.fillRect(0, 0, width, height);
  }
}
