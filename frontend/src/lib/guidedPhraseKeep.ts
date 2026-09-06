import { resolveGuidedBaseContent, type GuidedLesson } from '@/data/guidedLessons'
import { supabase } from '@/lib/supabase'
import { toWizardLanguageName } from '@/lib/targetLanguage'
import { withClientDeadline } from '@/lib/clientDeadline'

export async function keepGuidedPhrase(lesson: GuidedLesson, preferredBaseLanguage: string | null | undefined, deckName: string) {
  const meaning = resolveGuidedBaseContent(lesson.corePhrase.baseText, { preferredBaseLanguage, authoredBaseLanguage: lesson.baseLanguage })
  const { data, error } = await withClientDeadline(async (signal) => await supabase.rpc('keep_guided_phrase', {
    p_target_language: toWizardLanguageName(lesson.targetLanguage),
    p_base_language: meaning.language,
    p_deck_name: deckName,
    p_path_id: lesson.pathId,
    p_lesson_id: lesson.id,
    p_vibe: lesson.vibeId,
    p_phrase: lesson.corePhrase.targetText,
    p_translation: meaning.text,
  }).abortSignal(signal), 15_000)
  if (error) throw error
  if (!data || typeof data.deck_id !== 'string' || typeof data.word_id !== 'string' || typeof data.inserted !== 'boolean') {
    throw new Error('The phrase save returned an invalid receipt')
  }
  return { deckId: data.deck_id as string, wordId: data.word_id as string, inserted: data.inserted as boolean }
}
