export interface GrokTranscriptState {
  text: string
  audio: string
  audioDone: boolean
}

export function emptyGrokTranscript(): GrokTranscriptState {
  return { text: '', audio: '', audioDone: false }
}

/** Audio transcript is authoritative; text deltas are a fallback, not extra words. */
export function mergeGrokTranscript(
  previous: GrokTranscriptState,
  source: 'text' | 'audio' | 'audio_done',
  value: string,
): GrokTranscriptState {
  if (source === 'text') return { ...previous, text: previous.text + value }
  if (source === 'audio_done') {
    return { ...previous, audio: value || previous.audio, audioDone: true }
  }
  if (previous.audioDone) return previous
  return { ...previous, audio: previous.audio + value }
}

export function grokTranscriptText(state: GrokTranscriptState): string {
  return state.audio || state.text
}
