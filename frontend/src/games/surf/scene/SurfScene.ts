import Phaser from 'phaser'
import type { LaneIndex, ResolveResult, SessionEngine, SessionStats, WaveSpec } from '../engine/types'
import { OceanLayer } from './ocean'
import { paletteForLevel } from './palettes'
import { project, type SurfViewport } from './perspective'
import { SurfSfx } from './audio'
import { ensureSignTexture, releaseSignTextures } from './signTexture'

type SurfSceneCallbacks = {
  onWave: (wave: WaveSpec) => void
  onResolve: (result: ResolveResult) => void
  onHud: (hud: { score: number; combo: number; lives: number; level: number }) => void
  onSessionComplete: (stats: SessionStats) => void
}

type SurfSceneData = {
  engine: SessionEngine
  sfx: SurfSfx
  callbacks: SurfSceneCallbacks
}

type ActiveSign = {
  lane: LaneIndex
  isCorrect: boolean
  image: Phaser.GameObjects.Image
}

export class SurfScene extends Phaser.Scene {
  private engine!: SessionEngine
  private sfx!: SurfSfx
  private callbacks!: SurfSceneCallbacks
  private ocean?: OceanLayer
  private avatar?: Phaser.GameObjects.Image
  private wake?: Phaser.GameObjects.Particles.ParticleEmitter
  private activeWave: WaveSpec | null = null
  private signs: ActiveSign[] = []
  private selectedLane: LaneIndex = 1
  private waveElapsedMs = 0
  private parked = false
  private resolving = false
  private paused = false
  private manualPaused = false
  private reducedMotion = false
  private complete = false
  private wakeElapsedMs = 0
  private mediaQuery?: MediaQueryList
  private unsubscribeEngine?: () => void
  private completeNotified = false

  constructor() {
    super('surf')
  }

  init(data: SurfSceneData): void {
    this.activeWave = null
    this.signs = []
    this.selectedLane = 1
    this.waveElapsedMs = 0
    this.parked = false
    this.resolving = false
    this.paused = false
    this.manualPaused = false
    this.complete = false
    this.completeNotified = false
    this.wakeElapsedMs = 0
    this.engine = data.engine
    this.sfx = data.sfx
    this.callbacks = data.callbacks
  }

