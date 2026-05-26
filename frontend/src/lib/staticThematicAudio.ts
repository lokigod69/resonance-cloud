import type { SupabaseClient } from '@supabase/supabase-js'

export type StaticThematicPlaybackRow = {
  target_language_code: string
  category_slug: string
  level_number: number
  concept_id: string
  spoken_text: string
  public_url: string
  duration_ms: number | null
  audio_version: number
  voice_profile_key: string
  qa_status: string
}

export type StaticThematicPlaybackQuery = {
  table: 'static_tts_playback'
  filters: {
    target_language_code: string
    category_slug: string
    level_number: number
  }
  conceptIds: string[]
}

export function buildStaticThematicPlaybackQuery({
  targetLanguageCode,
  categorySlug,
  levelNumber,
  conceptIds,
}: {
  targetLanguageCode: string
  categorySlug: string
  levelNumber: number
  conceptIds: string[]
}): StaticThematicPlaybackQuery {
  return {
    table: 'static_tts_playback',
    filters: {
      target_language_code: targetLanguageCode,
      category_slug: categorySlug,
      level_number: levelNumber,
    },
    conceptIds: [...new Set(conceptIds.filter(Boolean))],
  }
}

export function buildStaticThematicAudioLookup(
  rows: StaticThematicPlaybackRow[],
): Map<string, StaticThematicPlaybackRow> {
  const lookup = new Map<string, StaticThematicPlaybackRow>()
  for (const row of rows) {
    if (!row.concept_id || !row.public_url) continue
    lookup.set(row.concept_id, row)
  }
  return lookup
}

export async function fetchStaticThematicPlayback(
  supabase: SupabaseClient,
  query: StaticThematicPlaybackQuery,
): Promise<Map<string, StaticThematicPlaybackRow>> {
  if (query.conceptIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from(query.table)
    .select(
      'target_language_code,category_slug,level_number,concept_id,spoken_text,public_url,duration_ms,audio_version,voice_profile_key,qa_status',
    )
    .eq('target_language_code', query.filters.target_language_code)
    .eq('category_slug', query.filters.category_slug)
    .eq('level_number', query.filters.level_number)
    .in('concept_id', query.conceptIds)

  if (error) throw error
  return buildStaticThematicAudioLookup((data ?? []) as StaticThematicPlaybackRow[])
}
