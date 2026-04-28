import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildGrokSessionConfig, GROK_TURN_PROTOCOL } from '../src/lib/grokSessionConfig'
import { getGrokLevelInstructions } from '../src/lib/grokPedagogy'

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
const diagnosticsSource = readFileSync(resolve('src/lib/grokIOSAudioDiagnostics.ts'), 'utf8')
const speakSource = readFileSync(resolve('src/pages/Speak.tsx'), 'utf8')
const allSource = `${hookSource}\n${diagnosticsSource}\n${speakSource}`
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
assert(diagnosticsSource.includes('navigator.audioSession'), 'iOS AudioSession helper must feature-detect navigator.audioSession')
assert(allSource.includes('iosAudioSession:set'), 'iOS AudioSession set log must exist')
assert(hookSource.includes('sendTurn:ios-playback-route-prepared'), 'sendTurn must prepare iOS playback route before response.create')
assert(hookSource.includes('serverVad:ios-playback-route-prepared'), 'server_vad must prepare playback route on server events')
assert(hookSource.includes('grokIOSRecreateAudioContextAfterMic'), 'iOS AudioContext recreation flag must exist')
assert(allSource.includes('htmlBufferedPlayback:play'), 'HTML buffered playback debug mode must exist')
assert(hookSource.includes('grokIOSMicProcessing'), 'iOS mic processing debug flag must exist')
assert(!allSource.includes('__grokRunIOSAudio' + 'RouteProbe'), 'debug iOS route probe global must not be exposed')
for (const removedRouteProbeLog of [
  'iosRouteProbe' + ':start',
  'iosRouteProbe' + ':first-reference-played',
  'iosRouteProbe' + ':mic-opened',
  'iosRouteProbe' + ':mic-released',
  'iosRouteProbe' + ':playback-restored',
  'iosRouteProbe' + ':second-reference-played',
  'iosRouteProbe' + ':done',
]) {
  assert(!allSource.includes(removedRouteProbeLog), `route probe log must be removed: ${removedRouteProbeLog}`)
}
assert(!hookSource.includes('createGain('), 'must not add GainNode normalization')
assert(!hookSource.includes('DynamicsCompressor'), 'must not add compressor workaround')

const beginnerInstructions = getGrokLevelInstructions('German', 'English', 'beginner')
assert(beginnerInstructions.includes('approximately even mix'), 'Beginner prompt must require approximate 50/50 language mix')
assert(beginnerInstructions.includes('Do not use brackets or parentheses for glosses'), 'Beginner prompt must forbid bracketed/parenthetical glosses')
assert(beginnerInstructions.includes('Do not speak only in the target language'), 'Beginner prompt must forbid target-only output')
assert(beginnerInstructions.includes('first greeting should already show this balance'), 'Beginner prompt must require balanced first greeting')

const beginnerConfig = buildGrokSessionConfig({
  language: 'de',
  languageDisplay: 'German',
  level: 'beginner',
  nativeLanguageDisplay: 'English',
  voice: 'eve',
  category: null,
})
assert(
  !beginnerConfig.session.instructions.includes('Start by greeting the user naturally in German'),
  'Beginner greeting tail must not force target-only greeting',
)

console.log('Grok realtime protocol checks passed')
