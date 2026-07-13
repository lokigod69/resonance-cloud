import * as THREE from 'three'
import type { LaneIndex, ResolveResult, SessionEngine, SessionStats, WaveSpec } from '../engine/types'
import { SurfSfx } from '../audio'
import { SurfBuoys } from './buoys'
import { SurfEffects } from './effects'
import { lerpPalette, paletteForLevel, type SurfPalette } from './palettes'
import { SurfRider } from './rider'
import { SurfWater } from './water'
import { SurfWorld } from './world'

export type SurfRendererCallbacks = {
  onWave: (wave: WaveSpec) => void
  onResolve: (result: ResolveResult) => void
  onHud: (hud: { score: number; combo: number; lives: number; level: number }) => void
  onSessionComplete: (stats: SessionStats) => void
}

type PendingCommit = { lane: LaneIndex; wave: WaveSpec; elapsedMs: number }

export class SurfRenderer {
  private readonly host: HTMLElement
  private readonly engine: SessionEngine
  private readonly sfx: SurfSfx
  private readonly callbacks: SurfRendererCallbacks
  private readonly scene = new THREE.Scene()
  private readonly renderer: THREE.WebGLRenderer
  private readonly camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500)
  private readonly clock = new THREE.Clock()
  private readonly world: SurfWorld
  private readonly water: SurfWater
  private readonly rider = new SurfRider()
  private readonly buoys = new SurfBuoys()
  private readonly effects = new SurfEffects()
  private readonly resizeObserver: ResizeObserver
  private readonly mediaQuery: MediaQueryList | undefined
  private activeWave: WaveSpec | null = null
  private selectedLane: LaneIndex = 1
  private waveElapsedMs = 0
  private gameTimeSec = 0
  private parked = false
  private resolving = false
  private complete = false
  private completeNotified = false
  private manualPaused = false
  private paused = false
  private contextLost = false
  private reducedMotion = false
  private frame = 0
  private destroyed = false
  private pendingCommit: PendingCommit | null = null
  private nextWaveDelayMs = 0
  private paletteFrom: SurfPalette
  private paletteTo: SurfPalette
  private paletteElapsedMs = 1500
  private paletteDurationMs = 1500
  private currentPalette: SurfPalette

  constructor(host: HTMLElement, opts: { engine: SessionEngine; sfx: SurfSfx; callbacks: SurfRendererCallbacks }) {
    this.host = host
    this.engine = opts.engine
    this.sfx = opts.sfx
    this.callbacks = opts.callbacks
    this.currentPalette = paletteForLevel(this.engine.level)
    this.paletteFrom = this.currentPalette
    this.paletteTo = this.currentPalette
    this.world = new SurfWorld(this.currentPalette)
    this.water = new SurfWater(this.currentPalette)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.3
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.renderer.domElement.tabIndex = 0
    this.host.appendChild(this.renderer.domElement)
    this.scene.fog = this.world.fog
    this.scene.add(this.world.group, this.water.mesh, this.water.sparkles, this.rider.group, this.buoys.group, this.effects.group)
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    this.world.setReducedMotion(this.reducedMotion)
    this.water.setReducedMotion(this.reducedMotion)
    this.rider.setReducedMotion(this.reducedMotion)
    this.buoys.setReducedMotion(this.reducedMotion)
    this.effects.setReducedMotion(this.reducedMotion)
    this.resizeObserver = new ResizeObserver(this.onResize)
    this.resizeObserver.observe(this.host)
    this.mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    this.mediaQuery?.addEventListener('change', this.onReducedMotionChange)
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('keydown', this.onKeyDown)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    // A lost GL context blanks the canvas but rAF keeps firing — game time must
    // not advance while the player can't see anything.
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost)
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored)
    this.unsubscribeEngine = this.engine.on(this.onEngineEvent)
    this.onResize()
    this.emitHud()
    this.spawnWave()
    this.clock.start()
    this.frame = requestAnimationFrame(this.tick)
  }

  private unsubscribeEngine: (() => void) | undefined

  pause(): void { if (!this.destroyed) { this.manualPaused = true; this.applyPause() } }
  resume(): void { if (!this.destroyed) { this.manualPaused = false; if (!document.hidden) this.applyResume() } }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.mediaQuery?.removeEventListener('change', this.onReducedMotionChange)
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('keydown', this.onKeyDown)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost)
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored)
    this.unsubscribeEngine?.()
    this.unsubscribeEngine = undefined
    this.buoys.dispose()
    this.rider.dispose()
    this.water.dispose()
    this.world.dispose()
    this.effects.dispose()
    this.scene.clear()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
  }

  private tick = (): void => {
    if (this.destroyed) return
    const deltaSec = Math.min(0.05, this.clock.getDelta())
    if (!this.paused) this.update(deltaSec)
    this.renderer.render(this.scene, this.camera)
    this.frame = requestAnimationFrame(this.tick)
  }

  private update(deltaSec: number): void {
    const deltaMs = deltaSec * 1000
    this.gameTimeSec += deltaSec
    const speedFactor = Math.min(2, 1 + this.engine.level * 0.15) * (this.engine.combo >= 5 ? 1.6 : 1)
    this.updatePalette(deltaMs)
    this.world.update(this.gameTimeSec)
    this.water.update(this.gameTimeSec, speedFactor)
    this.rider.update(deltaSec, this.gameTimeSec, speedFactor, this.engine.combo >= 5)
    this.updateCamera()
    if (this.activeWave) {
      if (!this.resolving && !this.complete) {
        this.waveElapsedMs += deltaMs
        const rawProgress = this.waveElapsedMs / this.activeWave.travelMs
        if (this.engine.config.mode === 'cruise' && rawProgress >= 0.86) this.parked = true
        if (this.engine.config.mode === 'rush' && rawProgress >= 1) this.commitLane(this.selectedLane)
      } else if (this.engine.config.mode === 'rush' && this.pendingCommit) {
        // Preserve the old scene's small post-line overshoot while the rider banks in.
        this.waveElapsedMs += deltaMs
      }
      const rawProgress = this.waveElapsedMs / this.activeWave.travelMs
      this.buoys.update(rawProgress, this.engine.config.mode === 'cruise', this.parked, this.gameTimeSec, this.gameTimeSec * speedFactor, deltaSec, this.camera)
    }
    if (this.pendingCommit) {
      this.pendingCommit.elapsedMs += deltaMs
      if (this.pendingCommit.elapsedMs >= 240) {
        const pending = this.pendingCommit
        this.pendingCommit = null
        this.resolveWave(pending.lane, pending.wave)
      }
    }
    if (this.nextWaveDelayMs > 0) {
      this.nextWaveDelayMs -= deltaMs
      if (this.nextWaveDelayMs <= 0) {
        this.buoys.clear()
        this.activeWave = null
        this.resolving = false
        if (!this.complete) this.spawnWave()
      }
    }
    this.effects.update(deltaSec, this.camera)
  }

  private spawnWave(): void {
    if (this.complete || this.engine.complete) return
    const wave = this.engine.nextWave()
    if (!wave) return
    this.activeWave = wave
    this.waveElapsedMs = 0
    this.parked = false
    this.resolving = false
    this.buoys.spawn(wave, this.currentPalette.accent)
    this.callbacks.onWave(wave)
    this.emitHud()
  }

  private moveRider(lane: LaneIndex): void {
    if (this.paused || this.complete) return
    this.selectedLane = lane
    this.rider.moveTo(lane)
  }

  private commitLane(lane: LaneIndex): void {
    if (!this.activeWave || this.resolving || this.paused || this.complete) return
    if (this.engine.config.mode === 'cruise' && !this.parked) return
    this.moveRider(lane)
    this.resolving = true
    this.pendingCommit = { lane, wave: this.activeWave, elapsedMs: 0 }
  }

  private resolveWave(lane: LaneIndex, wave: WaveSpec): void {
    const result = this.engine.resolveLane(lane, wave.index)
    if (!result) { this.resolving = false; return }
    this.callbacks.onResolve(result)
    this.emitHud()
    const position = this.buoys.positionFor(lane)
    if (result.correct) {
      this.sfx.play('correct', 0.8)
      if (result.combo > 0 && result.combo % 5 === 0) this.sfx.play('combo', 0.72)
      this.buoys.chosenCorrect(lane)
      this.effects.splash(position, 0xf7c843)
    } else {
      this.sfx.play('wrong', 0.74)
      this.buoys.chosenWrong(lane)
      this.buoys.flashCorrect()
      this.effects.splash(position, 0x9aa8b8)
      this.effects.shake()
    }
    this.nextWaveDelayMs = 700
  }

  private updateCamera(): void {
    const portrait = this.camera.aspect < 0.75
    const baseY = portrait ? 6.6 : 5.2
    const baseZ = portrait ? 14 : 9.5
    const sway = this.reducedMotion ? 0 : Math.sin(this.gameTimeSec * Math.PI * 2 / 7) * 0.12
    this.camera.position.set(this.rider.group.position.x * 0.5 + sway, baseY, baseZ)
    const desiredFov = this.reducedMotion ? (portrait ? 68 : 58) : (portrait ? 68 : (this.engine.combo >= 5 ? 62 : 58))
    this.camera.fov += (desiredFov - this.camera.fov) * 0.1
    this.camera.updateProjectionMatrix()
    this.camera.lookAt(this.rider.group.position.x * 0.42, 1.4, -30)
  }

  private updatePalette(deltaMs: number): void {
    if (this.paletteElapsedMs < this.paletteDurationMs) {
      this.paletteElapsedMs = Math.min(this.paletteDurationMs, this.paletteElapsedMs + deltaMs)
      this.currentPalette = lerpPalette(this.paletteFrom, this.paletteTo, this.paletteElapsedMs / this.paletteDurationMs)
      this.world.applyPalette(this.currentPalette)
      this.water.setPalette(this.currentPalette)
    }
  }

  private emitHud(): void { this.callbacks.onHud({ score: this.engine.score, combo: this.engine.combo, lives: this.engine.lives, level: this.engine.level }) }

  private onEngineEvent = (event: { type: string; level?: number; stats?: SessionStats }): void => {
    if (event.type === 'level_up' && event.level !== undefined) {
      this.paletteFrom = this.currentPalette
      this.paletteTo = paletteForLevel(event.level)
      this.paletteElapsedMs = 0
      this.paletteDurationMs = 1500
      this.sfx.play('levelup', 0.72)
    }
    if (event.type === 'session_complete' && event.stats) this.handleSessionComplete(event.stats)
  }

  private handleSessionComplete(stats: SessionStats): void {
    if (this.completeNotified) return
    this.complete = true
    this.completeNotified = true
    this.sfx.play('complete', 0.82)
    this.callbacks.onSessionComplete(stats)
  }

  private applyPause(): void { this.paused = true }
  private applyResume(): void { this.paused = false; this.clock.getDelta() }
  private onVisibilityChange = (): void => { if (document.hidden) this.applyPause(); else if (!this.manualPaused && !this.contextLost) this.applyResume() }
  private onContextLost = (event: Event): void => {
    event.preventDefault()
    this.contextLost = true
    this.applyPause()
  }
  private onContextRestored = (): void => {
    this.contextLost = false
    if (!this.manualPaused && !document.hidden) this.applyResume()
  }
  private onReducedMotionChange = (event: MediaQueryListEvent): void => {
    this.reducedMotion = event.matches
    this.world.setReducedMotion(event.matches); this.water.setReducedMotion(event.matches); this.rider.setReducedMotion(event.matches); this.buoys.setReducedMotion(event.matches); this.effects.setReducedMotion(event.matches)
  }
  private onPointerDown = (event: PointerEvent): void => {
    void this.sfx.unlock()
    const bounds = this.renderer.domElement.getBoundingClientRect()
    const lane = Math.min(2, Math.max(0, Math.floor(((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 3))) as LaneIndex
    this.moveRider(lane)
    if (this.engine.config.mode === 'cruise') this.commitLane(lane)
  }
  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowLeft') this.moveRider(Math.max(0, this.selectedLane - 1) as LaneIndex)
    if (event.key === 'ArrowRight') this.moveRider(Math.min(2, this.selectedLane + 1) as LaneIndex)
    if (event.key === ' ' || event.key === 'Enter') this.commitLane(this.selectedLane)
  }
  private onResize = (): void => {
    const width = Math.max(1, this.host.clientWidth)
    const height = Math.max(1, this.host.clientHeight)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.fov = this.camera.aspect < 0.75 ? 68 : 58
    this.camera.updateProjectionMatrix()
  }
}
