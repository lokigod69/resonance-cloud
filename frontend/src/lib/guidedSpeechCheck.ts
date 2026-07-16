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

// Japanese (and Chinese) ASR transcripts arrive as one unspaced string, so the
// whitespace tokenization below can never match them — CJK targets compare
// space-insensitively and match required tokens as substrings instead. Hangul is
// deliberately NOT in this class: Korean ASR emits spaces and keeps the word path.
const CJK_SCRIPT_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u

const squashWhitespace = (text: string) => text.replace(/\s+/g, '')

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

  if (CJK_SCRIPT_PATTERN.test(input.targetAnswer)) {
    return checkCjkAnswer(normalizedTranscript, normalizedTarget, acceptedAnswers, normalizedRequiredTokens)
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

function checkCjkAnswer(
  normalizedTranscript: string,
  normalizedTarget: string,
  acceptedAnswers: string[],
  requiredTokens: string[],
): GuidedSpeechCheckResult {
  const transcript = squashWhitespace(normalizedTranscript)
  const target = squashWhitespace(normalizedTarget)

  if (transcript === target) {
    return result('correct', 'exact', normalizedTranscript, normalizedTarget, 1, [])
  }

  if (acceptedAnswers.some((answer) => squashWhitespace(answer) === transcript)) {
    return result('correct', 'variant', normalizedTranscript, normalizedTarget, 1, [])
  }

  const squashedTokens = requiredTokens.map(squashWhitespace).filter(Boolean)
  const missingTokens = squashedTokens.filter((token) => !transcript.includes(token))

  let cursor = 0
  let inOrder = squashedTokens.length > 0
  for (const token of squashedTokens) {
    const index = transcript.indexOf(token, cursor)
    if (index === -1) {
      inOrder = false
      break
    }
    cursor = index + token.length
  }

  if (inOrder && missingTokens.length === 0) {
    return result('correct', 'core_tokens', normalizedTranscript, normalizedTarget, 1, [])
  }

  const score = squashedTokens.length > 0
    ? (squashedTokens.length - missingTokens.length) / squashedTokens.length
    : 0
  if (score >= 0.72 && missingTokens.length <= Math.max(1, Math.floor(squashedTokens.length * 0.25))) {
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
