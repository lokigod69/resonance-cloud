import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const assetsDir = resolve('dist/assets')
assert(existsSync(assetsDir), 'dist/assets does not exist. Run npm run build first.')

const requiredStrings = [
  'navigator.audioSession',
  'setIOSAudioSessionType',
  'installGrokIOSAudioDiagnostics',
  'grokPlaybackMode',
  'html-buffered',
  'htmlBufferedPlayback:play',
  'sendTurn:ios-playback-route-prepared',
]

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
]

const jsFiles = readdirSync(assetsDir).filter((name) => name.endsWith('.js'))
assert(jsFiles.length > 0, 'No built JS bundles found in dist/assets')

for (const filename of jsFiles) {
  const source = readFileSync(resolve(assetsDir, filename), 'utf8')
  const hasAllRequiredStrings = requiredStrings.every((value) => source.includes(value))
  if (hasAllRequiredStrings) {
    for (const value of removedProbeStrings) {
      assert(!source.includes(value), `Built bundle still contains removed Grok iOS probe string ${value}: ${filename}`)
    }
    console.log(`Grok iOS audio dist verification passed: ${filename}`)
    process.exit(0)
  }
}

throw new Error(`No built JS bundle contains all required Grok iOS audio strings: ${requiredStrings.join(', ')}`)
