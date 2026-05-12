/**
 * Static validation for Guided Today vibe definitions and local-only vibe selection.
 *
 * Run: npx tsx scripts/test-guided-vibes.ts
 */

import {
  ACTIVE_GUIDED_VIBE_IDS,
  FUTURE_GUIDED_VIBE_IDS,
  getGuidedVibe,
  guidedVibes,
  isActiveGuidedVibeId,
  type GuidedVibeId,
} from '../src/data/guidedVibes.ts'
import {
  DEFAULT_GUIDED_VIBE_ID,
  clearSelectedGuidedVibe,
  getSelectedGuidedVibe,
  resolveGuidedVibe,
  setSelectedGuidedVibe,
  todayGuidedVibeKey,
} from '../src/lib/todayVibe.ts'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

let failures = 0
let passes = 0

function assert(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1
    console.log(`  ok  ${name}`)
    return
  }

  failures += 1
  console.error(`  FAIL ${name}`)
  if (detail !== undefined) console.error('       ', detail)
}

const pathId = 'english-a1-practical-1'
const expectedActiveVibes: GuidedVibeId[] = ['bright', 'wistful', 'sharp']
const expectedFutureVibes: GuidedVibeId[] = ['tender', 'bold', 'cheeky']

console.log('\n[vibe registry]')
assert('default vibe is bright', DEFAULT_GUIDED_VIBE_ID === 'bright')
assert('active vibes are unique', new Set(ACTIVE_GUIDED_VIBE_IDS).size === ACTIVE_GUIDED_VIBE_IDS.length, ACTIVE_GUIDED_VIBE_IDS)
assert('future vibes are unique', new Set(FUTURE_GUIDED_VIBE_IDS).size === FUTURE_GUIDED_VIBE_IDS.length, FUTURE_GUIDED_VIBE_IDS)
assert('active vibes are Bright, Wistful, Sharp', JSON.stringify(ACTIVE_GUIDED_VIBE_IDS) === JSON.stringify(expectedActiveVibes), ACTIVE_GUIDED_VIBE_IDS)
assert('future vibes are Tender, Bold, Cheeky', JSON.stringify(FUTURE_GUIDED_VIBE_IDS) === JSON.stringify(expectedFutureVibes), FUTURE_GUIDED_VIBE_IDS)
for (const vibeId of [...expectedActiveVibes, ...expectedFutureVibes]) {
  const vibe = getGuidedVibe(vibeId)
  assert(`${vibeId} exists in registry`, guidedVibes[vibeId] === vibe, vibe)
  assert(`${vibeId} has a label`, vibe.label.length > 0, vibe)
  assert(`${vibeId} has a short description`, vibe.shortDescription.length > 0, vibe)
  assert(`${vibeId} has a personality summary`, vibe.personalitySummary.length > 0, vibe)
  assert(`${vibeId} has a word palette`, vibe.wordPalette.length >= 4, vibe.wordPalette)
  assert(`${vibeId} has signature phrasings`, vibe.signaturePhrasings.length >= 2, vibe.signaturePhrasings)
  assert(`${vibeId} has example sentences`, vibe.exampleSentences.length >= 2, vibe.exampleSentences)
  assert(`${vibeId} has scene mood notes`, vibe.sceneMoodNotes.length > 0, vibe)
  assert(`${vibeId} has music genre`, vibe.musicGenre.length > 0, vibe)
  assert(`${vibeId} has UI aesthetic notes`, vibe.uiAesthetic.length > 0, vibe)
  assert(`${vibeId} has trophy candidates`, vibe.trophyWordCandidates.length >= 4, vibe.trophyWordCandidates)
}
for (const vibeId of expectedActiveVibes) {
  const vibe = getGuidedVibe(vibeId)
  assert(`${vibeId} active vibe has an emblem URL`, typeof vibe.emblem?.url === 'string' && vibe.emblem.url === `/guided/vibes/${vibeId}-emblem.webp`, vibe)
  assert(`${vibeId} active vibe has emblem alt text`, typeof vibe.emblem?.alt === 'string' && vibe.emblem.alt === `${vibe.label} voice emblem`, vibe)
  assert(`${vibeId} production emblem is WebP with alpha`, hasWebpAlpha(`../public/guided/vibes/${vibeId}-emblem.webp`))
}
for (const vibeId of expectedFutureVibes) {
  const vibe = getGuidedVibe(vibeId)
  assert(`${vibeId} future vibe does not require an emblem`, vibe.emblem === undefined, vibe)
}

console.log('\n[active resolver]')
assert('bright is active', isActiveGuidedVibeId('bright'))
assert('wistful is active', isActiveGuidedVibeId('wistful'))
assert('sharp is active', isActiveGuidedVibeId('sharp'))
assert('tender is not active', !isActiveGuidedVibeId('tender'))
assert('unknown is not active', !isActiveGuidedVibeId('unknown'))
assert('resolver keeps active value', resolveGuidedVibe('wistful') === 'wistful')
assert('resolver falls back for invalid value', resolveGuidedVibe('bogus') === 'bright')
assert('resolver falls back for future value', resolveGuidedVibe('tender') === 'bright')
assert('resolver falls back for missing value', resolveGuidedVibe(null) === 'bright')

console.log('\n[local storage]')
const originalWindow = globalThis.window
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: createMemoryStorage() },
  configurable: true,
})

try {
  assert('storage key is path-scoped', todayGuidedVibeKey(pathId) === 'resonance_guided_vibe__english-a1-practical-1')
  assert('missing selected vibe defaults to bright', getSelectedGuidedVibe(pathId) === 'bright')
  setSelectedGuidedVibe(pathId, 'sharp')
  assert('selected active vibe persists locally', getSelectedGuidedVibe(pathId) === 'sharp')
  window.localStorage.setItem(todayGuidedVibeKey(pathId), 'not-a-vibe')
  assert('invalid stored vibe falls back to bright', getSelectedGuidedVibe(pathId) === 'bright')
  setSelectedGuidedVibe(pathId, 'tender')
  assert('future vibe cannot be selected in active UI helper', getSelectedGuidedVibe(pathId) === 'bright')
  clearSelectedGuidedVibe(pathId)
  assert('clearing selected vibe returns to default', getSelectedGuidedVibe(pathId) === 'bright')
} finally {
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    configurable: true,
  })
}

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
}

function hasWebpAlpha(relativePath: string) {
  const buffer = readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)))
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    return false
  }

  const format = buffer.toString('ascii', 12, 16)
  if (format === 'VP8L') {
    return true
  }

  if (format === 'VP8X') {
    const flags = buffer[20] ?? 0
    const hasAlphaFlag = (flags & 0b00010000) !== 0
    return hasAlphaFlag && buffer.includes(Buffer.from('ALPH'))
  }

  return false
}
