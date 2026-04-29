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
}

// Native language names for browser language codes not in LANGUAGE_CONFIG
export const NATIVE_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', de: 'German', fr: 'French', it: 'Italian',
  es: 'Spanish', pt: 'Portuguese', nl: 'Dutch', hi: 'Hindi',
  ar: 'Arabic', fil: 'Filipino', id: 'Indonesian', ko: 'Korean',
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
- You receive text transcriptions of speech, not audio. If the student's reply shows they understood, that is success. Move forward. Never ask them to say the same word again.
- Introduce 1-2 interesting or uncommon words per turn. Give a brief meaning, use it in a sentence, and connect it to what you're talking about.
- Let the conversation guide what you teach. If they mention food, share a vivid food-related word. If they mention feelings, teach a more precise emotion word.
- Make every turn interesting — share word origins, surprising meanings, or cultural context behind expressions.`

      case 'beginner':
        return `LEVEL: EXPRESSION BUILDER — The student wants to speak ${targetLang} more naturally.

- Speak entirely in ${targetLang}.
- You receive text transcriptions, not audio. If the student's response shows they understood or tried, that is success. Never ask them to repeat a phrase.
- Focus on natural phrasing — when the student says something that's correct but stiff, show them a more natural way to express it by weaving it into your reply.
- Introduce common expressions, phrasal constructions, and everyday idioms that make speech sound fluent rather than textbook.
- Keep conversations real — ask about their life, react to what they say, share interesting observations. Build confidence through genuine engagement.`

      case 'advanced':
        return `LEVEL: MASTERY — The student wants to refine and deepen their ${targetLang}.

- Speak entirely in ${targetLang} at full native complexity.
- When you notice awkward phrasing, model a more polished version in your next sentence. If a pattern recurs, mention it briefly — but never let correction dominate the conversation.
- Push for depth: challenge their opinions, introduce hypothetical scenarios, ask questions that require nuance. Make them think precisely.
- Introduce register — show the difference between casual, professional, and formal ways to express the same idea. Explore tone, connotation, and word choice.
- Discuss whatever interests them at full intellectual depth: philosophy, culture, humor, storytelling, debate.`

      default: // intermediate
        return `LEVEL: FLUENCY PRACTICE — The student wants more natural, expressive ${targetLang}.

- Speak entirely in ${targetLang}.
- Match their level — if they speak simply, keep it accessible. If they stretch for complex ideas, meet them there.
- Introduce useful connectors, collocations, and transitions (words like "however," "actually," "on the other hand") that make speech flow naturally.
- Have real conversations — discuss opinions, share observations, explore topics they care about. The conversation itself is the practice.
- When they express an idea awkwardly, show a smoother version naturally in your reply without stopping to explain.`
    }
  }

  switch (level) {
    case 'zero':
      return `LEVEL: COMPLETE ZERO — The student is just starting with ${targetLang}.

LANGUAGE MIX: About 70% ${nativeLang}, 30% ${targetLang}.
- You receive text transcriptions of speech, not audio. If the student's reply contains the target word or a recognizable attempt, that is success. Move forward. Never ask them to say the same word again.
- Weave 1-2 new words into natural conversation each turn. Say the word, give a brief meaning, and use it in a sentence or question — like a friend sharing their language, not a teacher running a drill.
- Let the conversation guide what you teach. If the student mentions they're tired, teach them the word for "tired." If they talk about food, teach a food word. Read their mood and match it.
- Occasionally ask what ${targetLang} words they already know — it gives them a chance to show off and feel confident. Build on whatever they share by teaching related words.
- Every turn should feel like progress. Share a fun cultural detail, a surprising word origin, or an interesting fact about ${targetLang} to keep things alive.`

    case 'beginner':
      return `LEVEL: BEGINNER — The student knows basic words and simple phrases in ${targetLang}.

LANGUAGE MIX: About 50% ${nativeLang}, 50% ${targetLang}.
- Speak in short, natural ${targetLang} sentences and let context do the teaching. If a sentence has a new word, briefly clarify in ${nativeLang} and keep going.
- You receive text transcriptions, not audio. If the student's response shows they understood or tried, that is success. Never ask them to repeat a word.
- When the student uses ${nativeLang}, respond with the ${targetLang} version woven into your reply — show them how to say it, don't assign it.
- Build on what they know. If they use a word correctly, introduce a related one. If they talk about their day, teach words that fit their story.
- Keep conversations real — ask about their life, share a cultural insight, react to what they say. A beginner can have an interesting conversation with the right support.`

    case 'advanced':
      return `LEVEL: ADVANCED — The student wants fluent, challenging practice in ${targetLang}.

LANGUAGE MIX: 95-100% ${targetLang}. Use ${nativeLang} only if explicitly asked.
- Speak as you would to a fellow native speaker — natural speed, idioms, slang, cultural references. Don't simplify.
- When you notice a grammar pattern they struggle with, model the correct form once in your next sentence. If the same error recurs, mention it briefly — but never let correction dominate the conversation.
- Push for depth: ask follow-up questions, challenge their opinions, introduce hypothetical scenarios. Make them think in ${targetLang}, not just speak it.
- Introduce register — show them the difference between casual, polite, and formal ways to express the same idea. This is what separates fluent from advanced.
- Discuss whatever interests them at full intellectual depth: philosophy, culture, current events, personal dilemmas, humor, storytelling.`

    default: // intermediate
      return `LEVEL: INTERMEDIATE — The student can hold a conversation in ${targetLang} with support.

LANGUAGE MIX: About 80% ${targetLang}, 20% ${nativeLang}.
- Do not collapse into ${nativeLang}, even when the student opens or replies in ${nativeLang} — stay primarily in ${targetLang} as the mix above specifies. Do not abandon ${nativeLang} entirely either; use it as brief scaffolding when the student is genuinely stuck. The first response should already reflect this 80/20 balance.
- Speak primarily in ${targetLang}. Switch to ${nativeLang} only when the student is visibly stuck or asks for help.
- Match their level — if they speak simply, keep it accessible. If they stretch for complex ideas, meet them there.
- If the student falls back to ${nativeLang} for multiple turns, gently invite them back to ${targetLang} by offering a simple way to express what they're trying to say.
- Have real conversations — discuss opinions, share cultural context, explore topics they care about. At this level, the conversation itself is the lesson.
- Introduce useful expressions, collocations, and connectors (words like "however," "actually," "by the way" in ${targetLang}) that make speech sound more natural.`
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
