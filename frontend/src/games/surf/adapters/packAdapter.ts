import type { SelectedCategoryVocabularyItem } from '@/data/categories'
import { getStaticThematicAudio, type StaticThematicPlaybackRow } from '@/lib/staticThematicAudio'
import { normalizeTerm } from '../engine/sequencer'
import type { SurfDeck } from '../engine/types'

export function packToSurfDeck(
  items: SelectedCategoryVocabularyItem[],
  opts: { id: string; label: string; languageCode: string },
): SurfDeck {
  const seenTerms = new Set<string>()
  const cards = items.flatMap((item) => {
    const target = item.targetTerm.trim()
    const helper = item.helperTerm.trim()
    const normalized = normalizeTerm(target)
    if (
      !target
      || !helper
      || item.translations[item.targetLanguage]?.isFallback
      || normalized === normalizeTerm(helper)
      || seenTerms.has(normalized)
    ) return []
    seenTerms.add(normalized)
    return [{
      id: item.conceptId,
      term: target,
      prompt: helper,
      audioUrl: null,
      languageCode: opts.languageCode,
    }]
  })

  return {
    id: opts.id,
    label: opts.label,
    source: 'pack',
    languageCode: opts.languageCode,
    cards,
  }
}

export function attachPackAudio(
  deck: SurfDeck,
  lookup: Map<string, Map<string, StaticThematicPlaybackRow>>,
  voiceProfileKey?: string,
): SurfDeck {
  deck.cards.forEach((card) => {
    const audioUrl = resolveStaticThematicAudioUrl(lookup, card.id, voiceProfileKey)
    if (audioUrl) card.audioUrl = audioUrl
  })
  return deck
}

export function resolveStaticThematicAudioUrl(
  lookup: Map<string, Map<string, StaticThematicPlaybackRow>>,
  conceptId: string,
  voiceProfileKey?: string,
): string | null {
  const audio = getStaticThematicAudio(lookup, conceptId, voiceProfileKey)
    ?? getStaticThematicAudio(lookup, conceptId)
  return audio?.public_url ?? null
}
