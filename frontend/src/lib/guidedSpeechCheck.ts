export type GuidedSpeechCheckStatus = 'correct' | 'close' | 'incorrect'

export type GuidedSpeechCheckInput = {
  transcript: string
  targetAnswer: string
  acceptedAnswers?: string[]
  requiredTokens?: string[]
  optionalTokens?: string[]
}

export type GuidedSpeechCheckResult = {
  status: GuidedSpeechCheckStatus
  reason: 'exact' | 'variant' | 'core_tokens' | 'close_missing_token' | 'low_similarity' | 'empty'
  normalizedTranscript: string
  normalizedTarget: string
  score: number
  missingTokens: string[]
}

const EDGE_FILLERS = new Set(['uh', 'um', 'please', 'maybe'])

const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bcan't\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'],
  [/\bdidn't\b/g, 'did not'],
  [/\bi'm\b/g, 'i am'],
  [/\byou're\b/g, 'you are'],
  [/\bwe're\b/g, 'we are'],
  [/\bthey're\b/g, 'they are'],
  [/\bit's\b/g, 'it is'],
]

export function normalizeGuidedSpeechPhrase(text: string): string {
  let normalized = text.toLowerCase().trim()
  for (const [pattern, replacement] of CONTRACTIONS) {
    normalized = normalized.replace(pattern, replacement)
  }

  const words = normalized
    .replace(/['\u2019]/g, '')
    // Unicode-aware: must keep non-Latin scripts (Hangul, Cyrillic, \u2026) and Latin
    // diacritics intact \u2014 an ASCII-only class erases them and empties the transcript.
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  while (words.length > 0 && EDGE_FILLERS.has(words[0])) {
    words.shift()
  }
  while (words.length > 0 && EDGE_FILLERS.has(words[words.length - 1])) {
    words.pop()
  }

  return words.join(' ')
}

export function tokenizeGuidedSpeech(text: string): string[] {
  const normalized = normalizeGuidedSpeechPhrase(text)
  return normalized ? normalized.split(/\s+/) : []
}

export function checkGuidedSpeechAnswer(input: GuidedSpeechCheckInput): GuidedSpeechCheckResult {
  const normalizedTranscript = normalizeGuidedSpeechPhrase(input.transcript)
  const normalizedTarget = normalizeGuidedSpeechPhrase(input.targetAnswer)
  const acceptedAnswers = uniqueNormalized([
    input.targetAnswer,
    ...(input.acceptedAnswers ?? []),
  ])
  const requiredTokens = (input.requiredTokens?.length
    ? input.requiredTokens
    : tokenizeGuidedSpeech(input.targetAnswer))
    .map(normalizeGuidedSpeechPhrase)
    .filter(Boolean)
  const normalizedRequiredTokens = input.optionalTokens?.length
    ? requiredTokens.filter((token) => !input.optionalTokens!.map(normalizeGuidedSpeechPhrase).includes(token))
    : requiredTokens

  if (!normalizedTranscript) {
    return result('incorrect', 'empty', normalizedTranscript, normalizedTarget, 0, normalizedRequiredTokens)
  }

  if (normalizedTranscript === normalizedTarget) {
    return result('correct', 'exact', normalizedTranscript, normalizedTarget, 1, [])
  }

  if (acceptedAnswers.includes(normalizedTranscript)) {
    return result('correct', 'variant', normalizedTranscript, normalizedTarget, 1, [])
  }

  const transcriptTokens = tokenizeGuidedSpeech(input.transcript)
  const missingTokens = normalizedRequiredTokens.filter((token) => !transcriptTokens.includes(token))
  const requiredInOrder = tokensAppearInOrder(transcriptTokens, normalizedRequiredTokens)

  if (normalizedRequiredTokens.length > 0 && requiredInOrder && missingTokens.length === 0) {
    return result('correct', 'core_tokens', normalizedTranscript, normalizedTarget, 1, [])
  }

  const score = tokenSimilarity(transcriptTokens, normalizedRequiredTokens)
  if (score >= 0.72 && missingTokens.length <= Math.max(1, Math.floor(normalizedRequiredTokens.length * 0.25))) {
    return result('close', 'close_missing_token', normalizedTranscript, normalizedTarget, score, missingTokens)
  }

  return result('incorrect', 'low_similarity', normalizedTranscript, normalizedTarget, score, missingTokens)
}

function uniqueNormalized(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeGuidedSpeechPhrase).filter(Boolean)))
}

function tokensAppearInOrder(transcriptTokens: string[], requiredTokens: string[]): boolean {
  if (requiredTokens.length === 0) return false
  let cursor = 0
  for (const token of transcriptTokens) {
    if (token === requiredTokens[cursor]) cursor += 1
    if (cursor === requiredTokens.length) return true
  }
  return false
}

function tokenSimilarity(transcriptTokens: string[], requiredTokens: string[]): number {
  if (requiredTokens.length === 0) return 0
  const transcriptSet = new Set(transcriptTokens)
  const matched = requiredTokens.filter((token) => transcriptSet.has(token)).length
  return matched / requiredTokens.length
}

function result(
  status: GuidedSpeechCheckStatus,
  reason: GuidedSpeechCheckResult['reason'],
  normalizedTranscript: string,
  normalizedTarget: string,
  score: number,
  missingTokens: string[],
): GuidedSpeechCheckResult {
  return {
    status,
    reason,
    normalizedTranscript,
    normalizedTarget,
    score,
    missingTokens,
  }
}
