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

export function installGrokIOSAudioDiagnostics(options?: GrokIOSAudioDiagnosticsOptions): void {
  if (typeof window === 'undefined') return
  installedOptions = {
    ...installedOptions,
    ...options,
  }
  logWithOptions(installedOptions, 'grokIOSAudioDiagnostics:installed', {
    exports: ['setIOSAudioSessionType', 'installGrokIOSAudioDiagnostics'],
  })

  const audioSession = getNavigatorAudioSession()
  if (audioSession) {
    attachStateChangeLogger(audioSession, installedOptions)
  }
  installed = true
}

export function isGrokIOSAudioDiagnosticsInstalled(): boolean {
  return installed
}
