/* eslint-disable */
import { record } from './scenario'

export async function playPronunciation(input: any): Promise<'audio' | 'speech' | 'none'> {
  record('pronounce', { text: input?.text, audioUrl: input?.audioUrl ?? null, lang: input?.lang })
  return 'audio'
}

export function usePronunciation() {
  return { play: playPronunciation, playing: false, stop: () => {} }
}
