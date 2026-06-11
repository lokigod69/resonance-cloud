import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Play, Square } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { publicApiUrl } from '@/lib/publicOrigins'
import { formatSpeakApiError, type SpeakApiErrorPayload } from '@/lib/translations'

interface VoiceSampleButtonProps {
  voiceName: string
  language: string
  /** The voiceName currently playing (or null). Parent-managed mutual exclusion. */
  nowPlaying: string | null
  onPlayStart: (voiceName: string) => void
  onPlayEnd: () => void
}

// Session-scoped cache of public sample URLs. Samples are neutral-only, keyed by
// voice + language. The server no longer generates audio on demand.
const sampleUrlCache = new Map<string, string>()

function cacheKey(voiceName: string, language: string) {
  return `${voiceName}|${language}`
}

export function VoiceSampleButton({
  voiceName,
  language,
  nowPlaying,
  onPlayStart,
  onPlayEnd,
}: VoiceSampleButtonProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const abortedRef = useRef(false)

  const isPlaying = nowPlaying === voiceName

  const stopPlayback = useCallback(() => {
    abortedRef.current = true
    if (audioElRef.current) {
      const audio = audioElRef.current
      audioElRef.current = null
      try { audio.pause() } catch { /* ignore */ }
      try { audio.currentTime = 0 } catch { /* ignore */ }
      try { audio.dispatchEvent(new Event('ended')) } catch { /* ignore */ }
      try { audio.removeAttribute('src') } catch { /* ignore */ }
      try { audio.src = '' } catch { /* ignore */ }
      try { audio.load() } catch { /* ignore */ }
    }
  }, [])

  // Stop (or abort in-flight URL fetch) if another button takes over.
  useEffect(() => {
    if (!isPlaying) {
      stopPlayback()
    }
  }, [isPlaying, stopPlayback])

  useEffect(() => {
    return () => {
      stopPlayback()
    }
  }, [stopPlayback])

  const stop = useCallback(() => {
    stopPlayback()
    onPlayEnd()
  }, [onPlayEnd, stopPlayback])

  const playFromUrl = useCallback(async (url: string) => {
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url)
      audio.preload = 'auto'
      audio.onended = () => resolve()
      audio.onerror = () => reject(new Error(t('speak.voiceSample.audioFailed')))
      audioElRef.current = audio
      if (abortedRef.current) {
        resolve()
        return
      }
      audio.play().catch(reject)
    })
  }, [t])

  const play = useCallback(async () => {
    if (isPlaying) {
      stop()
      return
    }

    setError(null)
    onPlayStart(voiceName)
    abortedRef.current = false

    const key = cacheKey(voiceName, language)
    let url = sampleUrlCache.get(key)

    if (!url) {
      setLoading(true)
      try {
        const res = await fetch(publicApiUrl('/api/voice-sample'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voice_name: voiceName,
            language,
          }),
        })
        if (!res.ok) {
          const errJson = await res.json().catch(() => null) as SpeakApiErrorPayload | null
          console.warn('[VoiceSampleButton] voice-sample request failed:', {
            status: res.status,
            error: errJson?.error,
            detail: errJson?.detail,
            retry_after_seconds: errJson?.retry_after_seconds,
          })
          throw new Error(formatSpeakApiError(t, res.status, errJson, 'speak.voiceSample.requestFailed'))
        }
        const data = await res.json() as { url?: string }
        if (!data.url) throw new Error(t('speak.voiceSample.noUrl'))
        url = data.url
        sampleUrlCache.set(key, url)
      } catch (err) {
        setLoading(false)
        setError(err instanceof Error ? err.message : t('speak.voiceSample.sampleFailed'))
        onPlayEnd()
        return
      }
      setLoading(false)
    }

    if (abortedRef.current || !url) {
      onPlayEnd()
      return
    }

    try {
      await playFromUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('speak.voiceSample.playbackFailed'))
    } finally {
      audioElRef.current = null
      if (!abortedRef.current) onPlayEnd()
    }
  }, [isPlaying, language, onPlayEnd, onPlayStart, playFromUrl, stop, t, voiceName])

  const title = error
    ? t('speak.voiceSample.failedWithError', { error })
    : isPlaying
    ? t('speak.voiceSample.stop')
    : loading
    ? t('speak.voiceSample.loading')
    : t('speak.voiceSample.play')

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); void play() }}
      disabled={loading}
      title={title}
      aria-label={title}
      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
        isPlaying
          ? 'bg-cyan-600 text-white hover:bg-cyan-500'
          : error
          ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60'
          : 'bg-gray-700/60 text-gray-200 hover:bg-gray-600'
      } disabled:opacity-60 disabled:cursor-wait`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPlaying ? (
        <Square className="w-3.5 h-3.5 fill-current" />
      ) : (
        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
      )}
    </button>
  )
}
