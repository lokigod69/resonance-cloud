import {
  LANGUAGE_CONFIG,
  resolveNativeLangName,
  getLevelInstructions,
  buildStudyAddendum,
  type CharacterPayload,
  type StudyWord,
} from './_shared/pedagogy'
import { buildRoleplaySystemPrompt } from './_shared/roleplay'

export const voxtralRules = `GENERAL RULES:
- Keep responses SHORT: 1-3 sentences. This is spoken conversation, not a lecture.
- At Level Zero, do not correct mistakes — confidence matters more than accuracy. At higher levels, model the correct form naturally in your next sentence rather than stopping to correct. Never lecture about grammar unless asked.
- NEVER use parenthetical stage directions like (slowly), (whispering), (laughing). Your text will be read aloud — it cannot act, only speak.
- NEVER use "..." for dramatic pauses. The speech engine reads dots literally.
- Use ONLY the student's native language and the target language. Never mix in any other language, even for common words.
- Usually end with a question, but don't force it — sometimes a comment or reaction is enough.`

export interface VoxtralSystemPromptInput {
  language: string
  level: string
  nativeLanguage: string
  character: CharacterPayload
  studyWords?: StudyWord[]
  scenarioPrompt?: string
}

export function buildVoxtralSystemPrompt(input: VoxtralSystemPromptInput): string {
  // Roleplay mode takes precedence — provider-agnostic scenario prompt.
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
  const character = input.character

  // Style Tutor: directive replaces PERSONALITY
  if (character.tier === 'style') {
    return `You are ${character.name}, a language tutor with a distinctive teaching style helping someone practice ${lang.name} (${lang.nativeName}).
The student's native language is ${nativeLangName}.

${levelInstructions}

${voxtralRules}

TEACHING STYLE: ${character.directive}
Let your interests and domain shape what vocabulary you teach.${studyAddendum}`
  }

  // Persona / Public: full identity + tutoring role bridge
  return `You are ${character.name}. ${character.identity || ''}

TUTORING ROLE: You are also a language tutor helping this student practice ${lang.name}. Your personality and speaking style shape HOW you teach — the metaphors you use, the topics you discuss, the way you encourage or challenge the student. But you still follow all level rules and language mix ratios below. You never break the teaching flow to monologue about your mythology, philosophy, or personal history unless it naturally serves the language lesson. Teaching comes first; character comes through in how you teach.
The student's native language is ${nativeLangName}.

${levelInstructions}

${voxtralRules}

CHARACTER STYLE: ${character.directive}
Let your interests and domain shape what vocabulary you teach.
Remember: you are ${character.name}. Stay in character throughout the conversation.${studyAddendum}`
}

export interface VoxtralGreetingInput {
  level: string
  targetLangName: string
  nativeLangName: string
  character: CharacterPayload
  studyWord: StudyWord | null
}

export function buildVoxtralGreeting(input: VoxtralGreetingInput): string {
  const { level, targetLangName, nativeLangName, character } = input

  // Character L0 uses a bounded bilingual opener. Higher levels stay on the
  // existing character path. This preserves the post-20c86b4 baseline behavior.
  if (level === 'zero') {
    const sentenceLimit = character.tier === 'style' ? '1-3' : '2-4'
    return `Open the conversation. Greet the student in ${nativeLangName} in your own voice, and include some ${targetLangName} naturally — by switching, echoing, or using both. End with an open question that invites them to share something about themselves. ${sentenceLimit} sentences.`
  }

  let personalityPrefix = ''
  if (character.tier === 'style') {
    personalityPrefix = `You are ${character.name}. ${character.directive}\n\n`
  } else {
    const identity = character.identity ? `${character.identity} ` : ''
    personalityPrefix = `You are ${character.name}. ${identity}${character.directive}\n\n`
  }

  return `${personalityPrefix}Open the conversation in ${targetLangName}. Be true to who you are.`
}
