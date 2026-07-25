import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { readCurriculumMetadata } from '@/lib/curriculumDeckBridge'
import { resolveStaticCategoryTargetLanguageCode } from '@/data/categories'
import {
  buildStaticThematicPlaybackQuery,
  fetchStaticThematicPlayback,
  getStaticThematicAudio,
  getStaticThematicVoiceProfileKeys,
} from '@/lib/staticThematicAudio'
import type { LemmaState } from '@/hooks/useWordStates'

// Batched thumbnail/TTS lookup for words riding the Home water.
//
// This is a copy of the lookup inside WordTide.tsx (:150-242) — that file is
// frozen under wave-rider's uncommitted diff, so the logic cannot be exported
// from it. Temporary duplication, marked for post-wave-rider consolidation.
//
// Audio resolves the way the importer and Surf do: any sibling row's
// tts_audio_url first, then the curriculum metadata's static url, then a
// static_tts_playback lookup for curated concepts whose rows carry neither —
// only after all of that does playPronunciation fall back to browser speech.
// Entries are cached by globally-unique word id (the lemma's representative
// wordIds[0]), so late writes stay correct even across a language switch.

export type HomeWordDetail = {
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
}

function findString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0)
}

type SetDetails = (updater: (prev: Map<string, HomeWordDetail>) => Map<string, HomeWordDetail>) => void

/** Query details for `lemmas` (already deduped by the caller) and stream them
 * into `setDetails` — first the words rows, then any static-thematic patches.
 * Not cancellable by design: results are keyed by word id, so late writes are
 * always safe to apply. */
export function queryHomeWordDetails(lemmas: LemmaState[], language: string, setDetails: SetDetails): void {
  if (lemmas.length === 0) return

  void supabase
    .from('words')
    .select('id, thumbnail_url, tts_audio_url, metadata')
    .in('id', lemmas.flatMap((lemma) => lemma.wordIds))
    .then(({ data }) => {
      const rowById = new Map(
        ((data ?? []) as Array<{ id: string; thumbnail_url: string | null; tts_audio_url: string | null; metadata: unknown }>)
          .map((row) => [row.id, row]),
      )
      const entries = new Map<string, HomeWordDetail>()
      const requests = new Map<string, StaticAudioRequest>()

      for (const lemma of lemmas) {
        const rows = lemma.wordIds.flatMap((id) => rowById.get(id) ?? [])
        const curricula = rows.map((row) => readCurriculumMetadata(row.metadata))
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
              ?? { targetLanguageCode, categorySlug, level, conceptIds: [], detailKeyByConceptId: new Map<string, string>() }
            if (!request.detailKeyByConceptId.has(conceptId)) {
              request.conceptIds.push(conceptId)
              request.detailKeyByConceptId.set(conceptId, lemma.wordIds[0])
            }
            requests.set(key, request)
            pendingStatic = true
            break
          }
        }
        entries.set(lemma.wordIds[0], { thumbnailUrl, ttsAudioUrl, ttsResolved: !pendingStatic })
      }

      setDetails((prev) => {
        const next = new Map(prev)
        entries.forEach((value, key) => next.set(key, value))
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
              if (!current || current.ttsResolved) return
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
 * in-flight queries by representative word id without retriggering on
 * `details` changes. */
export function useHomeWordDetails(visible: LemmaState[], language: string): Map<string, HomeWordDetail> {
  const [details, setDetails] = useState<Map<string, HomeWordDetail>>(new Map())
  // Word ids already sent to the detail lookup — dedupes in-flight queries
  // without retriggering the effect the way keying off `details` would.
  const queriedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const missing = visible.filter((lemma) => lemma.wordIds.length > 0 && !queriedIdsRef.current.has(lemma.wordIds[0]))
    if (missing.length === 0) return
    for (const lemma of missing) queriedIdsRef.current.add(lemma.wordIds[0])
    queryHomeWordDetails(missing, language, setDetails)
  }, [visible, language])

  return details
}
