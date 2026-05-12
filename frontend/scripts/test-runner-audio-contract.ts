import { RunnerAudio } from '../src/games/runner/audio/RunnerAudio'

class FakeAudio {
  preload = ''
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  paused = true

  constructor(readonly src?: string) {}

  async play(): Promise<void> {
    this.paused = false
    throw new Error('autoplay blocked')
  }

  pause(): void {
    this.paused = true
  }

  removeAttribute(): void {}
  load(): void {}
}

class FakeAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}

  async resume(): Promise<void> {}
  createBuffer(): unknown {
    return {}
  }
  createBufferSource(): unknown {
    return {
      buffer: null,
      connect: () => undefined,
      start: () => undefined,
      stop: () => undefined,
    }
  }
  async decodeAudioData(): Promise<AudioBuffer> {
    throw new Error('decode failed')
  }
}

class FakeUtterance {
  lang = ''
  onend: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(readonly text: string) {}
}

async function main() {
  let speechCount = 0

  Object.assign(globalThis, {
    Audio: FakeAudio,
    SpeechSynthesisUtterance: FakeUtterance,
    window: {
      AudioContext: FakeAudioContext,
      webkitAudioContext: FakeAudioContext,
      SpeechSynthesisUtterance: FakeUtterance,
      speechSynthesis: {
        cancel: () => undefined,
        pause: () => undefined,
        resume: () => undefined,
        speak: (utterance: FakeUtterance) => {
          speechCount += 1
          utterance.onend?.()
        },
      },
      fetch: async () => {
        throw new Error('network blocked')
      },
    },
  })

  const audio = new RunnerAudio()
  await audio.speak('네', 'https://example.invalid/tts.mp3', 'ko')

  if (speechCount !== 0) {
    throw new Error(`Expected no browser speech fallback when a trained TTS URL exists, saw ${speechCount}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
