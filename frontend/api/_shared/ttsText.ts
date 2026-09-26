// api/_shared/ttsText.ts
//
// Cleans a tutor reply before text-to-speech. A bracketed or asterisk span is
// removed only when it is a stage direction: one to three words, all on the
// direction list, at least one of them a core direction word. A single word in
// parentheses right after a word is kept: it is a gloss the learner should
// hear, e.g. "langsam (slowly)", "Hochzeit (wedding)".

const CORE_DIRECTIONS = new Set([
  'slowly', 'softly', 'quietly', 'gently', 'warmly', 'playfully', 'dramatically', 'excitedly', 'cheerfully', 'thoughtfully',
  'laughing', 'laughs', 'laugh', 'chuckling', 'chuckles', 'chuckle', 'giggling', 'giggles', 'giggle',
  'smiling', 'smiles', 'smile', 'sighing', 'sighs', 'sigh', 'whispering', 'whispers', 'whisper',
  'pausing', 'pauses', 'pause', 'clears', 'throat', 'winks', 'wink', 'grinning', 'grins', 'nodding', 'nods', 'gasps', 'gasp',
])
// Only meaningful next to a core word: "long pause", "short laugh".
const MODIFIERS = new Set(['long', 'short', 'brief', 'little', 'a', 'soft', 'quiet'])

function isDirection(span: string) {
  const words = span.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return words.length > 0 && words.length <= 3
    && words.every(word => CORE_DIRECTIONS.has(word) || MODIFIERS.has(word))
    && words.some(word => CORE_DIRECTIONS.has(word))
}

// A gloss sits directly after the word it explains (at most one space).
function followsWord(text: string, offset: number) {
  return /\p{L}\s?$/u.test(text.slice(Math.max(0, offset - 2), offset))
}

// For a reply cut off by the token budget: keep everything up to the last
// sentence end (Latin, CJK or Devanagari punctuation followed by a space,
// quote, bracket or the end), or the whole text if there is none.
export function trimToLastSentence(text: string): string {
  const match = text.match(/^[\s\S]*[.!?。！？।](?=[\s"'»”)]|$)/)
  return (match ? match[0] : text).trim()
}

export function sanitizeForTTS(text: string): string {
  return text
    // [long pause] and (laughing softly) → removed anywhere; (slowly) Hola → Hola;
    // langsam (slowly) → kept, since one parenthesised word after a word is a gloss.
    .replace(/[([]([^()[\]\n]{1,40})[)\]]/g, (whole, inner: string, offset: number, all: string) => {
      if (!isDirection(inner)) return whole
      const square = whole.startsWith('[')
      const multiWord = inner.trim().split(/\s+/).length > 1
      return square || multiWord || !followsWord(all, offset) ? '' : whole
    })
    // *laughs* (single stars = an action) → removed; **cansado** / **laugh**
    // (bold = the taught word) → keep the word, drop the markers
    .replace(/(\*{1,3})([^*\n]+?)\1/g, (_whole, stars: string, inner: string) =>
      (stars.length === 1 && isDirection(inner) ? '' : inner))
    .replace(/\*+/g, '')
    // Pacing ellipsis: "I... am..." → "I am"
    .replace(/\.{2,}|…/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
