import { useCallback } from 'react'

type PronunciationInput = {
  text: string
  audioUrl?: string | null
  lang?: string | null
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

function speakWithBrowser({ text, lang }: PronunciationInput) {
  if (!('speechSynthesis' in globalThis) || !text.trim()) return 'none' as const
  const utterance = new SpeechSynthesisUtterance(text)
  if (lang) utterance.lang = lang
  globalThis.speechSynthesis.speak(utterance)
  return 'speech' as const
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
