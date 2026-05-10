import { useCallback, useEffect, useRef } from 'react'
import { setIOSAudioSessionType } from '@/lib/grokIOSAudioDiagnostics'

const SILENT_MP3_URL = '/silent.mp3'

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

export function useIOSAudioPrimer() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const silentPrimerRef = useRef<HTMLAudioElement | null>(null)

  const primeOnGesture = useCallback(async () => {
    setIOSAudioSessionType('playback', 'game-audio-primer')

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const AudioContextCtor = window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext
        if (AudioContextCtor) {
          audioContextRef.current = new AudioContextCtor()
        }
      }

      const ctx = audioContextRef.current
      if (ctx) {
        if (ctx.state !== 'running' && ctx.state !== 'closed') {
          await ctx.resume().catch(() => undefined)
        }
        const buffer = ctx.createBuffer(1, 1, 22050)
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(ctx.destination)
        source.start(ctx.currentTime)
      }
    } catch (err) {
      console.warn('[games] iOS audio context prime failed:', err)
    }

    try {
      if (!silentPrimerRef.current) {
        const el = new Audio(SILENT_MP3_URL)
        el.loop = true
        el.setAttribute('playsinline', 'true')
        el.setAttribute('webkit-playsinline', 'true')
        el.setAttribute('x-webkit-airplay', 'deny')
        el.controls = false
        try {
          ;(el as HTMLAudioElement & { disableRemotePlayback?: boolean }).disableRemotePlayback = true
        } catch {
          // Older browsers may not expose this property.
        }
        silentPrimerRef.current = el
      }

      const primer = silentPrimerRef.current
      if (primer.paused) {
        await primer.play().catch(() => undefined)
      }
    } catch (err) {
      console.warn('[games] iOS silent primer failed:', err)
    }
  }, [])

  const stopPrimer = useCallback(async () => {
    if (silentPrimerRef.current) {
      try {
        silentPrimerRef.current.pause()
        silentPrimerRef.current.currentTime = 0
        silentPrimerRef.current.removeAttribute('src')
        silentPrimerRef.current.load()
      } catch {
        // Best-effort cleanup.
      }
      silentPrimerRef.current = null
    }

    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close()
      } catch {
        // Best-effort cleanup.
      }
      audioContextRef.current = null
    }
  }, [])

  useEffect(() => () => {
    void stopPrimer()
  }, [stopPrimer])

  return { primeOnGesture, stopPrimer }
}

