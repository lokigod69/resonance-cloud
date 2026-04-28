export type GrokIOSAudioSessionLike = {
  type?: string
  state?: string
  onstatechange?: ((event: Event) => void) | null
}

export type GrokIOSAudioDiagnosticsOptions = {
  getAudioContext?: () => AudioContext | null
  getPrimer?: () => HTMLAudioElement | null
  log?: (...args: unknown[]) => void
}

type GrokIOSAudioDiagnosticsGlobal = Window & {
  __grokRunIOSAudioRouteProbe?: () => Promise<void>
  __grokIOSAudioDiagnostics?: {
    runRouteProbe: () => Promise<void>
    setPlayback: () => boolean
    setPlayAndRecord: () => boolean
    getAudioSessionSnapshot: () => {
      supported: boolean
      type: string | null
      state: string | null
    }
  }
}

let unsupportedLogged = false
let stateChangeAttached = false
let installed = false
let installedOptions: GrokIOSAudioDiagnosticsOptions = {}

function logWithOptions(options: GrokIOSAudioDiagnosticsOptions | undefined, ...args: unknown[]) {
  options?.log?.(...args)
}

export function getNavigatorAudioSession(): GrokIOSAudioSessionLike | null {
  if (typeof navigator === 'undefined') return null
  if (!('audioSession' in navigator)) return null
  const nav = navigator as Navigator & { audioSession?: GrokIOSAudioSessionLike }
  return navigator.audioSession ? nav.audioSession ?? null : null
}

export function isIOSLikeSafariRuntime(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const platform = navigator.platform
  const maxTouchPoints = navigator.maxTouchPoints ?? 0
  const isiOSDevice = /iPad|iPhone|iPod/.test(ua) ||
    (platform === 'MacIntel' && maxTouchPoints > 1)
  return isiOSDevice && /WebKit/i.test(ua)
}

export function getGrokIOSAudioSessionSnapshot() {
  const audioSession = getNavigatorAudioSession()
  return {
    supported: audioSession !== null,
    type: audioSession?.type ?? null,
    state: audioSession?.state ?? null,
  }
}

function attachStateChangeLogger(
  audioSession: GrokIOSAudioSessionLike,
  options: GrokIOSAudioDiagnosticsOptions | undefined,
) {
  if (stateChangeAttached) return
  try {
    audioSession.onstatechange = () => {
      logWithOptions(options, 'iosAudioSession:statechange', {
        type: audioSession.type ?? null,
        state: audioSession.state ?? null,
      })
    }
    stateChangeAttached = true
  } catch {
    // Some WebKit builds expose a read-only handler.
  }
}

export function setIOSAudioSessionType(type: 'playback' | 'play-and-record', reason: string): boolean {
  if (!isIOSLikeSafariRuntime()) return false

  const audioSession = getNavigatorAudioSession()
  if (!audioSession) {
    if (!unsupportedLogged) {
      unsupportedLogged = true
      logWithOptions(installedOptions, 'iosAudioSession:unsupported', {
        reason,
        requestedType: type,
        supported: false,
      })
    }
    return false
  }

  attachStateChangeLogger(audioSession, installedOptions)
  const beforeType = audioSession.type ?? null
  try {
    audioSession.type = type
  } catch {
    // Feature detection is insufficient on some iOS/Safari builds.
  }
  const afterType = audioSession.type ?? null
  logWithOptions(installedOptions, 'iosAudioSession:set', {
    reason,
    beforeType,
    afterType,
    requestedType: type,
    state: audioSession.state ?? null,
    supported: true,
  })
  return afterType === type
}

async function getProbeAudioContext(options: GrokIOSAudioDiagnosticsOptions | undefined) {
  const existing = options?.getAudioContext?.()
  if (existing && existing.state !== 'closed') {
    if (existing.state !== 'running') {
      await existing.resume().catch(() => {})
    }
    return { ctx: existing, owned: false }
  }
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) throw new Error('AudioContext is not available')
  const ctx = new Ctor()
  if (ctx.state !== 'running') {
    await ctx.resume().catch(() => {})
  }
  return { ctx, owned: true }
}

