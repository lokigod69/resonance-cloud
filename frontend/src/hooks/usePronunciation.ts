import { useCallback } from 'react'
import { getLanguageCode } from '@/lib/languages'

type PronunciationInput = {
  text: string
  audioUrl?: string | null
  lang?: string | null
  /** When false, a word whose real audio fails to play stays SILENT instead of
   * dropping to the browser's synthetic voice. Callers that know the word has
   * a recorded file pass false — a robot voice standing in for a real one is
   * worse than nothing, and it teaches the wrong pronunciation. */
  allowSpeechFallback?: boolean
}

type PronunciationWord = {
  word: string
  tts_audio_url?: string | null
  target_language?: string | null
  language?: string | null
}

let activeAudio: HTMLAudioElement | null = null

function stopActiveAudio() {
  if (!activeAudio) return
  activeAudio.pause()
  activeAudio.currentTime = 0
  activeAudio = null
}

// Some engines (iOS Safari especially) stay silent when no installed voice
// matches utterance.lang and none was assigned explicitly — German works while
// Korean says nothing. Normalize the language ('Korean' → 'ko') and pick a
// concrete matching voice (exact tag, then regional 'ko-*', then base-prefix).
function pickVoice(code: string): SpeechSynthesisVoice | null {
  const voices = globalThis.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  const wanted = code.toLowerCase()
  return (
    voices.find((voice) => voice.lang.toLowerCase() === wanted)
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(`${wanted}-`))
    ?? voices.find((voice) => voice.lang.toLowerCase().split('-')[0] === wanted)
    ?? null
  )
}

function speakWithBrowser({ text, lang }: PronunciationInput) {
  if (!('speechSynthesis' in globalThis) || !text.trim()) return 'none' as const
  const utterance = new SpeechSynthesisUtterance(text)
  if (lang) {
    const code = getLanguageCode(lang) || lang
    const voice = pickVoice(code)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    } else {
      utterance.lang = code
    }
  }
  globalThis.speechSynthesis.speak(utterance)
  return 'speech' as const
}

// Warms a recorded pronunciation so the first play starts inside the user's
// gesture instead of waiting on the network — a cold mp3 fetch is what makes
// an autoplay-policy rejection (and with it the robot fallback) likely.
const prefetched = new Map<string, HTMLAudioElement>()

export function prefetchPronunciationAudio(url: string | null | undefined): void {
  if (!url || !('Audio' in globalThis) || prefetched.has(url)) return
  // Bounded: the Home water shows at most a dozen words at a time.
  if (prefetched.size > 32) prefetched.clear()
  const audio = new Audio()
  audio.preload = 'auto'
  audio.src = url
  audio.load()
  prefetched.set(url, audio)
}

export async function playPronunciation(input: PronunciationInput): Promise<'audio' | 'speech' | 'none'> {
  const text = input.text.trim()
  if (!text) return 'none'

  stopActiveAudio()
  if ('speechSynthesis' in globalThis) globalThis.speechSynthesis.cancel()

  if (input.audioUrl && 'Audio' in globalThis) {
    try {
      const audio = new Audio(input.audioUrl)
      activeAudio = audio
      await audio.play()
      return 'audio'
    } catch {
      stopActiveAudio()
    }
    // The file exists but this attempt did not start (autoplay policy, a
    // transient network error). Staying silent keeps the caller's replay
    // control honest; a synthetic voice here would sound like the answer.
    if (input.allowSpeechFallback === false) return 'none'
  }

  return speakWithBrowser({ text, lang: input.lang })
}

export function usePronunciation() {
  const play = useCallback((input: PronunciationInput) => playPronunciation(input), [])

  const playWord = useCallback((word: PronunciationWord) => {
    return playPronunciation({
      text: word.word,
      audioUrl: word.tts_audio_url,
      lang: word.target_language || word.language,
    })
  }, [])

  return { play, playWord }
}
