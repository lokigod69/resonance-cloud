// Shared pedagogy primitives used by every provider module.
// Language names, level-scaled teaching instructions, study-word addendum.

export interface CharacterPayload {
  name: string
  tier: 'style' | 'persona' | 'public'
  identity?: string
  directive: string
}

export interface StudyWord {
  word: string
  translation: string
}

export const LANGUAGE_CONFIG: Record<string, { name: string; nativeName: string; encouragement: string }> = {
  en: { name: 'English', nativeName: 'English', encouragement: 'Great job! / Well done! / That\'s right!' },
  de: { name: 'German', nativeName: 'Deutsch', encouragement: 'Sehr gut! / Prima! / Genau!' },
  fr: { name: 'French', nativeName: 'Français', encouragement: 'Très bien! / Bravo! / C\'est parfait!' },
  it: { name: 'Italian', nativeName: 'Italiano', encouragement: 'Molto bene! / Bravissimo! / Perfetto!' },
  es: { name: 'Spanish', nativeName: 'Español', encouragement: '¡Muy bien! / ¡Excelente! / ¡Perfecto!' },
  pt: { name: 'Portuguese', nativeName: 'Português', encouragement: 'Muito bem! / Ótimo! / Perfeito!' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', encouragement: 'Heel goed! / Prima! / Uitstekend!' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', encouragement: 'बहुत अच्छा! / शाबाश! / बिल्कुल सही!' },
  ar:  { name: 'Arabic',    nativeName: 'العربية',          encouragement: '!أحسنت / !ممتاز / !رائع' },
  fil: { name: 'Filipino',  nativeName: 'Filipino',         encouragement: 'Magaling! / Napakahusay! / Tama!' },
  id:  { name: 'Indonesian', nativeName: 'Bahasa Indonesia', encouragement: 'Bagus sekali! / Hebat! / Benar!' },
  ko:  { name: 'Korean',    nativeName: '한국어',            encouragement: '잘했어요! / 훌륭해요! / 맞아요!' },
  ceb: { name: 'Cebuano',   nativeName: 'Bisaya',           encouragement: 'Maayo kaayo! / Husto! / Sakto!' },
  ru:  { name: 'Russian',   nativeName: 'Русский',          encouragement: 'Отлично! / Молодец! / Правильно!' },
}

// Native language names for browser language codes not in LANGUAGE_CONFIG
export const NATIVE_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', de: 'German', fr: 'French', it: 'Italian',
  es: 'Spanish', pt: 'Portuguese', nl: 'Dutch', hi: 'Hindi',
  ar: 'Arabic', fil: 'Filipino', id: 'Indonesian', ko: 'Korean', ceb: 'Cebuano',
  zh: 'Chinese', ja: 'Japanese', ru: 'Russian', tr: 'Turkish',
  pl: 'Polish', th: 'Thai', vi: 'Vietnamese', sv: 'Swedish',
  da: 'Danish', no: 'Norwegian', fi: 'Finnish', cs: 'Czech',
  uk: 'Ukrainian', ro: 'Romanian', hu: 'Hungarian', el: 'Greek',
  he: 'Hebrew', ms: 'Malay', tl: 'Tagalog',
}

export function resolveNativeLangName(nativeLang: string): string {
  return LANGUAGE_CONFIG[nativeLang]?.name || NATIVE_LANGUAGE_NAMES[nativeLang] || 'English'
}

