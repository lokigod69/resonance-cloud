import type { SupabaseClient } from '@supabase/supabase-js'

export const STATIC_THEMATIC_CEB_YUMI_RAW_PROFILE_KEY = 'static_thematic_ceb_yumi_raw_v1'
export const STATIC_THEMATIC_DE_LAURA_RAW_PROFILE_KEY = 'static_thematic_de_laura_raw_v1'
export const STATIC_THEMATIC_DE_WILLIAM_RAW_PROFILE_KEY = 'static_thematic_de_william_raw_v1'
export const STATIC_THEMATIC_DE_HELMUT_RAW_PROFILE_KEY = 'static_thematic_de_helmut_raw_v1'
export const STATIC_THEMATIC_DE_ENNIAH_RAW_PROFILE_KEY = 'static_thematic_de_enniah_raw_v1'
export const STATIC_THEMATIC_ES_LIA_RAW_PROFILE_KEY = 'static_thematic_es_lia_raw_v1'
export const STATIC_THEMATIC_ES_VERONICA_RAW_PROFILE_KEY = 'static_thematic_es_veronica_raw_v1'
export const STATIC_THEMATIC_ES_EL_FARAO_RAW_PROFILE_KEY = 'static_thematic_es_el_farao_raw_v1'
export const STATIC_THEMATIC_ES_DAVID_RAW_PROFILE_KEY = 'static_thematic_es_david_raw_v1'
export const STATIC_THEMATIC_FR_LILLY_RAW_PROFILE_KEY = 'static_thematic_fr_lilly_raw_v1'
export const STATIC_THEMATIC_FR_STEPHYRA_RAW_PROFILE_KEY = 'static_thematic_fr_stephyra_raw_v1'
export const STATIC_THEMATIC_FR_GUILLAUME_RAW_PROFILE_KEY = 'static_thematic_fr_guillaume_raw_v1'
export const STATIC_THEMATIC_FR_ADAM_RAW_PROFILE_KEY = 'static_thematic_fr_adam_raw_v1'
export const STATIC_THEMATIC_KO_JINI_RAW_PROFILE_KEY = 'static_thematic_ko_jini_raw_v1'
export const STATIC_THEMATIC_KO_YUNA_RAW_PROFILE_KEY = 'static_thematic_ko_yuna_raw_v1'
export const STATIC_THEMATIC_KO_KANNA_RAW_PROFILE_KEY = 'static_thematic_ko_kanna_raw_v1'
export const STATIC_THEMATIC_KO_SELLY_RAW_PROFILE_KEY = 'static_thematic_ko_selly_raw_v1'
export const STATIC_THEMATIC_KO_EMILY_RAW_PROFILE_KEY = 'static_thematic_ko_emily_raw_v1'
export const STATIC_THEMATIC_KO_SOLA_RAW_PROFILE_KEY = 'static_thematic_ko_sola_raw_v1'
// Indonesian uses deterministic per-level voice alternation (odd levels = Gavrila,
// even levels = Blasto). Both keys are queried; the playback view only ever has the
// assigned voice's rows for a given level, so resolution self-selects without dupes.
// Even-level Blasto playback/import uses the headroom-capped +8 dB boosted copy
// (raw Blasto was ~16 dB quieter than Gavrila); raw Blasto usage rows are rejected,
// so only the boosted rows appear in static_tts_playback.
// Portuguese, Italian and Polish were recorded in the same batch as the six
// languages above (static_tts_playback carries their rows) but were never
// wired into playback — switched on 2026-09-04 with the Word Stream so a
// tapped word in those languages plays its recording, not a browser voice.
export const STATIC_THEMATIC_PT_RAQUEL_RAW_PROFILE_KEY = 'static_thematic_pt_raquel_raw_v1'
export const STATIC_THEMATIC_PT_LAIR_RAW_PROFILE_KEY = 'static_thematic_pt_lair_raw_v1'
export const STATIC_THEMATIC_PT_CARLA_RAW_PROFILE_KEY = 'static_thematic_pt_carla_raw_v1'
export const STATIC_THEMATIC_IT_ROSANNA_RAW_PROFILE_KEY = 'static_thematic_it_rosanna_raw_v1'
export const STATIC_THEMATIC_IT_MARCO_RAW_PROFILE_KEY = 'static_thematic_it_marco_raw_v1'
export const STATIC_THEMATIC_IT_SAMANTA_RAW_PROFILE_KEY = 'static_thematic_it_samanta_raw_v1'
export const STATIC_THEMATIC_PL_MARIA_RAW_PROFILE_KEY = 'static_thematic_pl_maria_raw_v1'
export const STATIC_THEMATIC_PL_RYSARD_RAW_PROFILE_KEY = 'static_thematic_pl_rysard_raw_v1'
export const STATIC_THEMATIC_PL_MARTA_RAW_PROFILE_KEY = 'static_thematic_pl_marta_raw_v1'
export const STATIC_THEMATIC_PL_WOJECH_RAW_PROFILE_KEY = 'static_thematic_pl_wojech_raw_v1'
export const STATIC_THEMATIC_ID_GAVRILA_RAW_PROFILE_KEY = 'static_thematic_id_gavrila_raw_v1'
export const STATIC_THEMATIC_ID_BLASTO_RAW_PROFILE_KEY = 'static_thematic_id_blasto_raw_v1'
export const STATIC_THEMATIC_ID_BLASTO_GAIN8_PROFILE_KEY = 'static_thematic_id_blasto_gain8_rawsource_v1'
export const STATIC_ANIMALS_ELISA_RAW_PROFILE_KEY = 'static_thematic_en_animals_elisa_raw_v1'
export const STATIC_ANIMALS_SERAFINA_RAW_PROFILE_KEY = 'static_thematic_en_animals_serafina_raw_v1'

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

