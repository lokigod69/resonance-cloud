import type { GameWordRow } from '../../shared/useGameDeck'
import { getLanguageCode } from '@/lib/languages'
import { normalizeTerm } from '../engine/sequencer'
import type { SurfDeck } from '../engine/types'

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
