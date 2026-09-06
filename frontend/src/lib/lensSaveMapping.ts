import type { LensScanItem } from '@/lib/lensTypes'

export type LensSaveRpcItem = {
  client_id: string
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

export type LensSaveInputItem = {
  clientId: string
  item: LensScanItem
}

export type LensSaveOutcome = {
  clientId: string
  wordId: string
  status: 'inserted' | 'skipped'
}

export type LensSaveResult = {
  deckId: string
  inserted: number
  skipped: number
  /** Null only while the new client is talking to the legacy count-only RPC. */
  outcomes: LensSaveOutcome[] | null
}

export type LensSaveReceipt = {
  inserted: number
  skipped: number
  decks: Array<{ deckId: string; language: string }>
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
  items: LensSaveInputItem[],
  options: { targetLanguage: string },
): LensSaveRpcItem[] {
  const seenClientIds = new Set<string>()
  return items.map(({ clientId, item }) => {
    const normalizedClientId = clientId.trim()
    const word = item.target_text.trim()
    const translation = item.base_text.trim()
    if (!normalizedClientId || normalizedClientId.length > 200) {
      throw new Error('Lens save item has an invalid client id')
    }
    if (seenClientIds.has(normalizedClientId)) {
      throw new Error('Lens save item has a duplicate client id')
    }
    if (!word || !translation) {
      throw new Error('Lens save item is missing text')
    }
    seenClientIds.add(normalizedClientId)

    const mapped: LensSaveRpcItem = {
      client_id: normalizedClientId,
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
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function nonNegativeInteger(value: unknown): number | null {
  const number = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN
  return Number.isSafeInteger(number) && number >= 0 ? number : null
}

/** Validate the RPC receipt before any recap row is marked saved/known. */
export function parseLensSaveResult(raw: unknown, submittedClientIds: string[]): LensSaveResult {
  const result = recordOrNull(raw)
  const deckIdValue = result?.deck_id ?? result?.deckId
  const deckId = typeof deckIdValue === 'string' ? deckIdValue.trim() : ''
  const inserted = nonNegativeInteger(result?.inserted)
  const skipped = nonNegativeInteger(result?.skipped)
  if (!result || !deckId || inserted === null || skipped === null || inserted + skipped !== submittedClientIds.length) {
    throw new Error('Lens save returned an invalid receipt')
  }

  if (!('outcomes' in result) || result.outcomes === undefined || result.outcomes === null) {
    return { deckId, inserted, skipped, outcomes: null }
  }
  if (!Array.isArray(result.outcomes) || result.outcomes.length !== submittedClientIds.length) {
    throw new Error('Lens save returned invalid item outcomes')
  }

  const outcomes = result.outcomes.map((rawOutcome, index): LensSaveOutcome => {
    const outcome = recordOrNull(rawOutcome)
    const clientIdValue = outcome?.client_id ?? outcome?.clientId
    const wordIdValue = outcome?.word_id ?? outcome?.wordId
    const clientId = typeof clientIdValue === 'string' ? clientIdValue : ''
    const wordId = typeof wordIdValue === 'string' ? wordIdValue.trim() : ''
    const status = outcome?.status
    if (clientId !== submittedClientIds[index] || !wordId || (status !== 'inserted' && status !== 'skipped')) {
      throw new Error('Lens save returned invalid item outcomes')
    }
    return { clientId, wordId, status }
  })

  const outcomeInserted = outcomes.filter((outcome) => outcome.status === 'inserted').length
  if (outcomeInserted !== inserted || outcomes.length - outcomeInserted !== skipped) {
    throw new Error('Lens save counts do not match item outcomes')
  }
  return { deckId, inserted, skipped, outcomes }
}

export function combineLensSaveReceipts(
  parts: Array<{ language: string; result: LensSaveResult }>,
): LensSaveReceipt | null {
  if (parts.length === 0) return null
  const decks = new Map<string, { deckId: string; language: string }>()
  let inserted = 0
  let skipped = 0
  parts.forEach(({ language, result }) => {
    inserted += result.inserted
    skipped += result.skipped
    const key = `${result.deckId}\u0000${language}`
    if (!decks.has(key)) decks.set(key, { deckId: result.deckId, language })
  })
  return { inserted, skipped, decks: Array.from(decks.values()) }
}

type LensSaveTrackedItem = {
  id: string
  saved: boolean
  alreadyPresent?: boolean
  wordId?: string
}

/** Apply only outcomes the server can identify; legacy mixed counts change no rows. */
export function reconcileLensSaveResult<T extends LensSaveTrackedItem>(
  items: T[],
  submittedClientIds: string[],
  result: LensSaveResult,
): T[] {
  const submittedIds = new Set(submittedClientIds)
  const exactOutcomes = result.outcomes
    ? new Map(result.outcomes.map((outcome) => [outcome.clientId, outcome]))
    : null
  const allInserted = result.inserted === submittedClientIds.length && result.skipped === 0
  const allSkipped = result.inserted === 0 && result.skipped === submittedClientIds.length

  return items.map((item) => {
    const outcome = exactOutcomes?.get(item.id)
    if (outcome) {
      return outcome.status === 'inserted'
        ? { ...item, saved: true, alreadyPresent: false, wordId: outcome.wordId }
        : { ...item, alreadyPresent: true, wordId: outcome.wordId }
    }
    if (!submittedIds.has(item.id)) return item
    if (allInserted) return { ...item, saved: true, alreadyPresent: false }
    if (allSkipped) return { ...item, alreadyPresent: true }
    return item
  })
}