export function getStaticThematicVoiceProfileKeys({
  targetLanguageCode,
  categorySlug,
}: {
  targetLanguageCode: string
  categorySlug: string
}): string[] | undefined {
  if (targetLanguageCode === 'ceb') return [STATIC_THEMATIC_CEB_YUMI_RAW_PROFILE_KEY]
  if (targetLanguageCode === 'id') {
    return [STATIC_THEMATIC_ID_GAVRILA_RAW_PROFILE_KEY, STATIC_THEMATIC_ID_BLASTO_GAIN8_PROFILE_KEY]
  }
  if (targetLanguageCode === 'de') {
    return [
      STATIC_THEMATIC_DE_LAURA_RAW_PROFILE_KEY,
      STATIC_THEMATIC_DE_WILLIAM_RAW_PROFILE_KEY,
      STATIC_THEMATIC_DE_HELMUT_RAW_PROFILE_KEY,
      STATIC_THEMATIC_DE_ENNIAH_RAW_PROFILE_KEY,
    ]
  }
  if (targetLanguageCode === 'es') {
    return [
      STATIC_THEMATIC_ES_LIA_RAW_PROFILE_KEY,
      STATIC_THEMATIC_ES_VERONICA_RAW_PROFILE_KEY,
      STATIC_THEMATIC_ES_EL_FARAO_RAW_PROFILE_KEY,
      STATIC_THEMATIC_ES_DAVID_RAW_PROFILE_KEY,
    ]
  }
  if (targetLanguageCode === 'fr') {
    return [
      STATIC_THEMATIC_FR_LILLY_RAW_PROFILE_KEY,
      STATIC_THEMATIC_FR_STEPHYRA_RAW_PROFILE_KEY,
      STATIC_THEMATIC_FR_GUILLAUME_RAW_PROFILE_KEY,
      STATIC_THEMATIC_FR_ADAM_RAW_PROFILE_KEY,
    ]
  }
  if (targetLanguageCode === 'ko') {
    return [
      STATIC_THEMATIC_KO_JINI_RAW_PROFILE_KEY,
      STATIC_THEMATIC_KO_YUNA_RAW_PROFILE_KEY,
      STATIC_THEMATIC_KO_KANNA_RAW_PROFILE_KEY,
      STATIC_THEMATIC_KO_SELLY_RAW_PROFILE_KEY,
      STATIC_THEMATIC_KO_EMILY_RAW_PROFILE_KEY,
      STATIC_THEMATIC_KO_SOLA_RAW_PROFILE_KEY,
    ]
  }
  if (targetLanguageCode === 'pt') {
    return [
      STATIC_THEMATIC_PT_RAQUEL_RAW_PROFILE_KEY,
      STATIC_THEMATIC_PT_LAIR_RAW_PROFILE_KEY,
      STATIC_THEMATIC_PT_CARLA_RAW_PROFILE_KEY,
    ]
  }
  if (targetLanguageCode === 'it') {
    return [
      STATIC_THEMATIC_IT_ROSANNA_RAW_PROFILE_KEY,
      STATIC_THEMATIC_IT_MARCO_RAW_PROFILE_KEY,
      STATIC_THEMATIC_IT_SAMANTA_RAW_PROFILE_KEY,
    ]
  }
  if (targetLanguageCode === 'pl') {
    return [
      STATIC_THEMATIC_PL_MARIA_RAW_PROFILE_KEY,
      STATIC_THEMATIC_PL_RYSARD_RAW_PROFILE_KEY,
      STATIC_THEMATIC_PL_MARTA_RAW_PROFILE_KEY,
      STATIC_THEMATIC_PL_WOJECH_RAW_PROFILE_KEY,
    ]
  }
  if (targetLanguageCode === 'en' && categorySlug === 'animals') {
    return [STATIC_ANIMALS_ELISA_RAW_PROFILE_KEY, STATIC_ANIMALS_SERAFINA_RAW_PROFILE_KEY]
  }
  return undefined
}

