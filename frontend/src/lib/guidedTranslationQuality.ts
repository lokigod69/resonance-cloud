export type GuidedSourceLocale = 'en' | 'de'

export type GuidedProtectedSpan = {
  placeholder: string
  original: string
}

export type GuidedProtectedText = {
  sourceText: string
  protectedSpans: GuidedProtectedSpan[]
}

export type GuidedProtectedSpanState = 'placeholder' | 'restored'

export type GuidedTranslationQualityInput = {
  sourceText: string
  translatedText: string
  sourceLocale: GuidedSourceLocale
  destinationLocale: string
  targetText?: string
  targetLocale?: string
  sentenceLike?: boolean
  protectedSpans?: readonly GuidedProtectedSpan[]
  protectedSpanState?: GuidedProtectedSpanState
}

const DIRECT_TARGET_KEYS = new Set([
  'targetText',
  'targetPhrase',
  'targetAnswer',
  'displayAnswer',
])

const TARGET_ARRAY_KEYS = new Set([
  'acceptedAnswers',
  'fallbackChoices',
  'highlights',
])

const QUOTED_SPAN = /“[^”\r\n]+”|„[^“\r\n]+“|«[^»\r\n]+»|‹[^›\r\n]+›|「[^」\r\n]+」|(?<![\p{L}\p{N}])‘[^’\r\n]+’(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])‚[^‘\r\n]+‘(?![\p{L}\p{N}])|"[^"\r\n]+"|(?<![\p{L}\p{N}])'[^'\r\n]+'(?![\p{L}\p{N}])/gu
const LEARNED_PLACEHOLDER = /\{LW_TERM_\d+\}/gu
const TEMPLATE_PLACEHOLDER = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/gu
const LATIN_DESTINATIONS = new Set(['en', 'de', 'fr', 'es', 'it', 'pt', 'id', 'pl', 'ceb'])
const SHARED_LOANWORD_GLOSS = /^(?:internet|wi-fi|check-in|check-out)(?:\s*\([^()\r\n]{1,64}\))?$/iu

/** Normalize only for matching. The original authored bytes are always restored. */
export function normalizeGuidedLearnedTerm(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

/**
 * Build a target-language term index from authored lesson data. Base-language
 * prose is deliberately excluded, so ordinary metaphors remain translatable.
 */
export function buildGuidedLearnedTermSet(values: readonly unknown[]): ReadonlySet<string> {
  const terms = new Set<string>()
  const seen = new WeakSet<object>()

  const add = (value: unknown) => {
    if (typeof value !== 'string') return
    const normalized = normalizeGuidedLearnedTerm(value)
    if (normalized) terms.add(normalized)
  }

  const visit = (value: unknown, path: readonly string[] = []) => {
    if (!value || typeof value !== 'object') return
    if (seen.has(value)) return
    seen.add(value)

    if (Array.isArray(value)) {
      const parentKey = path.at(-1) ?? ''
      if (
        TARGET_ARRAY_KEYS.has(parentKey)
        || (parentKey === 'chips' && path.includes('build'))
        || (parentKey === 'choices' && path.includes('cloze'))
      ) value.forEach(add)
      value.forEach((item) => visit(item, path))
      return
    }

    const parentKey = path.at(-1) ?? ''
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (DIRECT_TARGET_KEYS.has(key)) add(child)
      if (key === 'word' && parentKey === 'trophyWord') add(child)
      if (key === 'example' && parentKey === 'trophyWord') add(child)
      if ((key === 'label' || key === 'highlight') && path.includes('pattern')) add(child)
      if ((key === 'answer' || key === 'before' || key === 'after') && (path.includes('typeRecall') || path.includes('cloze'))) add(child)
      if ((key === 'cue' || key === 'text') && path.includes('cloze')) add(child)
      visit(child, [...path, key])
    }
  }

  values.forEach((value) => visit(value))
  return terms
}

function quotedInterior(value: string): string {
  return value.slice(1, -1)
}

function isContainedAuthoredPhrase(quoted: string, learnedTerms: ReadonlySet<string>): boolean {
  const normalized = normalizeGuidedLearnedTerm(quoted)
  if (!normalized) return false
  if (learnedTerms.has(normalized)) return true
  if (normalized.length < 8) return false
  for (const term of learnedTerms) {
    if (term.length <= normalized.length) continue
    if (
      term.startsWith(`${normalized} `)
      || term.endsWith(` ${normalized}`)
      || term.includes(` ${normalized} `)
    ) return true
  }
  return false
}