  create(): void {
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    this.ocean = new OceanLayer(this, paletteForLevel(this.engine.level))
    this.ocean.setReducedMotion(this.reducedMotion)
    this.createAvatarTextures()
    this.createAvatar()
    this.bindInput()
    this.bindEnvironment()
    this.unsubscribeEngine = this.engine.on((event) => {
      if (event.type === 'level_up') {
        this.ocean?.setPalette(paletteForLevel(event.level), 1500)
        this.sfx.play('levelup', 0.72)
      }
      if (event.type === 'session_complete') this.handleSessionComplete(event.stats)
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this)
    this.emitHud()
    this.spawnWave()
  }

  update(_time: number, delta: number): void {
    if (this.paused) return
    const speedFactor = Math.min(2, 1 + this.engine.level * 0.15) * (this.engine.combo >= 5 ? 1.6 : 1)
    this.ocean?.update(delta, speedFactor)
    this.updateWake(delta)
    if (!this.activeWave || this.resolving || this.complete) return

    this.waveElapsedMs += delta
    const rawProgress = this.waveElapsedMs / this.activeWave.travelMs
    if (this.engine.config.mode === 'cruise') {
      const progress = Math.min(0.86, rawProgress)
      this.positionSigns(progress)
      if (rawProgress >= 0.86) this.parked = true
      return
    }

    this.positionSigns(Math.min(1.1, rawProgress))
    if (rawProgress >= 1) this.commitLane(this.selectedLane)
  }

  /** Pause requested by the player (HUD/ESC) — visibility changes must not undo it. */
  pause(): void {
    this.manualPaused = true
    this.applyPause()
  }

  resume(): void {
    this.manualPaused = false
    if (!document.hidden) this.applyResume()
  }

  private applyPause(): void {
    if (this.paused) return
    this.paused = true
    this.time.paused = true
    this.tweens.pauseAll()
  }

  private applyResume(): void {
    if (!this.paused) return
    this.paused = false
    this.time.paused = false
    this.tweens.resumeAll()
  }

  private bindInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      void this.sfx.unlock()
      const lane = Math.min(2, Math.max(0, Math.floor((pointer.x / Math.max(1, this.scale.width)) * 3))) as LaneIndex
      this.moveAvatar(lane)
      if (this.engine.config.mode === 'cruise') this.commitLane(lane)
    })
    this.input.keyboard?.on('keydown-LEFT', () => this.moveAvatar(Math.max(0, this.selectedLane - 1) as LaneIndex))
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveAvatar(Math.min(2, this.selectedLane + 1) as LaneIndex))
    this.input.keyboard?.on('keydown-SPACE', () => this.commitLane(this.selectedLane))
    this.input.keyboard?.on('keydown-ENTER', () => this.commitLane(this.selectedLane))
    this.scale.on('resize', this.resizeScene, this)
  }

  private bindEnvironment(): void {
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    this.mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    this.mediaQuery?.addEventListener?.('change', this.onReducedMotionChange)
  }

  private createAvatarTextures(): void {
    if (!this.textures.exists('surf-avatar')) {
      const graphics = this.add.graphics()
      graphics.fillStyle(0xf7c843, 0.28).fillCircle(72, 55, 43)
      graphics.fillStyle(0xf7c843, 1).fillCircle(72, 55, 29)
      graphics.fillStyle(0xf24f13, 1).fillCircle(72, 55, 21)
      graphics.fillStyle(0xf7c843, 1).fillEllipse(72, 108, 118, 26)
      graphics.fillStyle(0x101b38, 1).fillEllipse(72, 104, 100, 14)
      graphics.generateTexture('surf-avatar', 144, 126)
      graphics.destroy()
    }
    if (!this.textures.exists('surf-wake')) {
      const graphics = this.add.graphics()
      graphics.fillStyle(0xffffff, 1).fillCircle(8, 8, 8)
      graphics.generateTexture('surf-wake', 16, 16)
      graphics.destroy()
    }
  }

  private createAvatar(): void {
    const viewport = this.viewport()
    const point = project(this.selectedLane, 0.95, viewport)
    this.avatar = this.add.image(point.x, viewport.height * 0.86, 'surf-avatar').setDepth(20).setScale(0.72)
    this.wake = this.add.particles(0, 0, 'surf-wake', {
      emitting: false,
      lifespan: 700,
      speed: { min: 16, max: 52 },
      angle: { min: 150, max: 210 },
      scale: { start: 0.34, end: 0.03 },
      alpha: { start: 0.56, end: 0 },
      tint: [0xf7c843, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(19)
  }

  private spawnWave(): void {
    if (this.complete || this.engine.complete) return
    const wave = this.engine.nextWave()
    if (!wave) return
    this.activeWave = wave
    this.waveElapsedMs = 0
    this.parked = false
    this.resolving = false
    this.clearSigns()
    this.signs = wave.cards.map((card) => {
      const key = ensureSignTexture(this, `surf-sign-${card.card.id}`, card.card.term)
      const image = this.add.image(0, 0, key).setDepth(10).setScale(0.22 * this.signTextureScale())
      return { lane: card.lane, isCorrect: card.isCorrect, image }
    })
    this.positionSigns(0)
    this.callbacks.onWave(wave)
    this.emitHud()
  }

  private positionSigns(progress: number): void {
    const viewport = this.viewport()
    const textureScale = this.signTextureScale()
    for (const sign of this.signs) {
      const point = project(sign.lane, progress, viewport)
      const bob = this.parked && !this.reducedMotion ? Math.sin(this.waveElapsedMs / 240) * 5 : 0
      sign.image.setPosition(point.x, point.y + bob).setScale(point.scale * textureScale)
    }
  }

  /**
   * Sign textures are 520px wide; scale them so a fully-approached sign fits
   * its lane on any viewport (~30% of width, clamped) instead of rendering at
   * texture size — on a phone an unscaled sign covers the whole screen.
   */
  private signTextureScale(): number {
    const targetWidth = Math.min(Math.max(this.scale.width * 0.3, 120), 210)
    return targetWidth / 520
  }

  private moveAvatar(lane: LaneIndex): void {
    if (this.paused || this.complete) return
    this.selectedLane = lane
    if (!this.avatar) return
    const target = project(lane, 0.95, this.viewport())
    this.tweens.add({
      targets: this.avatar,
      x: target.x,
      duration: 180,
      ease: 'Cubic.easeOut',
    })
  }

  private commitLane(lane: LaneIndex): void {
    if (!this.activeWave || this.resolving || this.paused || this.complete) return
    if (this.engine.config.mode === 'cruise' && !this.parked) return
    this.resolving = true
    this.selectedLane = lane
    const wave = this.activeWave
    this.tweens.add({
      targets: this.avatar,
      x: project(lane, 0.95, this.viewport()).x,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => this.resolveWave(lane, wave),
    })
  }

  private resolveWave(lane: LaneIndex, wave: WaveSpec): void {
    const result = this.engine.resolveLane(lane, wave.index)
    if (!result) {
      this.resolving = false
      return
    }
    this.callbacks.onResolve(result)
    this.emitHud()
    const chosenSign = this.signs.find((sign) => sign.lane === lane)
    const correctSign = this.signs.find((sign) => sign.isCorrect)
    if (result.correct) {
      this.sfx.play('correct', 0.8)
      if (result.combo > 0 && result.combo % 5 === 0) this.sfx.play('combo', 0.72)
      if (chosenSign) {
        this.splash(chosenSign.image.x, chosenSign.image.y, 0xf7c843)
        this.tweens.add({ targets: chosenSign.image, scale: chosenSign.image.scale * 1.16, duration: 150, yoyo: true })
      }
    } else {
      this.sfx.play('wrong', 0.74)
      if (chosenSign) this.splash(chosenSign.image.x, chosenSign.image.y, 0x9aa8b8)
      if (!this.reducedMotion) this.cameras.main.shake(150, 0.006)
      if (correctSign) this.tweens.add({ targets: correctSign.image, alpha: 0.25, duration: 120, yoyo: true, repeat: 1 })
    }
    this.time.delayedCall(700, () => {
      this.clearSigns()
      this.activeWave = null
      this.resolving = false
      if (!this.complete) this.spawnWave()
    })
  }

  private splash(x: number, y: number, tint: number): void {
    const splash = this.add.particles(x, y, 'surf-wake', {
      emitting: false,
      lifespan: { min: 320, max: 720 },
      speed: { min: 45, max: this.reducedMotion ? 80 : 190 },
      angle: { min: 195, max: 345 },
      scale: { start: 0.62, end: 0.04 },
      alpha: { start: 0.82, end: 0 },
      tint,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(30)
    splash.emitParticleAt(x, y, this.reducedMotion ? 8 : 22)
    this.time.delayedCall(850, () => splash.destroy())
  }

  private updateWake(delta: number): void {
    if (!this.avatar || !this.wake || this.reducedMotion) return
    this.wakeElapsedMs += delta
    if (this.wakeElapsedMs < 110) return
    this.wakeElapsedMs = 0
    this.wake.emitParticleAt(this.avatar.x, this.avatar.y + 42, 1)
  }

  private handleSessionComplete(stats: SessionStats): void {
    if (this.completeNotified) return
    this.complete = true
    this.completeNotified = true
    this.sfx.play('complete', 0.82)
    this.callbacks.onSessionComplete(stats)
  }

  private emitHud(): void {
    this.callbacks.onHud({
      score: this.engine.score,
      combo: this.engine.combo,
      lives: this.engine.lives,
      level: this.engine.level,
    })
  }

  private resizeScene(): void {
    this.ocean?.resize()
    this.positionSigns(this.parked ? 0.86 : Math.min(0.86, this.waveElapsedMs / (this.activeWave?.travelMs ?? 1)))
    if (this.avatar) {
      const point = project(this.selectedLane, 0.95, this.viewport())
      this.avatar.setPosition(point.x, this.scale.height * 0.86)
    }
  }

  private clearSigns(): void {
    this.signs.forEach((sign) => sign.image.destroy())
    this.signs = []
  }

  private onVisibilityChange = (): void => {
    if (document.hidden) this.applyPause()
    else if (!this.manualPaused) this.applyResume()
  }

  private onReducedMotionChange = (event: MediaQueryListEvent): void => {
    this.reducedMotion = event.matches
    this.ocean?.setReducedMotion(event.matches)
  }

  private cleanup(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.mediaQuery?.removeEventListener?.('change', this.onReducedMotionChange)
    this.scale.off('resize', this.resizeScene, this)
    this.unsubscribeEngine?.()
    this.unsubscribeEngine = undefined
    this.clearSigns()
    this.wake?.destroy()
    this.avatar?.destroy()
    this.ocean?.destroy()
    releaseSignTextures(this)
  }

  private viewport(): SurfViewport {
    return { width: this.scale.width, height: this.scale.height }
  }
}
