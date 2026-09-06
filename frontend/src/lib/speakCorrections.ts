export const CORRECTIONS_TIMEOUT_MS = 40_000
const MAX_TRANSCRIPT_ENTRIES = 40
const MAX_MESSAGE_LENGTH = 4_000

export interface CorrectionTranscriptMessage {
  role: string
  content: string
}

/** Match the API's limits without losing the most recent exchange. */
export function prepareCorrectionsTranscript(messages: readonly CorrectionTranscriptMessage[]) {
  return messages
    .filter(message => (message.role === 'user' || message.role === 'assistant') && message.content.trim())
    .slice(-MAX_TRANSCRIPT_ENTRIES)
    .map(message => ({
      role: message.role as 'user' | 'assistant',
      content: message.content.slice(0, MAX_MESSAGE_LENGTH),
    }))
}
