import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { readCurriculumMetadata } from '@/lib/curriculumMetadata'
// The light language module, not `@/data/categories` — the latter would drag
// the ~2 MB translation table into the home chunk for one code lookup.
import { resolveStaticCategoryTargetLanguageCode } from '@/data/staticCategoryLanguages'
import {
  buildStaticThematicPlaybackQuery,
  fetchStaticThematicPlayback,
  getStaticThematicAudio,
  getStaticThematicVoiceProfileKeys,
} from '@/lib/staticThematicAudio'
import type { LemmaState } from '@/hooks/useWordStates'

// Batched thumbnail/TTS lookup for words riding the Home water.
//
// Originally copied from the lookup in the now-removed WordTide.tsx (last
// version in `55e8729b`); this is the only copy.
//
// Audio resolves the way the importer and Surf do: any sibling row's
// tts_audio_url first, then the curriculum metadata's static url, then a
// static_tts_playback lookup for curated concepts whose rows carry neither —
// only after all of that does playPronunciation fall back to browser speech.
// Entries carry their language, displayed text and sibling identities, so an
// edited headword cannot reuse a cached or late result for its previous text.

export type HomeWordDetail = {
  sourceIdentity: string
  thumbnailUrl: string | null
  ttsAudioUrl: string | null
  // False while a static_tts_playback lookup may still fill ttsAudioUrl in —
  // playing before it lands would wrongly fall back to browser speech.
  ttsResolved: boolean
}

// One static_tts_playback query per (language, category, level) group of
// curated words whose rows lack both tts_audio_url and a metadata static url.
type StaticAudioRequest = {
  targetLanguageCode: string
  categorySlug: string
  level: number
  conceptIds: string[]
  detailKeyByConceptId: Map<string, string>
  identityByConceptId: Map<string, string>
}

type WordDetailRow = {
  id: string
  word: string
  original_input: string | null
  curriculum_entry_term: string | null
  thumbnail_url: string | null
  tts_audio_url: string | null
  metadata: unknown
}

function detailIdentity(lemma: LemmaState, language: string): string {
  return JSON.stringify([language, lemma.displayWord, lemma.wordIds])
}

function hasMatchingCurriculumText(row: WordDetailRow): boolean {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {}
  // These fields are target text in the respective import RPCs. Other
  // pipelines may put base-language input in original_input: do not use it.
  const sourceText = row.curriculum_entry_term
    || (metadata.origin === 'word_stream' ? row.original_input : null)
  return !sourceText || row.word.trim().normalize('NFC') === sourceText.trim().normalize('NFC')
}

function findString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0)
}

type SetDetails = (updater: (prev: Map<string, HomeWordDetail>) => Map<string, HomeWordDetail>) => void

/** Query details for `lemmas` (already deduped by the caller) and stream them
 * into `setDetails` — first the words rows, then any static-thematic patches.
 * Optional identity validation prevents late reads from replacing newer text. */
