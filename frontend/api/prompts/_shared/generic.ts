import {
  LANGUAGE_CONFIG,
  resolveNativeLangName,
  getLevelInstructions,
  buildStudyAddendum,
  buildGreetingInstruction,
  type StudyWord,
} from './pedagogy'
import { buildRoleplaySystemPrompt } from './roleplay'
import { voxtralRules } from '../voxtral'

// Generic fallback: no character selected, no Gemini vibe. The TTS path at
// this point is Voxtral (or a default Gemini voice for non-Voxtral languages),
// so the strict speech rules from voxtralRules apply — the speech engine reads
// stage directions literally.

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
  return buildGreetingInstruction(input)
}
