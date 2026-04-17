import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Square, Loader2 } from 'lucide-react'
import { playAudioViaElement } from '@/lib/audioUtils'

interface VoiceSampleButtonProps {
  voiceName: string
  language: string
  characterModeId: string
  version: number
  accentId: string
  /** The voiceName currently playing (or null). Parent-managed mutual exclusion. */
  nowPlaying: string | null
  onPlayStart: (voiceName: string) => void
  onPlayEnd: () => void
}

interface SampleCacheEntry {
  base64: string
  format: string
}

// Session-scoped in-memory cache of already-generated samples. Keyed by
// `${voiceName}|${language}|${characterModeId}|v${version}|${accentId}`.
// The server persists to storage + DB; this avoids hitting the API again
// within the same session even before localStorage/DB cache wins.
const sampleCache = new Map<string, SampleCacheEntry>()

function cacheKey(voiceName: string, language: string, characterModeId: string, version: number, accentId: string) {
  return `${voiceName}|${language}|${characterModeId}|v${version}|${accentId}`
}

export function VoiceSampleButton({
  voiceName,
  language,
  characterModeId,
  version,
  accentId,
  nowPlaying,
  onPlayStart,
  onPlayEnd,
}: VoiceSampleButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const abortedRef = useRef(false)

  const isPlaying = nowPlaying === voiceName

  // Stop (or abort in-flight generation) if another button takes over.
  // The `abortedRef.current = true` must fire even when audioElRef is still
  // null — otherwise a cold-miss fetch in progress will race to completion
  // and start playing under the next button's audio.
  useEffect(() => {
    if (!isPlaying) {
      abortedRef.current = true
      if (audioElRef.current) {
        try {
          audioElRef.current.pause()
          audioElRef.current.currentTime = 0
        } catch { /* ignore */ }
        audioElRef.current = null
      }
    }
  }, [isPlaying])

  const stop = useCallback(() => {
    abortedRef.current = true
    if (audioElRef.current) {
      try {
        audioElRef.current.pause()
        audioElRef.current.currentTime = 0
      } catch { /* ignore */ }
      audioElRef.current = null
    }
    onPlayEnd()
  }, [onPlayEnd])

  const play = useCallback(async () => {
    if (isPlaying) {
      stop()
      return
    }

    setError(null)
    onPlayStart(voiceName)
    abortedRef.current = false

    const key = cacheKey(voiceName, language, characterModeId, version, accentId)
    let entry = sampleCache.get(key)

    if (!entry) {
      setLoading(true)
      try {
        const res = await fetch('/api/voice-sample', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voice_name: voiceName,
            language,
            character_mode_id: characterModeId,
            version,
            accent_id: accentId,
          }),
        })
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({ error: 'Request failed' }))
          throw new Error(errJson.error ?? `HTTP ${res.status}`)
        }
        const data = await res.json() as { audio_base64?: string; audio_format?: string }
        if (!data.audio_base64) throw new Error('No audio returned')
        entry = { base64: data.audio_base64, format: data.audio_format ?? 'wav' }
        sampleCache.set(key, entry)
      } catch (err) {
        setLoading(false)
        setError(err instanceof Error ? err.message : 'Sample failed')
        onPlayEnd()
        return
      }
      setLoading(false)
    }

    if (abortedRef.current) {
      onPlayEnd()
      return
    }

    try {
      await playAudioViaElement(
        entry.base64,
        entry.format,
        (audio) => { audioElRef.current = audio },
        () => abortedRef.current,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Playback failed')
    } finally {
      audioElRef.current = null
      if (!abortedRef.current) onPlayEnd()
    }
  }, [voiceName, language, characterModeId, version, accentId, isPlaying, stop, onPlayStart, onPlayEnd])

  const title = error
    ? `Failed: ${error}`
    : isPlaying
    ? 'Stop sample'
    : loading
    ? 'Generating sample…'
    : 'Play voice sample'

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); play() }}
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
