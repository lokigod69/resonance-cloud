import {
  LANGUAGE_CONFIG,
  resolveNativeLangName,
  getLevelInstructions,
  buildStudyAddendum,
  type StudyWord,
} from './pedagogy'
import { buildRoleplaySystemPrompt } from './roleplay'
import { voxtralRules } from '../voxtral'

// Generic fallback: no character selected, no Gemini vibe. The TTS path at
// this point is Voxtral or ElevenLabs (not Gemini), so the strict speech rules
// from voxtralRules apply — the speech engine reads stage directions literally.

export interface GenericSystemPromptInput {
  language: string
  level: string
  nativeLanguage: string
  studyWords?: StudyWord[]
  scenarioPrompt?: string
}

export function buildGenericSystemPrompt(input: GenericSystemPromptInput): string {
  if (input.scenarioPrompt) {
    return buildRoleplaySystemPrompt({
      language: input.language,
      level: input.level,
      nativeLanguage: input.nativeLanguage,
      scenarioPrompt: input.scenarioPrompt,
    })
  }

  const lang = LANGUAGE_CONFIG[input.language]
  if (!lang) throw new Error(`Unsupported language: ${input.language}`)

  const nativeLangName = resolveNativeLangName(input.nativeLanguage)
  const levelInstructions = getLevelInstructions(lang.name, nativeLangName, input.level)
  const studyAddendum = buildStudyAddendum(input.studyWords)

  return `You are a friendly, patient language tutor helping someone practice ${lang.name} (${lang.nativeName}).
The student's native language is ${nativeLangName}.

${levelInstructions}

${voxtralRules}

PERSONALITY: Warm, encouraging, patient. Curious about the student's life to generate natural topics. Like a friend who happens to be a native speaker.${studyAddendum}`
}

export interface GenericGreetingInput {
  level: string
  targetLangName: string
  nativeLangName: string
  studyWord: StudyWord | null
}

export function buildGenericGreeting(input: GenericGreetingInput): string {
  const { level, targetLangName, nativeLangName, studyWord } = input

  if (level === 'zero') {
    if (studyWord) {
      return `Open in ${nativeLangName} with a short welcome. Naturally weave in the ${targetLangName} word "${studyWord.word}" (meaning "${studyWord.translation}") — say it, give its meaning, use it in a short sentence. End with a simple question. Two or three short sentences.`
    }
    return `Open in ${nativeLangName} with a short welcome. Introduce one ${targetLangName} word: say the word, give its ${nativeLangName} meaning, and use it in one short sentence. End with a simple question. Keep it to two or three short sentences.`
  }

  if (level === 'beginner') {
    if (studyWord) {
      return `Open in ${nativeLangName}. Weave the ${targetLangName} word "${studyWord.word}" (meaning "${studyWord.translation}") into your greeting naturally. End with one question. Three sentences.`
    }
    return `Open in ${nativeLangName}. Weave in one ${targetLangName} word naturally — not as a vocabulary lesson. End with one question. Three sentences.`
  }

  if (level === 'advanced') {
    return `Open the conversation in ${targetLangName}. Be true to who you are. Keep it natural.`
  }

  // intermediate (default / fallback)
  return `Open the conversation in ${targetLangName} with light ${nativeLangName} support where helpful. Be conversational and brief. End with one question.`
}
