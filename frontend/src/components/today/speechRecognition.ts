type SpeechRecognitionResultLike = {
  isFinal?: boolean
  0?: {
    transcript?: string
  }
}

type SpeechRecognitionEventLike = {
  resultIndex?: number
  results: SpeechRecognitionResultLike[]
}

type BrowserSpeechRecognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
}

export type BrowserSpeechRecognizer = {
  start: () => void
  stop: () => void
  abort: () => void
}

export type BrowserSpeechRecognizerLang = 'en-US' | 'en-GB' | 'es-ES' | 'it-IT' | 'fr-FR' | 'de-DE' | 'ceb-PH'

export type BrowserSpeechRecognizerOptions = {
  lang: BrowserSpeechRecognizerLang
  onResult: (transcript: string) => void
  onError: () => void
  onEnd: () => void
}

export const TODAY_SPEECH_RECOGNITION_LANG: BrowserSpeechRecognizerLang = 'en-US'

export function getBrowserSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const speechWindow = window as SpeechRecognitionWindow
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

export function canUseBrowserSpeechRecognition() {
  return getBrowserSpeechRecognitionConstructor() !== null
}

export function createBrowserSpeechRecognizer(
  options: BrowserSpeechRecognizerOptions,
): BrowserSpeechRecognizer | null {
  const SpeechRecognitionConstructor = getBrowserSpeechRecognitionConstructor()
  if (!SpeechRecognitionConstructor) return null

  const recognition = new SpeechRecognitionConstructor()
  recognition.lang = options.lang
  recognition.interimResults = false
  recognition.continuous = false
  recognition.maxAlternatives = 1
  recognition.onresult = (event) => {
    const resultIndex = event.resultIndex ?? event.results.length - 1
    const transcript = event.results[resultIndex]?.[0]?.transcript?.trim()
    if (transcript) options.onResult(transcript)
  }
  recognition.onerror = options.onError
  recognition.onend = options.onEnd

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  }
}

export function normalizeSpokenPhrase(text: string) {
  return text
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

export function getSpeechWordOverlap(transcript: string, targetPhrase: string) {
  const transcriptWords = new Set(normalizeSpokenPhrase(transcript))
  const targetWords = normalizeSpokenPhrase(targetPhrase)
  if (targetWords.length === 0) return 0

  const matchedWords = targetWords.filter((word) => transcriptWords.has(word))
  return matchedWords.length / targetWords.length
}

export function speechTranscriptPasses(
  transcript: string,
  targetPhrase: string,
  threshold = 0.8,
) {
  return getSpeechWordOverlap(transcript, targetPhrase) >= threshold
}
