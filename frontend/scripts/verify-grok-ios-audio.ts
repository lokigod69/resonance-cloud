import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const hookSource = readFileSync(resolve('src/hooks/useGrokRealtime.ts'), 'utf8')
const sessionConfigSource = readFileSync(resolve('src/lib/grokSessionConfig.ts'), 'utf8')
const pedagogySource = readFileSync(resolve('src/lib/grokPedagogy.ts'), 'utf8')
const diagnosticsPath = resolve('src/lib/grokIOSAudioDiagnostics.ts')
const diagnosticsSource = existsSync(diagnosticsPath)
  ? readFileSync(diagnosticsPath, 'utf8')
  : ''
const speakSource = readFileSync(resolve('src/pages/Speak.tsx'), 'utf8')
const allSource = [
  hookSource,
  sessionConfigSource,
  pedagogySource,
  diagnosticsSource,
  speakSource,
].join('\n')

const requiredStrings = [
  'navigator.audioSession',
  'setIOSAudioSessionType',
  'installGrokIOSAudioDiagnostics',
  'grokPlaybackMode',
  'html-buffered',
  'htmlBufferedPlayback:play',
  'sendTurn:ios-playback-route-prepared',
]

for (const value of requiredStrings) {
  assert(allSource.includes(value), `Missing required Grok iOS audio string: ${value}`)
}

assert(diagnosticsSource.includes('export function installGrokIOSAudioDiagnostics'), 'Diagnostics installer must be exported')
const removedProbeStrings = [
  '__grokRunIOSAudio' + 'RouteProbe',
  '__grokIOSAudio' + 'Diagnostics',
  'iosRouteProbe' + ':start',
  'iosRouteProbe' + ':first-reference-played',
  'iosRouteProbe' + ':mic-opened',
  'iosRouteProbe' + ':mic-released',
  'iosRouteProbe' + ':playback-restored',
  'iosRouteProbe' + ':second-reference-played',
  'iosRouteProbe' + ':done',
  'grokIOSRoute' + 'ProbePanel',
  'Run iOS audio route probe',
]
for (const value of removedProbeStrings) {
  assert(!allSource.includes(value), `Removed Grok iOS probe string should not exist: ${value}`)
}
assert(hookSource.includes("setIOSAudioSessionType('playback', 'prime-before-greeting')"), 'Session start must set playback route before greeting')
assert(hookSource.includes("setIOSAudioSessionType('play-and-record', 'before-getUserMedia')"), 'startListening must set play-and-record before getUserMedia')
assert(hookSource.includes("prepareIOSPlaybackRouteAfterMic('before-response-create')"), 'sendTurn must prepare playback route before response.create')
assert(hookSource.includes('input_audio_buffer.committed'), 'Manual commit ACK handling must remain present')
assert(hookSource.includes('sendTurn:response-create-after-commit'), 'Manual response.create-after-ACK log must remain present')
assert(!hookSource.includes('createGain('), 'Must not add GainNode normalization')
assert(!hookSource.includes('DynamicsCompressor'), 'Must not add compressor workaround')
assert(!allSource.includes('RMS matching'), 'Must not add RMS matching workaround')

const hasBeginnerGreetingMix =
  sessionConfigSource.includes("(p.level === 'zero' || p.level === 'beginner')") ||
  sessionConfigSource.includes("p.level === 'zero'") && sessionConfigSource.includes("p.level === 'beginner'")
assert(hasBeginnerGreetingMix, 'Beginner greeting must follow level-specific language mix')
assert(
  sessionConfigSource.includes("Start by greeting the user naturally according to the level's language mix"),
  'Mixed-level greeting instruction must defer to level mix',
)
assert(pedagogySource.includes('approximately even mix'), 'Beginner pedagogy must require 50/50-ish language mix')

console.log('Grok iOS audio source verification passed')
