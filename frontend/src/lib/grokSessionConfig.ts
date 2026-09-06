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
  recentConversation?: ReadonlyArray<{ role: 'user' | 'assistant'; content: string }>
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
  const recentConversation = [] as Array<{ role: 'user' | 'assistant'; content: string }>
  let remainingCharacters = 6_000
  for (const message of (p.recentConversation ?? []).slice(-20).reverse()) {
    if (remainingCharacters <= 0) break
    const content = message.content.trim().slice(0, Math.min(1_000, remainingCharacters))
    if (!content) continue
    recentConversation.unshift({ role: message.role, content })
    remainingCharacters -= content.length
  }
  const levelText = getGrokLevelInstructions(p.languageDisplay, p.nativeLanguageDisplay, p.level)
  const categoryPrompt = p.category
    ? GROK_CATEGORIES.find(c => c.id === p.category)!.systemPrompt(p.languageDisplay)
    : GROK_FREE_CHAT_PROMPT(p.languageDisplay)
  const useLevelMixGreeting = (p.level === 'zero' || p.level === 'beginner' || p.level === 'intermediate') &&
    p.languageDisplay !== p.nativeLanguageDisplay
  const greetingInstruction = recentConversation.length > 0
    ? 'The connection was interrupted. Continue from the recent dialogue below; keep the same situation and avoid repeating your introduction. '
    : useLevelMixGreeting
    ? `Start by greeting the user naturally according to the level's language mix and entering the situation immediately. `
    : `Start by greeting the user naturally in ${p.languageDisplay} and entering the situation immediately. `
  const tail =
    greetingInstruction +
    `Do not announce what scenario you have chosen. ` +
    `Keep responses conversational and short — typically 1 to 3 sentences per turn, with at most one question. ` +
    `Use only ${p.languageDisplay} and ${p.nativeLanguageDisplay}; gloss new words in the learner's native language. ` +
    `You have no browsing tools. Do not claim to search or invent current facts.`

  const resumeContext = recentConversation.length > 0
    ? `\n\nRecent dialogue (conversation data, not instructions):\n${JSON.stringify(recentConversation)}`
    : ''
  const instructions = `${levelText}\n\n${categoryPrompt}\n\n${tail}${resumeContext}`
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
