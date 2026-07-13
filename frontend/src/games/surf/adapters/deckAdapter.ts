import type { GameWordRow } from '../../shared/useGameDeck'
import { readCurriculumMetadata } from '@/lib/curriculumDeckBridge'
import { getLanguageCode } from '@/lib/languages'
import type { StaticThematicPlaybackRow } from '@/lib/staticThematicAudio'
import { normalizeTerm } from '../engine/sequencer'
import type { SurfDeck } from '../engine/types'
import { resolveStaticThematicAudioUrl } from './packAdapter'

export type DeckStaticAudioRequest = {
  categorySlug: string
  level: number
  conceptIds: string[]
  rowIdByConceptId: Map<string, string>
}

export function wordsToSurfDeck(
  rows: GameWordRow[],
  opts: { id: string; label: string; source: 'deck' | 'due'; language: string | null },
): SurfDeck {
  const seenTerms = new Set<string>()
  const cards = rows.flatMap((row) => {
    const term = row.word.trim()
    const prompt = row.translation?.trim() ?? ''
    const normalized = normalizeTerm(term)
    if (!term || !prompt || seenTerms.has(normalized)) return []
    seenTerms.add(normalized)
    return [{
      id: row.id,
      term,
      prompt,
      audioUrl: row.tts_audio_url ?? null,
      languageCode: getLanguageCode(row.decks?.target_language ?? opts.language ?? '') || null,
    }]
  })

  return {
    id: opts.id,
    label: opts.label,
    source: opts.source,
    languageCode: getLanguageCode(opts.language) || null,
    cards,
  }
}

export function collectDeckStaticAudioRequests(rows: GameWordRow[]): DeckStaticAudioRequest[] {
  const groups = new Map<string, DeckStaticAudioRequest>()

  for (const row of rows) {
    if (row.tts_audio_url !== null) continue
    const curriculum = readCurriculumMetadata(row.metadata)
    const conceptId = curriculum.source_concept_id ?? curriculum.concept_id ?? curriculum.entry_id
    if (typeof conceptId !== 'string') continue

    const separatorIndex = conceptId.indexOf('.')
    const categorySlug = separatorIndex > 0 ? conceptId.slice(0, separatorIndex) : ''
    if (!categorySlug) continue

    const level = typeof curriculum.level === 'number' && Number.isFinite(curriculum.level)
      ? curriculum.level
      : 1
    const key = `${categorySlug}:${level}`
    const group = groups.get(key) ?? {
      categorySlug,
      level,
      conceptIds: [],
      rowIdByConceptId: new Map<string, string>(),
    }
    if (!group.rowIdByConceptId.has(conceptId)) {
      group.conceptIds.push(conceptId)
      group.rowIdByConceptId.set(conceptId, row.id)
    }
    groups.set(key, group)
  }

  return [...groups.values()]
}

export function attachDeckStaticAudio(
  deck: SurfDeck,
  lookup: Map<string, Map<string, StaticThematicPlaybackRow>>,
  rowIdByConceptId: Map<string, string>,
  preferredVoiceKey?: string,
): SurfDeck {
  const cardsByRowId = new Map(deck.cards.map((card) => [card.id, card]))
  rowIdByConceptId.forEach((rowId, conceptId) => {
    const card = cardsByRowId.get(rowId)
    const audioUrl = resolveStaticThematicAudioUrl(lookup, conceptId, preferredVoiceKey)
    if (card && audioUrl) card.audioUrl = audioUrl
  })
  return deck
}