export function getLevelInstructions(targetLang: string, nativeLang: string, level: string): string {
  // Same-language mode: drop bilingual framing, focus on depth and enrichment
  if (targetLang === nativeLang) {
    switch (level) {
      case 'zero':
        return `LEVEL: VOCABULARY BUILDER — The student wants to expand their ${targetLang} vocabulary.

- Speak entirely in ${targetLang}.
- You receive speech transcripts. Treat a reply that shows understanding as success; move forward rather than asking for repetition.
- Introduce 1-2 interesting words per turn with a brief meaning and natural example tied to the conversation.
- Follow the student's interests. Add a concise word origin, surprising meaning, or cultural detail when useful.`

      case 'beginner':
        return `LEVEL: EXPRESSION BUILDER — The student wants to speak ${targetLang} more naturally.

- Speak entirely in ${targetLang}.
- You receive speech transcripts. Treat understanding or a clear attempt as success; do not ask for repetition.
- Model more natural phrasing inside your reply when the student's wording is correct but stiff.
- Introduce common expressions and everyday idioms through real conversation about the student's life and interests.`

      case 'advanced':
        return `LEVEL: MASTERY — The student wants to refine and deepen their ${targetLang}.

- Speak entirely in ${targetLang} at full native complexity.
- Model polished wording naturally. Mention a recurring error briefly, without letting correction dominate.
- Ask nuanced questions, challenge ideas, and introduce hypotheticals.
- Explore register, tone, connotation, and precise word choice at full intellectual depth.`

      default: // intermediate
        return `LEVEL: FLUENCY PRACTICE — The student wants more natural, expressive ${targetLang}.

- Speak entirely in ${targetLang}.
- Match their level — if they speak simply, keep it accessible. If they stretch for complex ideas, meet them there.
- Weave in useful connectors, collocations, and transitions through real conversation.
- Model smoother wording naturally when an idea is awkward; do not stop the conversation to explain.`
    }
  }

  switch (level) {
    case 'zero':
      // Kept in sync with src/lib/grokPedagogy.ts (2026-07-07 parity pass) —
      // the greeting-mix and inline-gloss rules were added there first.
      return `LEVEL: COMPLETE ZERO — The student is just starting with ${targetLang}.

LANGUAGE MIX: About 70% ${nativeLang}, 30% ${targetLang}.
- You receive speech transcripts. A target word or recognizable attempt is success; move forward rather than asking for repetition.
- Start the first turn with a short, natural greeting that follows the 70% ${nativeLang}, 30% ${targetLang} mix. Do not start with a mostly ${targetLang} greeting.
- Weave 1-2 new ${targetLang} words into each turn. On first use in that turn, gloss in plain inline prose in this order: ${targetLang} word first, then a natural meaning connector in ${nativeLang}, then the ${nativeLang} gloss. Follow with a short ${targetLang} use. Do not use markdown, brackets, or parenthetical glosses.
- Keep ${nativeLang} context short and natural. Follow the student's topic and mood, build on words they know, and add a brief cultural or word-origin detail when useful.`

    case 'beginner':
      // Kept in sync with src/lib/grokPedagogy.ts (2026-07-07 parity pass).
      return `LEVEL: BEGINNER — The student knows basic words and simple phrases in ${targetLang}.

LANGUAGE MIX: Use an approximately even mix of ${nativeLang} and ${targetLang}.
- Keep sentences short and supportive. The first greeting and every turn should balance both languages; do not collapse into either one.
- Use ${nativeLang} to set context, then short ${targetLang} examples. For an important new word, use plain inline prose in this order: ${targetLang} word first, then a natural meaning connector in ${nativeLang}, then the ${nativeLang} gloss. Follow with a short ${targetLang} use. Do not use markdown, brackets, or parentheses.
- You receive speech transcripts. Treat understanding or a clear attempt as success; do not ask for repetition.
- When the student uses ${nativeLang}, weave the ${targetLang} version into your reply. Build on what they know through real topics and brief cultural context.`

    case 'advanced':
      return `LEVEL: ADVANCED — The student wants fluent, challenging practice in ${targetLang}.

LANGUAGE MIX: 95-100% ${targetLang}. Use ${nativeLang} only if explicitly asked.
- Use native complexity, idioms, slang, and cultural references; do not simplify.
- Model a difficult grammar pattern once. Mention a recurring error briefly, without letting correction dominate.
- Ask nuanced follow-ups, challenge ideas, and use hypotheticals. Explore casual, polite, and formal register.`

    default: // intermediate
      return `LEVEL: INTERMEDIATE — The student can hold a conversation in ${targetLang} with support.

LANGUAGE MIX: About 80% ${targetLang}, 20% ${nativeLang}.
- The first response and every turn should stay primarily in ${targetLang}, with brief ${nativeLang} scaffolding when the student is stuck or asks for help.
- Match their level — if they speak simply, keep it accessible. If they stretch for complex ideas, meet them there.
- If they fall back to ${nativeLang}, offer a simple ${targetLang} version and invite them back.
- Keep conversation real. Weave in useful expressions, collocations, connectors, and cultural context.`
  }
}

export function buildStudyAddendum(studyWords?: StudyWord[]): string {
  if (!studyWords || studyWords.length === 0) return ''
  const list = studyWords.map((w) => `${w.word} (${w.translation})`).join(', ')
  return `

STUDY FOCUS: The student is currently working on these words:
${list}
Find natural moments to use these words in conversation. Don't list them or quiz the student directly — weave them into what you're already talking about. Use 2-3 per exchange, not all at once.`
}

export interface GreetingInstructionInput {
  level: string
  targetLangName: string
  nativeLangName: string
  studyWord?: StudyWord | null
}

/**
 * Keep the first turn aligned with the language mix in getLevelInstructions.
 * Provider prompts may add a short performance cue, but should not restate the
 * character or teaching rules already present in the system prompt.
 */
export function buildGreetingInstruction(input: GreetingInstructionInput): string {
  const { level, targetLangName, nativeLangName, studyWord } = input
  const sameLanguage = targetLangName === nativeLangName
  const studyCue = studyWord
    ? ` If it fits naturally, include ${studyWord.word} and its ${nativeLangName} gloss, ${studyWord.translation}, in plain inline prose.`
    : ''

  if (sameLanguage) {
    return `Open with a short, natural greeting in ${targetLangName}. End with an inviting question.${studyCue}`
  }

  switch (level) {
    case 'zero':
      return `Open with a short, natural greeting that is about 70% ${nativeLangName} and 30% ${targetLangName}. End with one simple question. Use two or three short sentences.${studyCue}`
    case 'beginner':
      return `Open with a short, natural greeting using an approximately even mix of ${nativeLangName} and ${targetLangName}. End with one simple question. Use two or three short sentences.${studyCue}`
    case 'advanced':
      return `Open with a short, natural greeting in ${targetLangName}. End with an inviting question.${studyCue}`
    default:
      return `Open with a short, natural greeting that is about 80% ${targetLangName} and 20% ${nativeLangName}. End with an inviting question.${studyCue}`
  }
}