function targetScriptPattern(targetLanguage: string): RegExp | undefined {
  switch (targetLanguage.trim().toLowerCase()) {
    case 'russian': return /\p{Script=Cyrillic}/u
    case 'korean': return /\p{Script=Hangul}/u
    case 'japanese': return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u
    default: return undefined
  }
}

function targetScriptRuns(targetLanguage: string): RegExp | undefined {
  switch (targetLanguage.trim().toLowerCase()) {
    case 'russian': return /[\p{Script=Cyrillic}\p{Mark}]+(?:[ \t]+[\p{Script=Cyrillic}\p{Mark}]+)*/gu
    case 'korean': return /[\p{Script=Hangul}\p{Mark}]+(?:[ \t]+[\p{Script=Hangul}\p{Mark}]+)*/gu
    case 'japanese': return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{Mark}\u3005\u303b\u309d\u309e\u30fc\u30fd\u30fe\uff70]+(?:[ \t]+[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{Mark}\u3005\u303b\u309d\u309e\u30fc\u30fd\u30fe\uff70]+)*/gu
    default: return undefined
  }
}

/**
 * Replace only authored learned-language spans. Matching quote bytes, including
 * their quote marks, are restored exactly after translation.
 */
export function protectGuidedLearnedSpans(input: {
  sourceText: string
  sourceLocale: GuidedSourceLocale
  targetLanguage: string
  learnedTerms: ReadonlySet<string>
}): GuidedProtectedText {
  const { sourceText, sourceLocale, targetLanguage, learnedTerms } = input
  const ranges: Array<{ start: number; end: number }> = []
  const script = sourceLocale === 'en' || sourceLocale === 'de' ? targetScriptPattern(targetLanguage) : undefined

  for (const match of sourceText.matchAll(QUOTED_SPAN)) {
    const original = match[0]
    const start = match.index
    if (isContainedAuthoredPhrase(quotedInterior(original), learnedTerms) || script?.test(quotedInterior(original))) {
      ranges.push({ start, end: start + original.length })
    }
  }

  const runs = script ? targetScriptRuns(targetLanguage) : undefined
  if (runs) {
    for (const match of sourceText.matchAll(runs)) {
      const start = match.index
      const end = start + match[0].length
      if (!ranges.some((range) => start < range.end && end > range.start)) ranges.push({ start, end })
    }
  }

  ranges.sort((a, b) => a.start - b.start || b.end - a.end)
  const nonOverlapping = ranges.filter((range, index, all) => index === 0 || range.start >= all[index - 1].end)
  const protectedSpans: GuidedProtectedSpan[] = []
  let cursor = 0
  let protectedText = ''
  for (const range of nonOverlapping) {
    const placeholder = `{LW_TERM_${protectedSpans.length}}`
    if (sourceText.includes(placeholder)) throw new Error(`Guided source already contains reserved placeholder ${placeholder}`)
    protectedText += sourceText.slice(cursor, range.start) + placeholder
    protectedSpans.push({ placeholder, original: sourceText.slice(range.start, range.end) })
    cursor = range.end
  }
  protectedText += sourceText.slice(cursor)
  return { sourceText: protectedText, protectedSpans }
}

export function getGuidedProtectedSpanIssues(
  text: string,
  protectedSpans: readonly GuidedProtectedSpan[],
  state: GuidedProtectedSpanState,
): string[] {
  const issues: string[] = []
  const expected = protectedSpans.map((span) => state === 'placeholder' ? span.placeholder : span.original)
  const observed: string[] = [...(text.match(LEARNED_PLACEHOLDER) ?? [])]
  if (state === 'placeholder') {
    const expectedCounts = new Map<string, number>()
    const observedCounts = new Map<string, number>()
    for (const placeholder of expected) expectedCounts.set(placeholder, (expectedCounts.get(placeholder) ?? 0) + 1)
    for (const placeholder of observed) observedCounts.set(placeholder, (observedCounts.get(placeholder) ?? 0) + 1)
    for (const [placeholder, expectedCount] of expectedCounts) {
      const observedCount = observedCounts.get(placeholder) ?? 0
      if (observedCount < expectedCount) issues.push(`missing protected placeholder ${placeholder}`)
      if (observedCount > expectedCount) issues.push(`duplicate protected placeholder ${placeholder}`)
    }
    for (const placeholder of observedCounts.keys()) {
      if (!expectedCounts.has(placeholder)) issues.push(`unexpected protected placeholder ${placeholder}`)
    }
  } else {
    for (const original of new Set(expected)) {
      if (!text.includes(original)) issues.push(`missing protected restored ${original}`)
    }
    for (const placeholder of observed) issues.push(`unresolved protected placeholder ${placeholder}`)
  }
  return issues
}

