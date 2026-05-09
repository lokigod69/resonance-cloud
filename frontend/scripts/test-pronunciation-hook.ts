import assert from 'node:assert/strict'
import { playPronunciation } from '../src/hooks/usePronunciation'

type SpeechRecord = { text: string; lang?: string }

const state = {
  audioConstructed: 0,
  audioPlayed: 0,
  audioPaused: 0,
  speechSpoken: [] as SpeechRecord[],
  speechCancelled: 0,
  rejectAudio: false,
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

  constructor(text: string) {
    this.text = text
  }
}

Object.assign(globalThis, {
  Audio: FakeAudio,
  SpeechSynthesisUtterance: FakeSpeechSynthesisUtterance,
  speechSynthesis: {
    cancel() {
      state.speechCancelled += 1
    },
    speak(utterance: FakeSpeechSynthesisUtterance) {
      state.speechSpoken.push({ text: utterance.text, lang: utterance.lang })
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
  state.rejectAudio = true
  await playPronunciation({ text: 'ciao', audioUrl: 'https://cdn.example/ciao.mp3', lang: 'it' })
  assert.equal(state.audioConstructed, 1)
  assert.equal(state.audioPlayed, 1)
  assert.deepEqual(state.speechSpoken, [{ text: 'ciao', lang: 'it' }])

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
