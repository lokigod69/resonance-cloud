import { publicAssetUrl } from '@/lib/publicOrigins'

export const SURF_SFX_NAMES = ['correct', 'wrong', 'combo', 'levelup', 'pass', 'complete', 'start'] as const
export type SurfSfxName = typeof SURF_SFX_NAMES[number]

type WebkitAudioWindow = Window & { webkitAudioContext?: typeof AudioContext }

export class SurfSfx {
  private context: AudioContext | null = null
  private readonly buffers = new Map<SurfSfxName, AudioBuffer>()
  private readonly loading = new Map<SurfSfxName, Promise<void>>()
  private isMuted = false

  constructor() {
    try {
      this.isMuted = window.localStorage.getItem('surf.sfx.muted') === 'true'
    } catch {
      this.isMuted = false
    }
  }

  get muted(): boolean {
    return this.isMuted
  }

  setMuted(on: boolean): void {
    this.isMuted = on
    try {
      window.localStorage.setItem('surf.sfx.muted', String(on))
    } catch {
      // Storage is optional (private browser modes may reject it).
    }
  }

  async unlock(): Promise<void> {
    const context = this.getContext()
    if (!context || context.state === 'closed') return
    if (context.state !== 'running') await context.resume().catch(() => undefined)
  }

  async load(): Promise<void> {
    await Promise.all(SURF_SFX_NAMES.map((name) => this.loadOne(name)))
  }

  play(name: SurfSfxName, volume = 1): void {
    const context = this.context
    const buffer = this.buffers.get(name)
    if (this.isMuted || !context || context.state !== 'running' || !buffer) return
    try {
      const source = context.createBufferSource()
      const gain = context.createGain()
      gain.gain.value = Math.max(0, Math.min(1, volume))
      source.buffer = buffer
      source.connect(gain)
      gain.connect(context.destination)
      source.start()
    } catch {
      // Audio must never affect gameplay.
    }
  }

  private loadOne(name: SurfSfxName): Promise<void> {
    const existing = this.loading.get(name)
    if (existing) return existing
    const loading = (async () => {
      const context = this.getContext()
      if (!context) return
      try {
        const response = await fetch(publicAssetUrl(`/games/surf/sfx/${name}.mp3`))
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const buffer = await context.decodeAudioData(await response.arrayBuffer())
        this.buffers.set(name, buffer)
      } catch (error) {
        console.debug('[surf-audio] unavailable:', name, error)
      }
    })()
    this.loading.set(name, loading)
    return loading
  }

  private getContext(): AudioContext | null {
    if (this.context && this.context.state !== 'closed') return this.context
    try {
      const AudioContextConstructor = window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext
      this.context = AudioContextConstructor ? new AudioContextConstructor() : null
    } catch {
      this.context = null
    }
    return this.context
  }
}
