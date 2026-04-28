import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const assetsDir = resolve('dist/assets')
assert(existsSync(assetsDir), 'dist/assets does not exist. Run npm run build first.')

const requiredStrings = [
  '__grokRunIOSAudioRouteProbe',
  'grokPlaybackMode',
  'html-buffered',
  'htmlBufferedPlayback:play',
  'iosRouteProbe:done',
  'grokIOSRouteProbePanel',
  'navigator.audioSession',
]

const jsFiles = readdirSync(assetsDir).filter((name) => name.endsWith('.js'))
assert(jsFiles.length > 0, 'No built JS bundles found in dist/assets')

for (const filename of jsFiles) {
  const source = readFileSync(resolve(assetsDir, filename), 'utf8')
  const hasAllRequiredStrings = requiredStrings.every((value) => source.includes(value))
  if (hasAllRequiredStrings) {
    console.log(`Grok iOS audio dist verification passed: ${filename}`)
    process.exit(0)
  }
}

throw new Error(`No built JS bundle contains all required Grok iOS audio strings: ${requiredStrings.join(', ')}`)
