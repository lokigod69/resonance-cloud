export interface ReplayableSpeakMessage {
  role: 'user' | 'assistant'
  content: string
  audioBase64?: string
  audioFormat?: string
}

export const MAX_REPLAY_AUDIO_MESSAGES = 4

/** Preserve the full transcript while retaining replay payloads only for recent replies. */
export function capReplayAudio<T extends ReplayableSpeakMessage>(
  messages: T[],
  keep = MAX_REPLAY_AUDIO_MESSAGES,
): T[] {
  const capped = messages.slice()
  let retained = 0
  for (let index = capped.length - 1; index >= 0; index--) {
    const message = capped[index]
    if (message.role !== 'assistant' || !message.audioBase64) continue
    if (retained < keep) {
      retained++
      continue
    }
    const transcriptOnly = { ...message }
    delete transcriptOnly.audioBase64
    delete transcriptOnly.audioFormat
    capped[index] = transcriptOnly
  }
  return capped
}
