import type { LensScanItem } from '@/lib/lensTypes'

export type LensSaveRpcItem = {
  word: string
  translation: string
  is_phrase: boolean
  ipa?: string
  pos?: string
  article?: string
  example?: string
  example_gloss?: string
  transliteration?: string
}

const CJK_LANGUAGE_NAMES = new Set(['Chinese', 'Japanese', 'Korean'])

function cleanOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function isPhraseTarget(targetText: string, targetLanguage: string, article?: string): boolean {
  // Keep this intentionally simple: whitespace marks phrases for non-CJK scripts;
  // CJK tokenization needs a richer segmenter and the RPC remains the final guard.
  if (CJK_LANGUAGE_NAMES.has(targetLanguage.trim())) return false
  const trimmed = targetText.trim()
  const cleanArticle = article?.trim()
  const lexicalText = cleanArticle && trimmed.toLocaleLowerCase().startsWith(`${cleanArticle.toLocaleLowerCase()} `)
    ? trimmed.slice(cleanArticle.length).trim()
    : trimmed
  return /\s/.test(lexicalText)
}

export function mapLensScanItemsForSave(
  items: LensScanItem[],
  options: { targetLanguage: string },
): LensSaveRpcItem[] {
  return items
    .map((item) => {
      const word = item.target_text.trim()
      const translation = item.base_text.trim()
      if (!word || !translation) return null

      const mapped: LensSaveRpcItem = {
        word,
        translation,
        is_phrase: isPhraseTarget(word, options.targetLanguage, item.article),
      }

      const ipa = cleanOptional(item.ipa)
      const pos = cleanOptional(item.pos)
      const article = cleanOptional(item.article)
      const example = cleanOptional(item.example)
      const exampleGloss = cleanOptional(item.example_gloss)
      const transliteration = cleanOptional(item.transliteration)

      if (ipa) mapped.ipa = ipa
      if (pos) mapped.pos = pos
      if (article) mapped.article = article
      if (example) mapped.example = example
      if (exampleGloss) mapped.example_gloss = exampleGloss
      if (transliteration) mapped.transliteration = transliteration

      return mapped
    })
    .filter((item): item is LensSaveRpcItem => item !== null)
}
