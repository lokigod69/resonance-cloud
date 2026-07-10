// Answer normalization + forgiving comparison for the typed-recall study mode.
// Deliberately dependency-free and NOT shared with the guided lessons' matcher —
// that one lives inside the ~2.8MB guidedLessons chunk, which study pages must
// never import statically.

export type TypedVerdict = 'correct' | 'close' | 'wrong'

// Leading articles a learner may reasonably omit when the card stores one
// ("der Hund" — typing "hund" should count). Diacritics are NOT stripped
// anywhere: "schon" vs "schön" stays a spelling difference, caught (and
// surfaced) by the typo tolerance below rather than silently equated.
const LEADING_ARTICLES = new Set([
  'der', 'die', 'das', 'den', 'dem', 'ein', 'eine',
  'the', 'a', 'an',
  'le', 'la', 'les', 'un', 'une', 'des',
  'el', 'los', 'las', 'una', 'unos', 'unas',
  'il', 'lo', 'gli', 'uno',
  'o', 'os', 'as', 'um', 'uma',
])

export function normalizeTypedAnswer(value: string): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/[.,!?;:…"„“”«»()[\]]/g, ' ')
    .replace(/['’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function withoutLeadingArticle(normalized: string): string | null {
  const spaceIdx = normalized.indexOf(' ')
  if (spaceIdx <= 0) return null
  const head = normalized.slice(0, spaceIdx)
  if (!LEADING_ARTICLES.has(head)) return null
  const rest = normalized.slice(spaceIdx + 1).trim()
  return rest || null
}

// A stored answer can carry variants ("Küste / Ufer", "color, colour") and
// parenthetical hints ("laufen (gehen)"). Every variant is accepted, each
// also without its leading article.
export function buildAcceptedAnswers(rawAnswer: string): string[] {
  const accepted = new Set<string>()
  const bases = [rawAnswer, rawAnswer.replace(/\([^)]*\)/g, ' ')]
  for (const base of bases) {
    for (const part of base.split(/[/;,]/)) {
      const normalized = normalizeTypedAnswer(part)
      if (!normalized) continue
      accepted.add(normalized)
      const withoutArticle = withoutLeadingArticle(normalized)
      if (withoutArticle) accepted.add(withoutArticle)
    }
  }
  return Array.from(accepted)
}

// Optimal-string-alignment distance (Damerau-Levenshtein with adjacent
// transpositions). Only small distances matter, so bail out early when the
// lengths alone already exceed the caller's tolerance window.
function osaDistance(a: string, b: string, maxRelevant: number): number {
  if (Math.abs(a.length - b.length) > maxRelevant) return maxRelevant + 1
  const m = a.length
  const n = b.length
  let prevPrev: number[] = []
  let prev: number[] = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const row: number[] = [i]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, prevPrev[j - 2] + 1)
      }
      row.push(best)
    }
    prevPrev = prev
    prev = row
  }
  return prev[n]
}

// Short words get no slack ("hut" must not pass for "gut"); medium words
// forgive one slip, long ones two.
function toleranceFor(answerLength: number): number {
  if (answerLength < 5) return 0
  if (answerLength < 10) return 1
  return 2
}

// 'correct' = exact match on some accepted variant; 'close' = within typo
// tolerance (counts as remembered, but the UI shows the proper spelling);
// 'wrong' = everything else.
export function evaluateTypedAnswer(input: string, rawAnswer: string): TypedVerdict {
  const typed = normalizeTypedAnswer(input)
  if (!typed) return 'wrong'
  const candidates = buildAcceptedAnswers(rawAnswer)
  if (candidates.includes(typed)) return 'correct'
  for (const candidate of candidates) {
    const tolerance = toleranceFor(candidate.length)
    if (tolerance === 0) continue
    if (osaDistance(typed, candidate, tolerance) <= tolerance) return 'close'
  }
  return 'wrong'
}