export function queryHomeWordDetails(
  lemmas: LemmaState[],
  language: string,
  setDetails: SetDetails,
  isCurrent: (lemma: LemmaState) => boolean = () => true,
): void {
  if (lemmas.length === 0) return

  void supabase
    .from('words')
    .select('id, word, original_input, curriculum_entry_term, thumbnail_url, tts_audio_url, metadata')
    .in('id', lemmas.flatMap((lemma) => lemma.wordIds))
    .then(({ data }) => {
      const rowById = new Map(
        ((data ?? []) as WordDetailRow[])
          .map((row) => [row.id, row]),
      )
      const entries = new Map<string, HomeWordDetail>()
      const requests = new Map<string, StaticAudioRequest>()

      for (const lemma of lemmas) {
        if (!isCurrent(lemma)) continue
        const rows = lemma.wordIds.flatMap((id) => rowById.get(id) ?? [])
        const curricula = rows.filter(hasMatchingCurriculumText).map((row) => readCurriculumMetadata(row.metadata))
        const sourceIdentity = detailIdentity(lemma, language)
        const thumbnailUrl = rows.find((row) => row.thumbnail_url)?.thumbnail_url ?? null
        const ttsAudioUrl = rows.find((row) => row.tts_audio_url)?.tts_audio_url
          ?? findString(...curricula.map((curriculum) => curriculum.static_tts_public_url))
          ?? null

        let pendingStatic = false
        if (!ttsAudioUrl) {
          for (const curriculum of curricula) {
            const conceptId = findString(curriculum.source_concept_id, curriculum.concept_id, curriculum.entry_id)
            if (!conceptId) continue
            const categorySlug = findString(curriculum.source_category_slug, curriculum.category_slug)
              ?? (conceptId.includes('.') ? conceptId.slice(0, conceptId.indexOf('.')) : '')
            if (!categorySlug) continue
            const targetLanguageCode = findString(curriculum.source_target_language_code, curriculum.target_language_code)
              ?? resolveStaticCategoryTargetLanguageCode(language)
            const level = [curriculum.source_level_number, curriculum.level]
              .find((value): value is number => typeof value === 'number' && Number.isFinite(value)) ?? 1
            const key = `${targetLanguageCode}:${categorySlug}:${level}`
            const request = requests.get(key)
              ?? { targetLanguageCode, categorySlug, level, conceptIds: [], detailKeyByConceptId: new Map<string, string>(), identityByConceptId: new Map<string, string>() }
            if (!request.detailKeyByConceptId.has(conceptId)) {
              request.conceptIds.push(conceptId)
              request.detailKeyByConceptId.set(conceptId, lemma.wordIds[0])
              request.identityByConceptId.set(conceptId, sourceIdentity)
            }
            requests.set(key, request)
            pendingStatic = true
            break
          }
        }
        entries.set(lemma.wordIds[0], { sourceIdentity, thumbnailUrl, ttsAudioUrl, ttsResolved: !pendingStatic })
      }

      setDetails((prev) => {
        const next = new Map(prev)
        for (const lemma of lemmas) {
          const entry = entries.get(lemma.wordIds[0])
          if (entry && isCurrent(lemma)) next.set(lemma.wordIds[0], entry)
        }
        return next
      })

      requests.forEach((request) => {
        const voiceProfileKeys = getStaticThematicVoiceProfileKeys({
          targetLanguageCode: request.targetLanguageCode,
          categorySlug: request.categorySlug,
        })
        const finish = (resolveUrl: (conceptId: string) => string | null) => {
          setDetails((prev) => {
            const next = new Map(prev)
            request.detailKeyByConceptId.forEach((detailKey, conceptId) => {
              const current = next.get(detailKey)
              if (!current || current.ttsResolved || current.sourceIdentity !== request.identityByConceptId.get(conceptId)) return
              next.set(detailKey, { ...current, ttsAudioUrl: current.ttsAudioUrl ?? resolveUrl(conceptId), ttsResolved: true })
            })
            return next
          })
        }
        fetchStaticThematicPlayback(supabase, buildStaticThematicPlaybackQuery({
          targetLanguageCode: request.targetLanguageCode,
          categorySlug: request.categorySlug,
          levelNumber: request.level,
          conceptIds: request.conceptIds,
          voiceProfileKeys,
        }))
          .then((lookup) => finish((conceptId) => {
            // Preferred-voice ordering, same as the importer's resolution.
            for (const voiceProfileKey of voiceProfileKeys ?? [undefined]) {
              const row = getStaticThematicAudio(lookup, conceptId, voiceProfileKey)
              if (row?.public_url) return row.public_url
            }
            return null
          }))
          .catch(() => finish(() => null))
      })
    })
}

/** Session-cached details for the currently visible water words. Dedupes
 * in-flight queries by content identity without retriggering on details. */
export function useHomeWordDetails(visible: LemmaState[], language: string): Map<string, HomeWordDetail> {
  const [details, setDetails] = useState<Map<string, HomeWordDetail>>(new Map())
  // Last requested content for each word; changing its text starts a new read.
  const queriedIdentitiesRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    const missing = visible.filter((lemma) => lemma.wordIds.length > 0
      && queriedIdentitiesRef.current.get(lemma.wordIds[0]) !== detailIdentity(lemma, language))
    if (missing.length === 0) return
    for (const lemma of missing) queriedIdentitiesRef.current.set(lemma.wordIds[0], detailIdentity(lemma, language))
    queryHomeWordDetails(missing, language, setDetails,
      (lemma) => queriedIdentitiesRef.current.get(lemma.wordIds[0]) === detailIdentity(lemma, language))
  }, [visible, language])

  // Hide the previous text's audio in the render before the effect refetches.
  return useMemo(() => new Map(visible.flatMap((lemma) => {
    const detail = details.get(lemma.wordIds[0])
    return detail?.sourceIdentity === detailIdentity(lemma, language) ? [[lemma.wordIds[0], detail] as const] : []
  })), [details, visible, language])
}