/** Generic template tokens may move in translation, but their multiset is exact. */
export function getGuidedPlaceholderIssues(sourceText: string, translatedText: string): string[] {
  const expected = sourceText.match(TEMPLATE_PLACEHOLDER) ?? []
  const observed = translatedText.match(TEMPLATE_PLACEHOLDER) ?? []
  const expectedCounts = new Map<string, number>()
  const observedCounts = new Map<string, number>()
  for (const token of expected) expectedCounts.set(token, (expectedCounts.get(token) ?? 0) + 1)
  for (const token of observed) observedCounts.set(token, (observedCounts.get(token) ?? 0) + 1)

  const issues: string[] = []
  for (const [token, expectedCount] of expectedCounts) {
    const observedCount = observedCounts.get(token) ?? 0
    if (observedCount < expectedCount) issues.push(`missing placeholder ${token}`)
    if (observedCount > expectedCount) issues.push(`duplicate placeholder ${token}`)
  }
  for (const token of observedCounts.keys()) {
    if (!expectedCounts.has(token)) issues.push(`unexpected placeholder ${token}`)
  }
  return issues
}

export function restoreGuidedLearnedSpans(text: string, protectedSpans: readonly GuidedProtectedSpan[]): string {
  const issues = getGuidedProtectedSpanIssues(text, protectedSpans, 'placeholder')
  if (issues.length) throw new Error(`Guided learned span mismatch: ${issues.join('; ')}`)
  let restored = text
  for (const span of protectedSpans) restored = restored.replace(span.placeholder, span.original)
  return restored
}

function withoutProtectedSpans(
  text: string,
  protectedSpans: readonly GuidedProtectedSpan[],
  state: GuidedProtectedSpanState,
): string {
  let result = text
  for (const span of protectedSpans) {
    const value = state === 'placeholder' ? span.placeholder : span.original
    result = result.split(value).join(' ')
  }
  return result
}

function normalizeComparable(value: string | undefined): string {
  return value?.normalize('NFKC').trim().replace(/\s+/gu, ' ') ?? ''
}

function foreignScriptPattern(destinationLocale: string): RegExp | undefined {
  if (LATIN_DESTINATIONS.has(destinationLocale)) return /[\u0400-\u04ff\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/gu
  if (destinationLocale === 'ru') return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/gu
  if (destinationLocale === 'ko') return /[\u0400-\u04ff\u3040-\u30ff]/gu
  if (destinationLocale === 'ja') return /[\u0400-\u04ff\uac00-\ud7af]/gu
  return undefined
}

/** High-confidence structural checks only; this does not certify translation quality. */
export function getGuidedTranslationQualityIssues(input: GuidedTranslationQualityInput): string[] {
  const protectedSpans = input.protectedSpans ?? []
  const protectedState = input.protectedSpanState ?? 'restored'
  const issues = getGuidedProtectedSpanIssues(input.translatedText, protectedSpans, protectedState)
  const translated = normalizeComparable(withoutProtectedSpans(input.translatedText, protectedSpans, protectedState))
  const source = normalizeComparable(withoutProtectedSpans(input.sourceText, protectedSpans, 'restored'))
  const target = normalizeComparable(input.targetText)

  const intentionalSharedLoanword = LATIN_DESTINATIONS.has(input.destinationLocale) && SHARED_LOANWORD_GLOSS.test(translated)
  if (translated.length >= 18 && input.destinationLocale !== input.sourceLocale && translated === source && !intentionalSharedLoanword) {
    issues.push('copied source text')
  }
  if (
    translated.length >= 18
    && input.destinationLocale !== input.targetLocale
    && target
    && translated === target
    && translated !== source
  ) issues.push('copied learning-language text')

  const foreign = foreignScriptPattern(input.destinationLocale)
  if (foreign && input.sentenceLike !== false) {
    const compact = translated.replace(/\s/gu, '')
    const foreignCount = (compact.match(foreign) ?? []).length
    if (compact.length >= 12 && foreignCount / compact.length > 0.5) issues.push('foreign-script sentence')
  }
  return issues
}
