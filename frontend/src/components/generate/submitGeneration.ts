import { supabase } from '@/lib/supabase'
import type { GeneratePayload, ExistingDeck } from './useWizardState'

type SubmitGenerationOptions = {
  cachedCredits?: number
}

type SubmitGenerationResult = {
  success?: boolean
  error?: string
  deck_id?: string
  job_id?: string
  idempotent?: boolean
}

function payloadFingerprint(
  payload: GeneratePayload,
  existingDeck?: ExistingDeck
): string {
  return JSON.stringify({
    existingDeckId: existingDeck?.id ?? null,
    deckPayload: payload.deckPayload,
    wordList: payload.wordList,
    jobPayload: payload.jobPayload,
  })
}

function getSubmitIdempotencyKey(
  userId: string,
  payload: GeneratePayload,
  existingDeck?: ExistingDeck
): { key: string; storageKey: string } {
  const storageKey = `submit-generation:${userId}:${payloadFingerprint(payload, existingDeck)}`
  const existing = sessionStorage.getItem(storageKey)
  if (existing) return { key: existing, storageKey }

  const key = crypto.randomUUID()
  sessionStorage.setItem(storageKey, key)
  return { key, storageKey }
}

export async function submitGeneration(
  userId: string,
  payload: GeneratePayload,
  existingDeck?: ExistingDeck,
  options?: SubmitGenerationOptions
): Promise<string> {
  void options
  const { deckPayload, wordList, jobPayload } = payload

  const { data: { session } } = await supabase.auth.getSession()
  console.log('[submitGeneration] session state:', {
    hasSession: !!session,
    hasToken: !!session?.access_token,
    userId: session?.user?.id,
  })

  const { key, storageKey } = getSubmitIdempotencyKey(userId, payload, existingDeck)
  const { data, error } = await supabase.rpc('submit_generation', {
    p_deck_payload: deckPayload,
    p_word_list: wordList,
    p_job_payload: jobPayload,
    p_existing_deck_id: existingDeck?.id ?? null,
    p_idempotency_key: key,
  })

  if (error) throw new Error(error.message)

  const result = data as SubmitGenerationResult | null
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to submit generation')
  }
  if (!result.deck_id) {
    throw new Error('Generation submit did not return a deck id')
  }

  if (!result.idempotent) {
    sessionStorage.removeItem(storageKey)
  }

  return result.deck_id
}
