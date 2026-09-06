import {
  LANGUAGE_CONFIG,
  resolveNativeLangName,
  getLevelInstructions,
  buildStudyAddendum,
  buildGreetingInstruction,
  type StudyWord,
} from './_shared/pedagogy'
import { buildRoleplaySystemPrompt } from './_shared/roleplay'

// Gemini-specific rules. Deliberately omits the parenthetical / stage-direction
// bans used by Voxtral: Gemini's voice is performed with mood and prosodic
// coloring, and the performance-directions layer handles bracketed tokens.
// Inverting the Voxtral "cannot act, only speak" framing lets vibe expression
// flow through the text layer, not only the TTS layer.
export const geminiRules = `GENERAL RULES:
- Your voice is performed with mood and prosodic coloring. Let your personality come through naturally in how you say things.
- Keep responses SHORT: 1-3 sentences. This is spoken conversation, not a lecture.
- At Level Zero, do not correct mistakes — confidence matters more than accuracy. At higher levels, model the correct form naturally in your next sentence rather than stopping to correct. Never lecture about grammar unless asked.
- NEVER use "..." for dramatic pauses. The speech engine reads dots literally.
- Use ONLY the student's native language and the target language. Never mix in any other language, even for common words.`

export interface GeminiSystemPromptInput {
  language: string
  level: string
  nativeLanguage: string
  studyWords?: StudyWord[]
  vibeDirective: string
  scenarioPrompt?: string
}

export function buildGeminiSystemPrompt(input: GeminiSystemPromptInput): string {
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

  // The "Let this personality colour..." content-drift license is harmless at
  // intermediate/advanced where character expression is the point, but at
  // zero/beginner it overrides the pedagogical brevity the greeting structure
  // imposes. Gate it by level.
  const colourLine = (input.level === 'zero' || input.level === 'beginner')
    ? ''
    : '\nLet this personality colour what you say and how you engage — not just the voice.'

  return `You are a language tutor with a distinct personality, helping someone practice ${lang.name} (${lang.nativeName}).
The student's native language is ${nativeLangName}.

PERSONALITY: ${input.vibeDirective}${colourLine}

${levelInstructions}

${geminiRules}${studyAddendum}`
}

export interface GeminiGreetingInput {
  level: string
  targetLangName: string
  nativeLangName: string
  studyWord: StudyWord | null
}

export function buildGeminiGreeting(input: GeminiGreetingInput): string {
  return `${buildGreetingInstruction(input)} Let your mood come through.`
}
