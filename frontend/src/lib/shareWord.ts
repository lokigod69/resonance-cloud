import { supabase } from './supabase'
import { getPublicWebUrl } from './publicOrigins'
import { analytics, deterministicUuid } from './analytics'

export async function getOrCreateShareLink(wordId: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase.rpc('create_or_get_share_link', {
      p_word_id: wordId,
    })
    if (error) {
      console.error('[share] Failed to create share link:', error)
      return null
    }

    const result = data as { id?: string; path?: string } | null
    const path = result?.path || (result?.id ? `/v/${result.id}` : null)
    if (path) {
      // create_or_get is idempotent, so re-sharing the same word re-enters
      // here; the per-user+word uuid keeps same-day repeats from inflating.
      analytics.track('share', { kind: 'word' }, {
        uuid: deterministicUuid(`share:${user.id}:${wordId}`),
      })
    }
    return path ? getPublicWebUrl(path) : null
  } catch (err) {
    console.error('[share] Error:', err)
    return null
  }
}
