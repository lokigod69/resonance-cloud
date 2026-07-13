import Phaser from 'phaser'
import { horizonCurve, horizonY, type SurfViewport } from './perspective'
import type { SurfPalette } from './palettes'

type WaterBand = {
  sprite: Phaser.GameObjects.TileSprite
  baseY: number
  speed: number
  phase: number
}

type OceanVisuals = {
  sky: Phaser.GameObjects.Image
  horizon: Phaser.GameObjects.Graphics
  bands: WaterBand[]
  textureKeys: string[]
}

let oceanTextureId = 0

export class OceanLayer {
  private readonly scene: Phaser.Scene
  private visuals: OceanVisuals
  /** Outgoing visual sets still crossfading — must be disposed on destroy(). */
  private retiring: OceanVisuals[] = []
  private palette: SurfPalette
  private reducedMotion = false
  private elapsedMs = 0

  constructor(scene: Phaser.Scene, palette: SurfPalette) {
    this.scene = scene
    this.palette = palette
    this.visuals = this.buildVisuals(palette)
  }

  setPalette(palette: SurfPalette, durationMs: number): void {
    this.palette = palette
    const previous = this.visuals
    this.visuals = this.buildVisuals(palette)
    // New visuals render above the old ones (same depth, later in the display
    // list), so crossfade by fading the NEW set in from 0 to each element's
    // target alpha — fading the old set out would be invisible behind them.
    const incoming: Array<{
      target: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics | Phaser.GameObjects.TileSprite
      alpha: number
    }> = [
      { target: this.visuals.sky, alpha: 1 },
      { target: this.visuals.horizon, alpha: 1 },
      ...this.visuals.bands.map((band) => ({ target: band.sprite, alpha: band.sprite.alpha })),
    ]
    incoming.forEach(({ target }) => target.setAlpha(0))
    incoming.forEach(({ target, alpha }) => {
      this.scene.tweens.add({ targets: target, alpha, duration: durationMs })
    })
    this.retiring.push(previous)
    this.scene.tweens.add({
      targets: previous.sky,
      alpha: 0,
      duration: durationMs,
      onComplete: () => {
        this.retiring = this.retiring.filter((set) => set !== previous)
        this.destroyVisuals(previous)
      },
    })
  }

  resize(): void {
    this.destroyVisuals(this.visuals)
    this.visuals = this.buildVisuals(this.palette)
  }

  update(delta: number, speedFactor: number): void {
    this.elapsedMs += delta
    const motion = this.reducedMotion ? 0.5 : 1
    for (const band of this.visuals.bands) {
      band.sprite.tilePositionX += delta * band.speed * speedFactor * motion
      band.sprite.y = band.baseY + (this.reducedMotion ? 0 : Math.sin(this.elapsedMs / 900 + band.phase) * 3)
    }
  }

  setReducedMotion(on: boolean): void {
    this.reducedMotion = on
  }

  destroy(): void {
    this.retiring.forEach((set) => this.destroyVisuals(set))
    this.retiring = []
    this.destroyVisuals(this.visuals)
  }

  private buildVisuals(palette: SurfPalette): OceanVisuals {
    const viewport = this.viewport()
    const id = oceanTextureId += 1
    const skyKey = `surf-sky-${id}`
    const textureKeys = [skyKey]
    this.addSkyTexture(skyKey, viewport, palette)
    const sky = this.scene.add.image(viewport.width / 2, viewport.height / 2, skyKey)
      .setDisplaySize(viewport.width, viewport.height)
      .setDepth(-30)

    const horizon = this.drawHorizon(viewport, palette).setDepth(-20)
    const bands = [0, 1, 2].map((index) => {
      const key = `surf-water-${id}-${index}`
      textureKeys.push(key)
      this.addWaterTexture(key, index, palette)
      const height = viewport.height * (0.23 + index * 0.045)
      const baseY = horizonY(viewport) + viewport.height * (0.14 + index * 0.16)
      const sprite = this.scene.add.tileSprite(viewport.width / 2, baseY, viewport.width + 40, height, key)
        .setDepth(-15 + index)
        .setAlpha(0.78 - index * 0.1)
      return { sprite, baseY, speed: 0.012 + index * 0.009, phase: index * 1.4 }
    })
    return { sky, horizon, bands, textureKeys }
  }

  private addSkyTexture(key: string, viewport: SurfViewport, palette: SurfPalette): void {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(2, Math.round(viewport.width))
    canvas.height = Math.max(2, Math.round(viewport.height))
    const context = canvas.getContext('2d')
    if (!context) return
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, colorHex(palette.skyTop))
    gradient.addColorStop(0.62, colorHex(palette.skyBottom))
    gradient.addColorStop(1, colorHex(palette.waterDeep))
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)
    this.scene.textures.addCanvas(key, canvas)
  }

  private addWaterTexture(key: string, index: number, palette: SurfPalette): void {
    const canvas = document.createElement('canvas')
    canvas.width = 720
    canvas.height = 180
    const context = canvas.getContext('2d')
    if (!context) return
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, colorHex(palette.waterCrest))
    gradient.addColorStop(0.28, colorHex(palette.waterDeep))
    gradient.addColorStop(1, colorHex(palette.waterDeep))
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = colorHex(palette.waterCrest)
    context.globalAlpha = 0.75
    context.lineWidth = 3 + index
    context.beginPath()
    for (let x = 0; x <= canvas.width; x += 6) {
      const y = 16 + Math.sin((x / canvas.width) * Math.PI * 4 + index) * (5 + index * 2)
      if (x === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    }
    context.stroke()
    this.scene.textures.addCanvas(key, canvas)
  }

  private drawHorizon(viewport: SurfViewport, palette: SurfPalette): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics()
    const center = horizonY(viewport)
    graphics.fillStyle(palette.horizonGlow, 0.14)
    graphics.beginPath()
    graphics.moveTo(0, center + horizonCurve(0, viewport) - 10)
    for (let x = 0; x <= viewport.width; x += 12) {
      graphics.lineTo(x, center - horizonCurve(x, viewport) - 10)
    }
    graphics.lineTo(viewport.width, center + 34)
    graphics.lineTo(0, center + 34)
    graphics.closePath()
    graphics.fillPath()
    graphics.lineStyle(2, palette.horizonGlow, 0.5)
    graphics.beginPath()
    for (let x = 0; x <= viewport.width; x += 12) {
      const y = center - horizonCurve(x, viewport)
      if (x === 0) graphics.moveTo(x, y)
      else graphics.lineTo(x, y)
    }
    graphics.strokePath()
    return graphics
  }

  private destroyVisuals(visuals: OceanVisuals): void {
    visuals.sky.destroy()
    visuals.horizon.destroy()
    visuals.bands.forEach((band) => band.sprite.destroy())
    visuals.textureKeys.forEach((key) => this.scene.textures.remove(key))
  }

  private viewport(): SurfViewport {
    return { width: this.scene.scale.width, height: this.scene.scale.height }
  }
}

function colorHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}
