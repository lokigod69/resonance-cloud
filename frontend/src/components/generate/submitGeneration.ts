import { supabase } from '@/lib/supabase'
import type { GeneratePayload, ExistingDeck } from './useWizardState'

export async function submitGeneration(
  userId: string,
  payload: GeneratePayload,
  existingDeck?: ExistingDeck
): Promise<string> {
  const { deckPayload, wordList, jobPayload } = payload
  const wordCount = wordList.length

  // Fresh credit check
  const { data: freshProfile, error: profileError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (profileError || !freshProfile) throw new Error('Could not verify credit balance')

  const freshCredits = freshProfile.credits ?? 0
  if (freshCredits < wordCount) {
    throw new Error(`Not enough credits. You have ${freshCredits} but need ${wordCount}.`)
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
    .update({ credits: freshCredits - wordCount })
    .eq('id', userId)
  if (creditError) throw new Error(creditError.message)

  return targetDeckId
}
