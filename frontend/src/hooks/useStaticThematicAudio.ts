import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  buildStaticThematicPlaybackQuery,
  fetchStaticThematicPlayback,
  type StaticThematicPlaybackRow,
} from '@/lib/staticThematicAudio'

const pageCache = new Map<string, Map<string, StaticThematicPlaybackRow>>()
let activeStaticAudio: HTMLAudioElement | null = null

function stopStaticAudio() {
  if (!activeStaticAudio) return
  activeStaticAudio.pause()
  activeStaticAudio.currentTime = 0
  activeStaticAudio = null
}

function cacheKey({
  targetLanguageCode,
  categorySlug,
  levelNumber,
  conceptIds,
}: {
  targetLanguageCode: string
  categorySlug: string
  levelNumber: number
  conceptIds: string[]
}) {
  return [
    targetLanguageCode,
    categorySlug,
    levelNumber,
    [...new Set(conceptIds)].sort().join(','),
  ].join('|')
}

export function useStaticThematicAudio({
  enabled,
  targetLanguageCode,
  categorySlug,
  levelNumber,
  conceptIds,
}: {
  enabled: boolean
  targetLanguageCode: string
  categorySlug: string
  levelNumber: number
  conceptIds: string[]
}) {
  const [audioByConceptId, setAudioByConceptId] = useState<Map<string, StaticThematicPlaybackRow>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const latestKey = useRef('')

  const stableConceptIds = useMemo(() => [...new Set(conceptIds.filter(Boolean))], [conceptIds])
  const currentKey = useMemo(() => cacheKey({
    targetLanguageCode,
    categorySlug,
    levelNumber,
    conceptIds: stableConceptIds,
  }), [categorySlug, levelNumber, stableConceptIds, targetLanguageCode])

  useEffect(() => {
    let cancelled = false
    latestKey.current = currentKey

    if (!enabled || stableConceptIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset derived async lookup state when the page/query is disabled
      setAudioByConceptId(new Map())
      setLoading(false)
      setError(null)
      return () => {
        cancelled = true
      }
    }

    const cached = pageCache.get(currentKey)
    if (cached) {
      setAudioByConceptId(cached)
      setLoading(false)
      setError(null)
      return () => {
        cancelled = true
      }
    }

    setLoading(true)
    setError(null)
    const query = buildStaticThematicPlaybackQuery({
      targetLanguageCode,
      categorySlug,
      levelNumber,
      conceptIds: stableConceptIds,
    })

    void fetchStaticThematicPlayback(supabase, query)
      .then((lookup) => {
        if (cancelled || latestKey.current !== currentKey) return
        pageCache.set(currentKey, lookup)
        setAudioByConceptId(lookup)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[static-tts] playback lookup failed', err)
        setError(err)
        setAudioByConceptId(new Map())
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [categorySlug, currentKey, enabled, levelNumber, stableConceptIds, targetLanguageCode])

  const play = useCallback(async (conceptId: string): Promise<'audio' | 'none'> => {
    const row = audioByConceptId.get(conceptId)
    if (!row?.public_url || !('Audio' in globalThis)) return 'none'

    stopStaticAudio()
    try {
      const audio = new Audio(row.public_url)
      activeStaticAudio = audio
      await audio.play()
      return 'audio'
    } catch (err) {
      console.error('[static-tts] playback failed', err)
      stopStaticAudio()
      return 'none'
    }
  }, [audioByConceptId])

  return {
    audioByConceptId,
    loading,
    error,
    hasAudio: useCallback((conceptId: string) => audioByConceptId.has(conceptId), [audioByConceptId]),
    play,
  }
}
