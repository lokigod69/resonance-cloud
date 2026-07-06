// Script Lab — generic writing-system learning types.
//
// The Script Lab teaches a language's writing system (Hangul first). These types
// are deliberately language-agnostic: everything Korean-specific lives in
// src/data/scripts/, and the UI in components/scriptlab/ only ever consumes
// these shapes. To add a new writing system, see the registry in
// lib/scriptlab/registry.ts — no UI changes should be required.

/** Content-level localized text. UI chrome uses translations.ts via t(); symbol
 * meanings and pedagogy notes are content and live with the data, mirroring
 * staticCategoryTranslations.ts. All three app locales are required so a new
 * script can't ship with missing base-language coverage. */
export type LocalizedText = {
  en: string
  de: string
  fr: string
}

/** Writing-system taxonomy. Drives copy and (later) which practice modes make
 * sense — e.g. an abjad module may teach vowel diacritics differently. Purely
 * descriptive in V1. */
export type ScriptKind =
  | 'alphabet'      // Latin, Cyrillic, Greek, Hangul (featural alphabet)
  | 'abjad'         // Arabic, Hebrew
  | 'syllabary'     // Hiragana, Katakana
  | 'abugida'       // Thai, Devanagari
  | 'logographic'   // Hanzi/Kanji components — out of scope for now, reserved

export type ScriptSymbolType =
  | 'consonant'
  | 'vowel'
  | 'double-consonant'
  | 'compound-vowel'
  | 'final-consonant'
  | 'mark'          // diacritics/harakat for abjads/abugidas later

/** What a TTS provider (or the browser speech fallback) should actually say for
 * a piece of script content. Speaking a bare letter like 'ㄱ' is unreliable in
 * every TTS engine, so each playable surface carries explicit spoken text. */
export type ScriptAudioSpec = {
  /** Stable asset key, unique within the script. Doubles as the future audio
   * filename / provider batch id, e.g. 'symbol-g-name'. */
  itemId: string
  /** Exact text to synthesize, e.g. '기역' (the letter name) or '가방'. */
  text: string
}

export type ScriptExampleWord = {
  /** The word in the target script, e.g. '가방'. */
  word: string
  romanization: string
  meaning: LocalizedText
  audio: ScriptAudioSpec
}

export type ScriptSymbol = {
  /** Unique within the script, stable, kebab-case ascii, e.g. 'g', 'ss', 'wa'. */
  id: string
  /** The symbol as written, e.g. 'ㄱ'. */
  character: string
  type: ScriptSymbolType
  /** Native letter name where the script has one, e.g. '기역'. */
  name?: string
  /** Helper text, not the learning target. Revised Romanization for Korean. */
  romanization: string
  /** IPA for the curious; hidden behind a small affordance in the UI. */
  ipa?: string
  /** One-sentence, jargon-free pronunciation hint. */
  pronunciationNote: LocalizedText
  /** A syllable/cluster showing the symbol in context, e.g. '가' for ㄱ. */
  exampleSyllable?: string
  exampleSyllableRomanization?: string
  /** Spoken form of the example syllable; declared (not derived) so the audio
   * batch inventory knows every playable item. */
  exampleSyllableAudio?: ScriptAudioSpec
  exampleWord: ScriptExampleWord
  /** What to speak when the symbol itself is tapped (letter name or demo syllable). */
  audio: ScriptAudioSpec
  /** Presentation order within its section. */
  order: number
  tags?: string[]
}

export type ScriptSection = {
  /** Unique within the script, e.g. 'basic-consonants'. */
  id: string
  title: LocalizedText
  /** Short section intro shown above the grid. */
  description: LocalizedText
  symbolIds: string[]
  /** Advanced sections render collapsed/later in the learning order. */
  advanced?: boolean
}

/** Optional interactive composition support ("Build mode"). Hangul composes
 * initial+vowel(+final) into a block; scripts without systematic composition
 * simply omit this and the UI hides the Build tab. */
export type ScriptComposition = {
  /** Symbol ids usable as the first slot (initial consonants for Hangul). */
  initialIds: string[]
  /** Symbol ids usable as the second slot (vowels for Hangul). */
  medialIds: string[]
  /** Symbol ids usable as the optional third slot (batchim). */
  finalIds?: string[]
  /** Pure function combining chosen symbols into rendered text, or null when
   * the combination doesn't exist in the script. */
  compose: (initialId: string, medialId: string, finalId?: string) => ScriptComposedResult | null
}

export type ScriptComposedResult = {
  /** The composed cluster/block, e.g. '간'. */
  text: string
  romanization: string
  /** Spoken form for audio playback (usually identical to text). */
  audio: ScriptAudioSpec
}

export type ScriptDefinition = {
  /** Registry id, e.g. 'korean-hangul'. */
  id: string
  /** Canonical language value from lib/languages.ts, e.g. 'Korean'. */
  language: string
  /** BCP-47 speech-synthesis locale, e.g. 'ko-KR'. */
  speechLang: string
  kind: ScriptKind
  /** Native script name, e.g. '한글'. */
  nativeName: string
  /** Learner-facing script name, e.g. 'Hangul'. */
  displayName: string
  tagline: LocalizedText
  /** 2–4 short paragraphs teaching how the system works before any grid. */
  intro: LocalizedText[]
  sections: ScriptSection[]
  symbols: ScriptSymbol[]
  composition?: ScriptComposition
}

export function getScriptSymbol(script: ScriptDefinition, symbolId: string): ScriptSymbol | undefined {
  return script.symbols.find((symbol) => symbol.id === symbolId)
}

/** Resolve content text for the app locale (useTranslation().locale). */
export function localizeScriptText(text: LocalizedText, locale: string): string {
  if (locale === 'de' || locale === 'fr') return text[locale] || text.en
  return text.en
}