export type StaticThematicPlaybackQuery = {
  table: 'static_tts_playback'
  filters: {
    target_language_code: string
    category_slug: string
    level_number: number
  }
  conceptIds: string[]
  voiceProfileKeys?: string[]
}

export function buildStaticThematicPlaybackQuery({
  targetLanguageCode,
  categorySlug,
  levelNumber,
  conceptIds,
  voiceProfileKeys,
}: {
  targetLanguageCode: string
  categorySlug: string
  levelNumber: number
  conceptIds: string[]
  voiceProfileKeys?: string[]
}): StaticThematicPlaybackQuery {
  return {
    table: 'static_tts_playback',
    filters: {
      target_language_code: targetLanguageCode,
      category_slug: categorySlug,
      level_number: levelNumber,
    },
    conceptIds: [...new Set(conceptIds.filter(Boolean))],
    voiceProfileKeys: voiceProfileKeys ? [...new Set(voiceProfileKeys.filter(Boolean))] : undefined,
  }
}

export function buildStaticThematicAudioLookup(
  rows: StaticThematicPlaybackRow[],
): Map<string, Map<string, StaticThematicPlaybackRow>> {
  const lookup = new Map<string, Map<string, StaticThematicPlaybackRow>>()
  for (const row of rows) {
    if (!row.concept_id || !row.public_url) continue
    const byVoice = lookup.get(row.concept_id) ?? new Map<string, StaticThematicPlaybackRow>()
    byVoice.set(row.voice_profile_key, row)
    lookup.set(row.concept_id, byVoice)
  }
  return lookup
}

export function getStaticThematicAudio(
  lookup: Map<string, Map<string, StaticThematicPlaybackRow>>,
  conceptId: string,
  voiceProfileKey?: string,
): StaticThematicPlaybackRow | undefined {
  const byVoice = lookup.get(conceptId)
  if (!byVoice) return undefined
  if (voiceProfileKey) return byVoice.get(voiceProfileKey)
  return byVoice.values().next().value
}

export async function fetchStaticThematicPlayback(
  supabase: SupabaseClient,
  query: StaticThematicPlaybackQuery,
): Promise<Map<string, Map<string, StaticThematicPlaybackRow>>> {
  if (query.conceptIds.length === 0) return new Map()

  let request = supabase
    .from(query.table)
    .select(
      'target_language_code,category_slug,level_number,concept_id,spoken_text,public_url,duration_ms,audio_version,voice_profile_key,qa_status',
    )
    .eq('target_language_code', query.filters.target_language_code)
    .eq('category_slug', query.filters.category_slug)
    .eq('level_number', query.filters.level_number)
    .in('concept_id', query.conceptIds)

  if (query.voiceProfileKeys?.length) {
    request = request.in('voice_profile_key', query.voiceProfileKeys)
  }

  const { data, error } = await request

  if (error) throw error
  return buildStaticThematicAudioLookup((data ?? []) as StaticThematicPlaybackRow[])
}
