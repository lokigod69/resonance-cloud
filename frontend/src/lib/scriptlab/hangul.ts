// Hangul syllable-block math. Pure Unicode arithmetic + Revised Romanization
// for isolated syllables — no app dependencies, fully testable.
//
// A precomposed Hangul syllable is U+AC00 + (initial*21 + medial)*28 + final,
// where final 0 means "no batchim".

export const HANGUL_INITIALS = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const

export const HANGUL_MEDIALS = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
] as const

export const HANGUL_FINALS = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const

// Revised Romanization, isolated-syllable reading (word-initial consonant
// value; finals use the neutralized unreleased reading, e.g. ㅅ batchim → t).
const INITIAL_ROMAN = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's',
  'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h',
] as const

const MEDIAL_ROMAN = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa',
  'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i',
] as const

const FINAL_ROMAN = [
  '', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k',
  'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't',
  't', 'ng', 't', 't', 'k', 't', 'p', 't',
] as const

const HANGUL_SYLLABLE_BASE = 0xac00
const HANGUL_SYLLABLE_END = 0xd7a3

export type HangulSyllable = {
  syllable: string
  romanization: string
}

/** Compose jamo characters into a precomposed syllable block, or null when the
 * jamo don't form one (unknown character, vowel in consonant slot, …). */
export function composeHangul(initial: string, medial: string, final?: string): HangulSyllable | null {
  const initialIndex = (HANGUL_INITIALS as readonly string[]).indexOf(initial)
  const medialIndex = (HANGUL_MEDIALS as readonly string[]).indexOf(medial)
  const finalIndex = final ? (HANGUL_FINALS as readonly string[]).indexOf(final) : 0
  if (initialIndex < 0 || medialIndex < 0 || finalIndex < 0) return null

  const codePoint = HANGUL_SYLLABLE_BASE + (initialIndex * 21 + medialIndex) * 28 + finalIndex
  return {
    syllable: String.fromCodePoint(codePoint),
    romanization: INITIAL_ROMAN[initialIndex] + MEDIAL_ROMAN[medialIndex] + FINAL_ROMAN[finalIndex],
  }
}

/** Split a precomposed syllable back into jamo, or null for non-syllables. */
export function decomposeHangul(syllable: string): { initial: string; medial: string; final: string | null } | null {
  const codePoint = syllable.codePointAt(0)
  if (codePoint === undefined || codePoint < HANGUL_SYLLABLE_BASE || codePoint > HANGUL_SYLLABLE_END) return null

  const offset = codePoint - HANGUL_SYLLABLE_BASE
  const finalIndex = offset % 28
  const medialIndex = ((offset - finalIndex) / 28) % 21
  const initialIndex = Math.floor(offset / (21 * 28))
  return {
    initial: HANGUL_INITIALS[initialIndex],
    medial: HANGUL_MEDIALS[medialIndex],
    final: finalIndex === 0 ? null : HANGUL_FINALS[finalIndex],
  }
}
