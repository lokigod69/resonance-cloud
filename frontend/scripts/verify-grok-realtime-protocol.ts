import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildGrokSessionConfig, GROK_TURN_PROTOCOL } from '../src/lib/grokSessionConfig'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const config = buildGrokSessionConfig({
  language: 'de',
  languageDisplay: 'German',
  level: 'zero',
  nativeLanguageDisplay: 'English',
  voice: 'eve',
  category: null,
})

assert(GROK_TURN_PROTOCOL === 'manual_commit_ack', 'default Grok turn protocol must be manual_commit_ack')
assert(config.type === 'session.update', 'session config must be a session.update payload')
assert(config.session.voice === 'eve', 'voice id must be lowercase xAI voice id')
assert(config.session.turn_detection === null, 'manual mode turn_detection must be null')

const sessionKeys = Object.keys(config.session).sort()
assert(
  JSON.stringify(sessionKeys) === JSON.stringify(['audio', 'instructions', 'turn_detection', 'voice']),
  `unexpected session keys: ${sessionKeys.join(',')}`,
)
assert(config.session.audio.input.format.type === 'audio/pcm', 'input audio type must be audio/pcm')
assert(config.session.audio.input.format.rate === 24000, 'input audio rate must be 24000')
assert(config.session.audio.output.format.type === 'audio/pcm', 'output audio type must be audio/pcm')
assert(config.session.audio.output.format.rate === 24000, 'output audio rate must be 24000')

const hookSource = readFileSync(resolve('src/hooks/useGrokRealtime.ts'), 'utf8')
assert(
  hookSource.includes('grok-voice-think-fast-1.0'),
  'websocket model must be grok-voice-think-fast-1.0',
)
assert(
  hookSource.includes('input_audio_buffer.committed'),
  'hook must handle input_audio_buffer.committed',
)
assert(
  hookSource.includes('sendTurn:response-create-after-commit'),
  'sendTurn must log response.create after commit ack',
)
assert(
  hookSource.includes('queueAudioBuffer:skipped-silent-first-chunk'),
  'silent first chunk skip instrumentation must remain present',
)

console.log('Grok realtime protocol checks passed')
