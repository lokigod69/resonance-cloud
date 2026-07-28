/**
 * Static contract test for Premium Card visual selector assets.
 *
 * Run:  npx tsx scripts/test-premium-style-assets.ts
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  CARD_LAYER2_ART_STYLE_OPTIONS,
  type CardLayer2ArtStyle,
} from '../src/components/generate/useWizardState.ts'
import {
  MEANING_STRATEGY_SAMPLE_PATHS,
  PREMIUM_OPTION_SAMPLE_BASE_PATH,
  PREMIUM_STYLE_SAMPLE_BASE_PATH,
  PREMIUM_STYLE_SAMPLE_PATHS,
  PRESENTATION_FORM_SAMPLE_PATHS,
  premiumStyleSamplePath,
} from '../src/components/generate/premiumVisualAssets.ts'

let failures = 0
let passes = 0

function assert(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passes += 1
    console.log(`  ok  ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}`)
    if (detail !== undefined) console.error('       ', detail)
  }
}

const styles = CARD_LAYER2_ART_STYLE_OPTIONS.map((option) => option.value)

console.log('\n[premium style sample assets]')
assert(
  'base path is public premium-style-samples',
  PREMIUM_STYLE_SAMPLE_BASE_PATH === '/premium-style-samples',
  PREMIUM_STYLE_SAMPLE_BASE_PATH,
)
assert('20 styles have sample mappings', Object.keys(PREMIUM_STYLE_SAMPLE_PATHS).length === 20)

for (const style of styles) {
  const expectedPath = `/premium-style-samples/${style}.webp`
  const actualPath = premiumStyleSamplePath(style)
  assert(`${style} path uses enum filename`, actualPath === expectedPath, actualPath)
  assert(
    `${style} exists in public assets`,
    existsSync(join(process.cwd(), 'public', 'premium-style-samples', `${style}.webp`)),
  )
}

const mappedKeys = Object.keys(PREMIUM_STYLE_SAMPLE_PATHS).sort()
const optionKeys = [...styles].sort()
assert(
  'mapping keys match exposed enum values',
  JSON.stringify(mappedKeys) === JSON.stringify(optionKeys),
  { mappedKeys, optionKeys },
)

assert(
  'mapping is strongly typed for all style enums',
  styles.every((style) => Boolean(PREMIUM_STYLE_SAMPLE_PATHS[style as CardLayer2ArtStyle])),
)

console.log('\n[premium option sample assets]')
assert(
  'option base path is public premium-option-samples',
  PREMIUM_OPTION_SAMPLE_BASE_PATH === '/premium-option-samples',
  PREMIUM_OPTION_SAMPLE_BASE_PATH,
)
const optionSamples: Array<[string, string]> = [
  ...Object.entries(MEANING_STRATEGY_SAMPLE_PATHS),
  ...Object.entries(PRESENTATION_FORM_SAMPLE_PATHS),
]
assert('9 meaning/presentation options have sample mappings', optionSamples.length === 9)
for (const [option, mappedPath] of optionSamples) {
  const expectedPath = `/premium-option-samples/${option}.webp`
  assert(`${option} path uses enum filename`, mappedPath === expectedPath, mappedPath)
  assert(
    `${option} exists in public assets`,
    existsSync(join(process.cwd(), 'public', 'premium-option-samples', `${option}.webp`)),
  )
}

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)
