import type { GuidedSpeakLocale } from '@/data/guidedLessons'

export function speakGuidedText(text: string, lang: GuidedSpeakLocale = 'en-US') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }

  try {
    cancelGuidedSpeech()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.88
    window.speechSynthesis.speak(utterance)
  } catch {
    return
  }
}

export function cancelGuidedSpeech() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }

  try {
    window.speechSynthesis.cancel()
  } catch {
    return
  }
}
