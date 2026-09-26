// api/_shared/ttsText.ts
//
// Cleans a tutor reply before text-to-speech. Stage directions are removed only
// when a bracketed or asterisk span holds one to three words that are all on
// the direction list; anything else in parentheses is usually a gloss the
// learner should hear, e.g. "Hochzeit (wedding)" or "(pain frais)".

const DIRECTION_WORDS = new Set([
  'slowly', 'softly', 'quietly', 'gently', 'warmly', 'playfully', 'dramatically', 'excitedly', 'happily', 'sadly',
  'laughing', 'laughs', 'laugh', 'chuckling', 'chuckles', 'chuckle', 'giggling', 'giggles', 'giggle',
  'smiling', 'smiles', 'smile', 'sighing', 'sighs', 'sigh', 'whispering', 'whispers', 'whisper',
  'pausing', 'pauses', 'pause', 'long', 'short', 'brief', 'beat', 'clears', 'throat', 'winks', 'wink',
  'grinning', 'grins', 'nodding', 'nods', 'gasps', 'gasp', 'excited', 'cheerfully', 'thoughtfully',
])

function isDirection(span: string) {
  const words = span.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return words.length > 0 && words.length <= 3 && words.every(word => DIRECTION_WORDS.has(word))
}

// For a reply cut off by the token budget: keep everything up to the last
// sentence end (Latin, CJK or Devanagari punctuation), or the whole text if
// there is none.
export function trimToLastSentence(text: string): string {
  const match = text.match(/^[\s\S]*[.!?。！？।](?=[\s"'»”)]*)/)
  return (match ? match[0] : text).trim()
}

export function sanitizeForTTS(text: string): string {
  return text
    // (slowly), [long pause] — removed; (wedding), [Pause machen] — kept
    .replace(/[([]([^()[\]\n]{1,40})[)\]]/g, (whole, inner: string) => (isDirection(inner) ? '' : whole))
    // *laughs* — removed; **cansado** — keep the word, drop the markers
    .replace(/\*{1,3}([^*\n]+?)\*{1,3}/g, (_whole, inner: string) => (isDirection(inner) ? '' : inner))
    .replace(/\*+/g, '')
    // Pacing ellipsis: "I... am..." → "I am"
    .replace(/\.{2,}|…/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
