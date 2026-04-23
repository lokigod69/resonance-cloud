import type { GrokCategory } from '../data/grokCategories'
import type { GrokVoice } from '../data/grokVoices'
import { GROK_CATEGORIES, GROK_FREE_CHAT_PROMPT } from '../data/grokCategories'
import { getGrokLevelInstructions, type GrokLevel } from './grokPedagogy'

export interface BuildGrokSessionParams {
  language: string
  languageDisplay: string
  level: GrokLevel
  nativeLanguageDisplay: string
  voice: GrokVoice
  category: GrokCategory | null
}

export interface GrokSessionConfig {
  type: 'session.update'
  session: {
    voice: GrokVoice
    instructions: string
    turn_detection: null
    tools: Array<{ type: 'web_search' }>
    audio: {
      input: { format: { type: 'audio/pcm'; rate: 24000 } }
      output: { format: { type: 'audio/pcm'; rate: 24000 } }
    }
  }
}

export function buildGrokSessionConfig(p: BuildGrokSessionParams): GrokSessionConfig {
  const levelText = getGrokLevelInstructions(p.languageDisplay, p.nativeLanguageDisplay, p.level)
  const categoryPrompt = p.category
    ? GROK_CATEGORIES.find(c => c.id === p.category)!.systemPrompt
    : GROK_FREE_CHAT_PROMPT
  const tail =
    `Start by greeting the user naturally in ${p.languageDisplay} and entering the situation immediately. ` +
    `Do not announce what scenario you have chosen. ` +
    `Keep responses conversational and short — typically 1 to 3 sentences per turn.`

  const instructions = `${levelText}\n\n${categoryPrompt}\n\n${tail}`

  return {
    type: 'session.update',
    session: {
      voice: p.voice,
      instructions,
      turn_detection: null,
      tools: [{ type: 'web_search' }],
      audio: {
        input: { format: { type: 'audio/pcm', rate: 24000 } },
        output: { format: { type: 'audio/pcm', rate: 24000 } },
      },
    },
  }
}