async function playReferenceTone(options: GrokIOSAudioDiagnosticsOptions | undefined) {
  const { ctx, owned } = await getProbeAudioContext(options)
  try {
    const durationSeconds = 0.35
    const frequency = 880
    const frameCount = Math.floor(ctx.sampleRate * durationSeconds)
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < frameCount; i++) {
      const envelope = Math.max(0, Math.min(1, i / 240, (frameCount - i) / 240))
      channel[i] = Math.sin((2 * Math.PI * frequency * i) / ctx.sampleRate) * 0.2 * envelope
    }

    await new Promise<void>((resolve) => {
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.onended = () => {
        try { source.disconnect() } catch { /* ignore */ }
        resolve()
      }
      source.start(ctx.currentTime)
    })
  } finally {
    if (owned) {
      await ctx.close().catch(() => {})
    }
  }
}

export async function runGrokIOSAudioRouteProbe(options?: GrokIOSAudioDiagnosticsOptions): Promise<void> {
  const activeOptions = options ?? installedOptions
  logWithOptions(activeOptions, 'iosRouteProbe:start', {
    audioSession: getGrokIOSAudioSessionSnapshot(),
    primerExists: activeOptions.getPrimer?.() ? true : null,
  })

  setIOSAudioSessionType('playback', 'route-probe-first-reference')
  await playReferenceTone(activeOptions)
  logWithOptions(activeOptions, 'iosRouteProbe:first-reference-played', {
    audioSession: getGrokIOSAudioSessionSnapshot(),
  })

  setIOSAudioSessionType('play-and-record', 'route-probe-before-getUserMedia')
  let stream: MediaStream | null = await navigator.mediaDevices.getUserMedia({ audio: true })
  logWithOptions(activeOptions, 'iosRouteProbe:mic-opened', {
    audioSession: getGrokIOSAudioSessionSnapshot(),
    trackCount: stream.getAudioTracks().length,
  })

  stream.getTracks().forEach((track) => track.stop())
  stream = null
  logWithOptions(activeOptions, 'iosRouteProbe:mic-released', {
    audioSession: getGrokIOSAudioSessionSnapshot(),
  })

  setIOSAudioSessionType('playback', 'route-probe-after-mic-release')
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
  logWithOptions(activeOptions, 'iosRouteProbe:playback-restored', {
    audioSession: getGrokIOSAudioSessionSnapshot(),
  })

  await playReferenceTone(activeOptions)
  logWithOptions(activeOptions, 'iosRouteProbe:second-reference-played', {
    audioSession: getGrokIOSAudioSessionSnapshot(),
  })
  logWithOptions(activeOptions, 'iosRouteProbe:done', {
    audioSession: getGrokIOSAudioSessionSnapshot(),
  })
}

export function installGrokIOSAudioDiagnostics(options?: GrokIOSAudioDiagnosticsOptions): void {
  if (typeof window === 'undefined') return
  installedOptions = {
    ...installedOptions,
    ...options,
  }

  const debugWindow = window as GrokIOSAudioDiagnosticsGlobal
  debugWindow.__grokRunIOSAudioRouteProbe = () => runGrokIOSAudioRouteProbe(installedOptions)
  debugWindow.__grokIOSAudioDiagnostics = {
    runRouteProbe: () => runGrokIOSAudioRouteProbe(installedOptions),
    setPlayback: () => setIOSAudioSessionType('playback', 'diagnostics-set-playback'),
    setPlayAndRecord: () => setIOSAudioSessionType('play-and-record', 'diagnostics-set-play-and-record'),
    getAudioSessionSnapshot: getGrokIOSAudioSessionSnapshot,
  }

  const audioSession = getNavigatorAudioSession()
  if (audioSession) {
    attachStateChangeLogger(audioSession, installedOptions)
  }
  installed = true
}

export function isGrokIOSAudioDiagnosticsInstalled(): boolean {
  return installed
}
