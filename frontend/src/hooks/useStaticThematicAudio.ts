import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  buildStaticThematicPlaybackQuery,
  fetchStaticThematicPlayback,
  getStaticThematicAudio,
  type StaticThematicPlaybackRow,
} from '@/lib/staticThematicAudio'

type StaticThematicAudioLookup = Map<string, Map<string, StaticThematicPlaybackRow>>

const pageCache = new Map<string, StaticThematicAudioLookup>()
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
  voiceProfileKeys,
}: {
  targetLanguageCode: string
  categorySlug: string
  levelNumber: number
  conceptIds: string[]
  voiceProfileKeys?: string[]
}) {
  return [
    targetLanguageCode,
    categorySlug,
    levelNumber,
    [...new Set(conceptIds)].sort().join(','),
    [...new Set(voiceProfileKeys ?? [])].sort().join(','),
  ].join('|')
}

export function useStaticThematicAudio({
  enabled,
  targetLanguageCode,
  categorySlug,
  levelNumber,
  conceptIds,
  voiceProfileKeys,
}: {
  enabled: boolean
  targetLanguageCode: string
  categorySlug: string
  levelNumber: number
  conceptIds: string[]
  voiceProfileKeys?: string[]
}) {
  const [audioByConceptId, setAudioByConceptId] = useState<StaticThematicAudioLookup>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const latestKey = useRef('')

  const stableConceptIds = useMemo(() => [...new Set(conceptIds.filter(Boolean))], [conceptIds])
  const stableVoiceProfileKeys = useMemo(() => [...new Set((voiceProfileKeys ?? []).filter(Boolean))], [voiceProfileKeys])
  const currentKey = useMemo(() => cacheKey({
    targetLanguageCode,
    categorySlug,
    levelNumber,
    conceptIds: stableConceptIds,
    voiceProfileKeys: stableVoiceProfileKeys,
  }), [categorySlug, levelNumber, stableConceptIds, stableVoiceProfileKeys, targetLanguageCode])

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
      voiceProfileKeys: stableVoiceProfileKeys,
    })

    void fetchStaticThematicPlayback(supabase, query)
      .then((lookup) => {
        if (cancelled || latestKey.current !== currentKey) return
        pageCache.set(currentKey, lookup)
        setAudioByConceptId(lookup)
      })
      .catch((err) => {
        if (cancelled) return
        if (import.meta.env.DEV) console.error('[static-tts] playback lookup failed', err)
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
  }, [categorySlug, currentKey, enabled, levelNumber, stableConceptIds, stableVoiceProfileKeys, targetLanguageCode])

  const play = useCallback(async (
    conceptId: string,
    voiceProfileKey?: string,
  ): Promise<'audio' | 'none'> => {
    const row = getStaticThematicAudio(audioByConceptId, conceptId, voiceProfileKey)
    if (!row?.public_url || !('Audio' in globalThis)) return 'none'

    stopStaticAudio()
    try {
      const audio = new Audio(row.public_url)
      activeStaticAudio = audio
      await audio.play()
      return 'audio'
    } catch (err) {
      if (import.meta.env.DEV) console.error('[static-tts] playback failed', err)
      stopStaticAudio()
      return 'none'
    }
  }, [audioByConceptId])

  return {
    audioByConceptId,
    loading,
    error,
    hasAudio: useCallback(
      (conceptId: string, voiceProfileKey?: string) => Boolean(getStaticThematicAudio(
        audioByConceptId,
        conceptId,
        voiceProfileKey,
      )),
      [audioByConceptId],
    ),
    play,
  }
}
