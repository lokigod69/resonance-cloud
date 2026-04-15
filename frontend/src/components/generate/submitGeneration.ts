import { supabase } from '@/lib/supabase'
import type { GeneratePayload, ExistingDeck } from './useWizardState'

type SubmitGenerationOptions = {
  cachedCredits?: number
}

export async function submitGeneration(
  userId: string,
  payload: GeneratePayload,
  existingDeck?: ExistingDeck,
  options?: SubmitGenerationOptions
): Promise<string> {
  const { deckPayload, wordList, jobPayload } = payload
  const wordCount = wordList.length

  const { data: { session } } = await supabase.auth.getSession()
  console.log('[submitGeneration] session state:', {
    hasSession: !!session,
    hasToken: !!session?.access_token,
    userId: session?.user?.id,
  })

  // Fresh credit check
  const { data: freshProfile, error: profileError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (profileError) {
    console.error('[submitGeneration] profile credit check failed:', {
      userId,
      message: profileError.message,
      code: 'code' in profileError ? profileError.code : undefined,
      details: 'details' in profileError ? profileError.details : undefined,
      hint: 'hint' in profileError ? profileError.hint : undefined,
    })
  }

  const availableCredits = freshProfile?.credits ?? options?.cachedCredits
  if (typeof availableCredits !== 'number') {
    throw new Error(profileError?.message || 'Could not verify credit balance')
  }

  if (availableCredits < wordCount) {
    throw new Error(`Not enough credits. You have ${availableCredits} but need ${wordCount}.`)
  }

  let targetDeckId: string

  if (existingDeck) {
    // ── Add to existing deck ──
    targetDeckId = existingDeck.id

    const wordRows = wordList.map((w) => ({
      deck_id: targetDeckId,
      user_id: userId,
      word: w,
      status: 'pending',
    }))
    const { error: wordsError } = await supabase.from('words').insert(wordRows)
    if (wordsError) throw new Error(wordsError.message)

    const { error: jobError } = await supabase
      .from('generation_jobs')
      .insert({ ...jobPayload, deck_id: targetDeckId })
    if (jobError) throw new Error(jobError.message)

    const { error: deckUpdateError } = await supabase
      .from('decks')
      .update({
        status: 'generating',
        word_count: existingDeck.word_count + wordCount,
      })
      .eq('id', targetDeckId)
    if (deckUpdateError) throw new Error(deckUpdateError.message)
  } else {
    // ── Create new deck ──
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .insert(deckPayload!)
      .select('id')
      .single()

    if (deckError || !deck) throw new Error(deckError?.message || 'Failed to create deck')
    targetDeckId = deck.id

    const wordRows = wordList.map((w) => ({
      deck_id: targetDeckId,
      user_id: userId,
      word: w,
      status: 'pending',
    }))
    const { error: wordsError } = await supabase.from('words').insert(wordRows)
    if (wordsError) throw new Error(wordsError.message)

    const { error: jobError } = await supabase
      .from('generation_jobs')
      .insert({ ...jobPayload, deck_id: targetDeckId })
    if (jobError) throw new Error(jobError.message)
  }

  // Deduct credits
  const { error: creditError } = await supabase
    .from('profiles')
    .update({ credits: availableCredits - wordCount })
    .eq('id', userId)
  if (creditError) throw new Error(creditError.message)

  return targetDeckId
}
