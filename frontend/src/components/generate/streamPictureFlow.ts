import { canonicalizeLanguageValue } from '@/lib/languages'
import { wordsEqual } from '@/lib/wordEquality'

export type StreamPictureContext = {
  targetTerm: string
  helperTerm: string
  targetLanguageName: string
  targetLanguageCode: string
  helperLanguageName: string | null
  helperLanguageCode: string | null
}

export function resolveStreamPictureContext(
  navigationState: unknown,
  expectedWord: string | null,
  expectedLanguage: string,
): StreamPictureContext | null {
  if (!expectedWord || !navigationState || typeof navigationState !== 'object') return null
  const candidate = (navigationState as { streamWord?: unknown }).streamWord
  if (!candidate || typeof candidate !== 'object') return null

  const row = candidate as Record<string, unknown>
  if (
    typeof row.targetTerm !== 'string'
    || typeof row.helperTerm !== 'string'
    || typeof row.targetLanguageName !== 'string'
    || typeof row.targetLanguageCode !== 'string'
  ) return null

  if (!wordsEqual(row.targetTerm, expectedWord)) return null
  if (canonicalizeLanguageValue(row.targetLanguageName) !== expectedLanguage) return null
  if (canonicalizeLanguageValue(row.targetLanguageCode) !== expectedLanguage) return null

  return {
    targetTerm: row.targetTerm,
    helperTerm: row.helperTerm,
    targetLanguageName: row.targetLanguageName,
    targetLanguageCode: row.targetLanguageCode,
    helperLanguageName: typeof row.helperLanguageName === 'string' ? row.helperLanguageName : null,
    helperLanguageCode: typeof row.helperLanguageCode === 'string' ? row.helperLanguageCode : null,
  }
}

export function streamPictureDeckName(word: string): string {
  return word.trim().slice(0, 50)
}

export function canSubmitStreamPicture(
  credits: number | undefined,
  creditCost: number,
  submitting: boolean,
): boolean {
  return !submitting && typeof credits === 'number' && credits >= creditCost
}
