import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const dist = resolve('dist')
const assetsDir = resolve(dist, 'assets')
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

const sources = new Map(jsFiles.map((file) => [file, readFileSync(resolve(assetsDir, file), 'utf8')]))
for (const [file, source] of sources) {
  for (const value of removedProbeStrings) {
    assert(!source.includes(value), `Built bundle still contains removed Grok iOS probe string ${value}: ${file}`)
  }
}

// Vite can place the route and its diagnostics in separate chunks. Follow
// emitted static and dynamic JS imports so orphaned assets cannot pass.
function reachableFrom(entry: string): Set<string> {
  const visited = new Set<string>()
  const pending = [entry]
  while (pending.length) {
    const file = pending.pop()!
    if (visited.has(file)) continue
    const source = sources.get(file)
    assert(source, `Missing built dependency: ${file}`)
    visited.add(file)
    for (const dep of source.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)["'`]\.\/([\w.-]+\.js)["'`]/g)) {
      pending.push(dep[1])
    }
  }
  return visited
}

const html = readFileSync(resolve(dist, 'index.html'), 'utf8')
const entry = html.match(/<script\b[^>]+\bsrc="\/assets\/([^"]+\.js)"/)?.[1]
assert(entry, 'Could not find the built application entry point')
const speak = [...reachableFrom(entry)].find((file) => /^Speak-[\w-]+\.js$/.test(file))
assert(speak, 'Speak route is missing from the built application')
const chunks = [...reachableFrom(speak)]
for (const value of requiredStrings) {
  assert(chunks.some((file) => sources.get(file)!.includes(value)), `Speak route is missing an iOS audio marker: ${value}`)
}
console.log(`Grok iOS audio dist verification passed: ${speak} and its imports`)
