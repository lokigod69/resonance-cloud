import { LANGUAGE_CONFIG, resolveNativeLangName, getLevelInstructions } from './pedagogy'

export interface RoleplayInput {
  language: string
  level: string
  nativeLanguage: string
  scenarioPrompt: string
}

export function buildRoleplaySystemPrompt(input: RoleplayInput): string {
  const lang = LANGUAGE_CONFIG[input.language]
  if (!lang) throw new Error(`Unsupported language: ${input.language}`)

  const nativeLangName = resolveNativeLangName(input.nativeLanguage)
  const levelInstructions = getLevelInstructions(lang.name, nativeLangName, input.level)

  return `${input.scenarioPrompt}

${levelInstructions}

GENERAL RULES:
- Keep responses to 1–3 sentences. This is a spoken conversation.
- Never break character to correct grammar mid-scene. Stay in the scenario.
- If the user speaks in the wrong language, respond only in ${lang.name} as your character would — as if you did not understand.
- Do not say "let's practice" or refer to language learning. You are not a tutor in this mode.
- One question or prompt per turn to keep the conversation moving.
- Natural fillers and reactions are welcome. No stage directions.`
}
