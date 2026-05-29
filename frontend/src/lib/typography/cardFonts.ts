const DEFAULT_FONT_STACK = '"Bebas Neue", "Noto Sans", Arial, sans-serif'
const LATIN_FALLBACK_STACK = '"Noto Sans", Arial, "Segoe UI", sans-serif'
const CJK_FONT_STACK = '"Noto Sans CJK KR", "Noto Sans CJK", "Noto Sans CJK SC", "Malgun Gothic", sans-serif'

const CJK_LANGUAGE_CODES = new Set(['ko', 'zh', 'ja'])
const SUPPORTED_LATIN_LANGUAGE_CODES = new Set(['de', 'fr', 'it', 'es', 'en', 'ceb', 'tl', 'fil', 'id'])

function normalizeLanguageCode(targetLanguage: string): string {
  return targetLanguage.trim().toLowerCase().replace('_', '-').split('-')[0] ?? ''
}

/**
 * Maps a target language code to the font stack used for rendering target-language
 * text on card surfaces. Mirrors the bookend engine's primary font plus Latin
 * and CJK fallback selection.
 *
 * Source: cloud_engines/bookend_engine/config.py FONT_MAP/FALLBACK_CHAIN and
 * cloud_engines/bookend_engine/word_card.py _CJK_FONT_NAMES/_CJK_UNICODE_RANGES.
 */
export function getCardFontStack(targetLanguage: string): string {
  const code = normalizeLanguageCode(targetLanguage)

  if (CJK_LANGUAGE_CODES.has(code)) {
    return CJK_FONT_STACK
  }

  if (SUPPORTED_LATIN_LANGUAGE_CODES.has(code)) {
    return DEFAULT_FONT_STACK
  }

  return LATIN_FALLBACK_STACK
}

/**
 * Returns Tailwind/CSS class names to apply for language-specific typography.
 * Use alongside getCardFontStack when a script needs small spacing adjustments.
 */
export function getCardFontClass(targetLanguage: string): string {
  const code = normalizeLanguageCode(targetLanguage)

  if (CJK_LANGUAGE_CODES.has(code)) {
    return 'font-sans tracking-normal'
  }

  return 'tracking-normal'
}
