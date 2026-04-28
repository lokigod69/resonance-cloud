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

export const GROK_TURN_PROTOCOL = 'manual_commit_ack' as const
export type GrokTurnProtocol = typeof GROK_TURN_PROTOCOL | 'server_vad'

export function getGrokTurnProtocol(): GrokTurnProtocol {
  try {
    if (
      typeof window !== 'undefined' &&
      window.localStorage.getItem('grokTurnProtocol') === 'server_vad'
    ) {
      return 'server_vad'
    }
  } catch {
    // localStorage can be unavailable in private browsing or server contexts.
  }
  return GROK_TURN_PROTOCOL
}

type GrokTurnDetectionConfig = null | {
  type: 'server_vad'
  threshold: 0.85
  silence_duration_ms: 500
  prefix_padding_ms: 333
}

export interface GrokSessionConfig {
  type: 'session.update'
  session: {
    voice: GrokVoice
    instructions: string
    turn_detection: GrokTurnDetectionConfig
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
  const useLevelMixGreeting = (p.level === 'zero' || p.level === 'beginner') &&
    p.languageDisplay !== p.nativeLanguageDisplay
  const greetingInstruction = useLevelMixGreeting
    ? `Start by greeting the user naturally according to the level's language mix and entering the situation immediately. `
    : `Start by greeting the user naturally in ${p.languageDisplay} and entering the situation immediately. `
  const tail =
    greetingInstruction +
    `Do not announce what scenario you have chosen. ` +
    `Keep responses conversational and short — typically 1 to 3 sentences per turn.`

  const instructions = `${levelText}\n\n${categoryPrompt}\n\n${tail}`
  const turnProtocol = getGrokTurnProtocol()

  return {
    type: 'session.update',
    session: {
      voice: p.voice.toLowerCase() as GrokVoice,
      instructions,
      turn_detection: turnProtocol === 'server_vad'
        ? {
            type: 'server_vad',
            threshold: 0.85,
            silence_duration_ms: 500,
            prefix_padding_ms: 333,
          }
        : null,
      audio: {
        input: { format: { type: 'audio/pcm', rate: 24000 } },
        output: { format: { type: 'audio/pcm', rate: 24000 } },
      },
    },
  }
}
