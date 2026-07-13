import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getLanguageQueryValues } from '@/lib/languages'

export type GameWordRow = {
  id: string
  word: string
  translation: string | null
  mnemonic: string | null
  etymology: string | null
  ipa: string | null
  video_url: string | null
  thumbnail_url: string | null
  tts_audio_url: string | null
  video_url_b: string | null
  thumbnail_url_b: string | null
  image_url: string | null
  image_urls: string[] | null
  suno_storage_url: string | null
  suno_storage_url_b: string | null
  suno_audio_url: string | null
  metadata: Record<string, unknown> | null
  deck_id: string
  decks?: { target_language?: string | null; name?: string | null } | null
}

const WORD_SELECT = [
  'id',
  'word',
  'translation',
  'mnemonic',
  'etymology',
  'ipa',
  'video_url',
  'thumbnail_url',
  'tts_audio_url',
  'video_url_b',
  'thumbnail_url_b',
  'suno_storage_url',
  'suno_storage_url_b',
  'suno_audio_url',
  'metadata',
  'deck_id',
  'decks(target_language, name)',
].join(', ')

export function useGameDeck(gameId: string, deckId: string | null, language: string | null) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [rows, setRows] = useState<GameWordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchRows = useCallback(async (isStale?: () => boolean) => {
    const normalizedGameId = gameId.trim()
    if (!userId || !normalizedGameId) {
      setRows([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let languageDeckIds: string[] | null = null
    if (!deckId && language) {
      const { data, error: deckError } = await supabase
        .from('decks')
        .select('id')
        .eq('user_id', userId)
        .in('target_language', getLanguageQueryValues(language))

      if (isStale?.()) return

      if (deckError) {
        setRows([])
        setError(deckError)
        setLoading(false)
        return
      }

      languageDeckIds = data?.map((deck) => deck.id) ?? []
      if (languageDeckIds.length === 0) {
        setRows([])
        setLoading(false)
        return
      }
    }

    let wordsQuery = supabase
      .from('words')
      .select(WORD_SELECT)
      .eq('user_id', userId)
      .eq('status', 'complete')

    if (deckId) {
      wordsQuery = wordsQuery.eq('deck_id', deckId)
    } else if (languageDeckIds) {
      wordsQuery = wordsQuery.in('deck_id', languageDeckIds)
    }

    const { data, error: wordsError } = await wordsQuery.order('created_at', { ascending: true })
    if (isStale?.()) return

    if (wordsError) {
      setRows([])
      setError(wordsError)
    } else {
      setRows((data ?? []) as unknown as GameWordRow[])
    }
    setLoading(false)
  }, [deckId, gameId, language, userId])

  useEffect(() => {
    let stale = false
    queueMicrotask(() => {
      void fetchRows(() => stale)
    })
    return () => {
      stale = true
    }
  }, [fetchRows])

  return { rows, loading, error, refetch: fetchRows }
}
