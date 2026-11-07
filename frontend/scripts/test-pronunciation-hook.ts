import assert from 'node:assert/strict'
import { playPronunciation } from '../src/hooks/usePronunciation'

type SpeechRecord = { text: string; lang?: string; voice?: string }

const state = {
  audioConstructed: 0,
  audioPlayed: 0,
  audioPaused: 0,
  speechSpoken: [] as SpeechRecord[],
  speechCancelled: 0,
  rejectAudio: false,
  voices: [] as Array<{ name: string; lang: string }>,
}

class FakeAudio {
  src: string
  currentTime = 0

  constructor(src: string) {
    this.src = src
    state.audioConstructed += 1
  }

  async play() {
    state.audioPlayed += 1
    if (state.rejectAudio) throw new Error('blocked')
  }

  pause() {
    state.audioPaused += 1
  }
}

class FakeSpeechSynthesisUtterance {
  text: string
  lang = ''
  voice: { name: string; lang: string } | null = null

  constructor(text: string) {
    this.text = text
  }
}

Object.assign(globalThis, {
  Audio: FakeAudio,
  SpeechSynthesisUtterance: FakeSpeechSynthesisUtterance,
  speechSynthesis: {
    getVoices() { return state.voices },
    cancel() {
      state.speechCancelled += 1
    },
    speak(utterance: FakeSpeechSynthesisUtterance) {
      state.speechSpoken.push({ text: utterance.text, lang: utterance.lang, ...(utterance.voice ? { voice: utterance.voice.name } : {}) })
    },
  },
})

function reset() {
  state.audioConstructed = 0
  state.audioPlayed = 0
  state.audioPaused = 0
  state.speechSpoken = []
  state.speechCancelled = 0
  state.rejectAudio = false
  state.voices = []
}

async function main() {
  reset()
  assert.equal(state.audioConstructed, 0, 'importing the hook must not autoplay')
  await playPronunciation({ text: 'bonjour', audioUrl: 'https://cdn.example/bonjour.mp3', lang: 'fr' })
  assert.equal(state.audioConstructed, 1)
  assert.equal(state.audioPlayed, 1)
  assert.equal(state.speechSpoken.length, 0)

  reset()
  await playPronunciation({ text: 'hola', audioUrl: null, lang: 'es' })
  assert.equal(state.audioConstructed, 0)
  assert.deepEqual(state.speechSpoken, [{ text: 'hola', lang: 'es' }])
  assert.equal(state.speechCancelled, 1)

  reset()
  state.voices = [{ name: 'German voice', lang: 'de-DE' }, { name: 'English voice', lang: 'en-GB' }]
  assert.equal(await playPronunciation({ text: 'Perspicacity', audioUrl: null, lang: 'English' }), 'speech')
  assert.deepEqual(state.speechSpoken, [{ text: 'Perspicacity', lang: 'en-GB', voice: 'English voice' }], 'canonical target language selects a matching installed device voice')

  reset()
  state.rejectAudio = true
  await playPronunciation({ text: 'ciao', audioUrl: 'https://cdn.example/ciao.mp3', lang: 'it' })
  assert.equal(state.audioConstructed, 1)
  assert.equal(state.audioPlayed, 1)
  assert.deepEqual(state.speechSpoken, [{ text: 'ciao', lang: 'it' }])

  reset()
  state.rejectAudio = true
  assert.equal(await playPronunciation({ text: 'ciao', audioUrl: 'https://cdn.example/ciao.mp3', lang: 'it', allowSpeechFallback: false }), 'none')
  assert.equal(state.speechSpoken.length, 0, 'recorded-audio-only callers must remain silent if playback fails')

  reset()
  await playPronunciation({ text: 'eins', audioUrl: 'https://cdn.example/eins.mp3', lang: 'de' })
  await playPronunciation({ text: 'zwei', audioUrl: 'https://cdn.example/zwei.mp3', lang: 'de' })
  assert.equal(state.audioPaused, 1, 'playing another word should pause previous audio')

  console.log('pronunciation hook checks passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
