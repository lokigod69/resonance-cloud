import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { publicApiUrl } from '@/lib/publicOrigins'
import type {
  GenerateImagelessTtsRequest,
  GenerateImagelessTtsResponse,
} from '@/lib/types/imagelessDeck'
import { assertClientActive, withClientDeadline } from '@/lib/clientDeadline'

const TTS_GENERATION_TIMEOUT_MS = 90_000

type GenerateImagelessTtsErrorResponse = {
  error?: string
  detail?: string
}

export function useGenerateImagelessTts() {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generateImagelessTts(
    request: GenerateImagelessTtsRequest,
    callerSignal?: AbortSignal,
  ): Promise<GenerateImagelessTtsResponse> {
    setGenerating(true)
    setError(null)
    try {
      return await withClientDeadline(async (signal) => {
        const { data: sessionData } = await supabase.auth.getSession()
        assertClientActive(signal)
        const token = sessionData.session?.access_token
        if (!token) throw new Error('Authentication required')

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
          ? (() => {
              try {
                return JSON.parse(text) as GenerateImagelessTtsResponse & GenerateImagelessTtsErrorResponse
              } catch {
                return null
              }
            })()
          : null
        if (!res.ok) {
          throw new Error(body?.error || body?.detail || text || `TTS generation failed: ${res.status}`)
        }
        if (!body) throw new Error('TTS generation failed')

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

  return { generateImagelessTts, generating, error }
}
