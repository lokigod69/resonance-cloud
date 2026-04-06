import { supabase } from './supabase'

const NANOID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

function nanoid(length = 8): string {
  let id = ''
  for (let i = 0; i < length; i++) {
    id += NANOID_CHARS[Math.floor(Math.random() * NANOID_CHARS.length)]
  }
  return id
}

export async function getOrCreateShareLink(wordId: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Reuse existing share link for this user+word combo
    const { data: existing } = await supabase
      .from('shared_words')
      .select('id')
      .eq('user_id', user.id)
      .eq('word_id', wordId)
      .maybeSingle()

    if (existing) {
      return `${window.location.origin}/v/${existing.id}`
    }

    // Create new share link
    const id = nanoid(8)
    const { error } = await supabase
      .from('shared_words')
      .insert({ id, word_id: wordId, user_id: user.id })

    if (error) {
      console.error('[share] Failed to create share link:', error)
      return null
    }

    return `${window.location.origin}/v/${id}`
  } catch (err) {
    console.error('[share] Error:', err)
    return null
  }
}
