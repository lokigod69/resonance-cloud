import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { publicApiUrl } from '@/lib/publicOrigins'
import type {
  GenerateImagelessTtsResponse,
  GenerateImagelessTtsRequest,
} from '@/lib/types/imagelessDeck'
import { assertClientActive, withClientDeadline } from '@/lib/clientDeadline'

const TTS_GENERATION_TIMEOUT_MS = 90_000

type GenerateImagelessTtsErrorResponse = {
  error?: string
  detail?: string
}

export function useRegenerateImagelessTts() {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function regenerateImagelessTtsBatch(word_ids: string[], callerSignal?: AbortSignal): Promise<GenerateImagelessTtsResponse> {
    if (word_ids.length === 0) throw new Error('No cards selected')

    setGenerating(true)
    setError(null)
    try {
      return await withClientDeadline(async (signal) => {
        const { data: sessionData } = await supabase.auth.getSession()
        assertClientActive(signal)
        const token = sessionData.session?.access_token
        if (!token) throw new Error('Authentication required')

        const request: GenerateImagelessTtsRequest = { word_ids }
        const res = await fetch(publicApiUrl('/api/generate-imageless-tts'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(request),
          signal,
        })

        const text = await res.text()
        const body = text
          ? JSON.parse(text) as GenerateImagelessTtsResponse & GenerateImagelessTtsErrorResponse
          : null

        if (!res.ok) {
          throw new Error(body?.error || body?.detail || text || `TTS generation failed: ${res.status}`)
        }
        if (!body) throw new Error('TTS generation failed')

        const refreshedWordIds = body.results.map((result) => result.word_id)
        if (refreshedWordIds.length > 0) {
          const { data: refreshedWords } = await supabase
            .from('words')
            .select('id, tts_audio_url')
            .in('id', refreshedWordIds)
            .abortSignal(signal)

          const refreshedAudioById = new Map(
            (refreshedWords ?? []).map((word) => [word.id as string, word.tts_audio_url as string | null]),
          )
          body.results = body.results.map((result) => ({
            ...result,
            tts_audio_url: refreshedAudioById.get(result.word_id) ?? result.tts_audio_url,
          }))
        }

        return body
      }, TTS_GENERATION_TIMEOUT_MS, callerSignal)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'TTS generation failed'
      setError(message)
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setGenerating(false)
    }
  }

  async function regenerateImagelessTts({ word_id }: { word_id: string }) {
    return regenerateImagelessTtsBatch([word_id])
  }

  return { regenerateImagelessTts, regenerateImagelessTtsBatch, generating, error }
}
