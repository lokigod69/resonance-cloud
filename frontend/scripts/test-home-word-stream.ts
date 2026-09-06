// Unit tests for the Word Stream model (docs/Product/FABLE_WORD_STREAM_PLAN.md):
// pool building (exclusions, ordering, dedupe, daily seed), the per-learner
// store (day rollover, pass TTL, corrupt input), and the motion helpers.
// Run: npx tsx scripts/test-home-word-stream.ts

import assert from 'node:assert/strict'
import type { SelectedCategoryVocabularyItem } from '../src/data/categories'
import {
  STREAM_DESKTOP_LAYOUT,
  STREAM_MOBILE_LAYOUT,
  STREAM_Z_EXIT,
  STREAM_Z_SPAWN,
  buildStreamPool,
  emptyWordStreamStore,
  hashSeed,
  nextStreamLane,
  normalizeStreamLemma,
  passedConceptIdsOf,
  poolIndexAt,
  readWordStreamStore,
  seededUnit,
  streamDepthAt,
  streamOpacityAt,
  streamScaleAt,
  streamScreenXAt,
  streamSeed,
  streamSpawnIntervalMs,
  streamStillProgressSlots,
  wordStreamStoreKey,
  writeWordStreamStore,
  type StorageLike,
  type StreamCategorySource,
} from '../src/lib/wordStream'

let passed = 0
function test(name: string, fn: () => void) {
  fn()
  passed += 1
  console.log(`ok - ${name}`)
}

function item(partial: {
  conceptId: string
  level: number
  de: string
  en: string
  fallback?: boolean
}): SelectedCategoryVocabularyItem {
  const translations = {
    en: { term: partial.en },
    de: partial.fallback ? { term: partial.en, isFallback: true } : { term: partial.de },
    fr: { term: partial.en, isFallback: true },
    es: { term: partial.en, isFallback: true },
    pt: { term: partial.en, isFallback: true },
    it: { term: partial.en, isFallback: true },
    pl: { term: partial.en, isFallback: true },
    id: { term: partial.en, isFallback: true },
    ceb: { term: partial.en, isFallback: true },
    ko: { term: partial.en, isFallback: true },
    ru: { term: partial.en, isFallback: true },
    ja: { term: partial.en, isFallback: true },
  }
  return {
    conceptId: partial.conceptId,
    itemId: partial.conceptId,
    categoryId: partial.conceptId.split('.')[0],
    level: partial.level,
    order: 1,
    part_of_speech: 'noun',
    sense: 'x',
    targetLanguage: 'de',
    targetLanguageName: 'German',
    targetTerm: partial.fallback ? partial.en : partial.de,
    helperLanguage: 'en',
    helperLanguageName: 'English',
    helperTerm: partial.en,
    translations,
  }
}

const animals: StreamCategorySource = {
  slug: 'animals',
  labelKey: 'category.animals',
  emoji: '🐾',
  items: [
    item({ conceptId: 'animals.dog', level: 1, de: 'Hund', en: 'dog' }),
    item({ conceptId: 'animals.cat', level: 1, de: 'Katze', en: 'cat' }),
    item({ conceptId: 'animals.otter', level: 7, de: 'Otter', en: 'otter' }),
    item({ conceptId: 'animals.platypus', level: 10, de: 'platypus', en: 'platypus', fallback: true }),
  ],
}
const food: StreamCategorySource = {
  slug: 'food',
  labelKey: 'category.food',
  emoji: '🍽️',
  items: [
    item({ conceptId: 'food.bread', level: 1, de: 'Brot', en: 'bread' }),
    // Same target term as animals.otter — the pool dedupes by lemma.
    item({ conceptId: 'food.otter_dup', level: 2, de: ' otter ', en: 'otter (dup)' }),
    item({ conceptId: 'food.hotel', level: 3, de: 'Hotel', en: 'Hotel' }),
  ],
}

function memoryStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  }
}

// ── Seeds ──────────────────────────────────────────────────────────────────

test('hashSeed is stable and seededUnit lands in [0, 1)', () => {
  assert.equal(hashSeed('lingwave'), hashSeed('lingwave'))
  assert.notEqual(hashSeed('a'), hashSeed('b'))
  for (const key of ['x', 'y', 'animals.dog']) {
    const unit = seededUnit(42, key)
    assert.ok(unit >= 0 && unit < 1)
    assert.equal(unit, seededUnit(42, key))
  }
})

test('streamSeed differs by day and by learner', () => {
  const a = streamSeed('u1', 'de', '2026-09-03')
  assert.notEqual(a, streamSeed('u1', 'de', '2026-09-04'))
  assert.notEqual(a, streamSeed('u2', 'de', '2026-09-03'))
  assert.equal(a, streamSeed('u1', 'de', '2026-09-03'))
})

// ── Pool ───────────────────────────────────────────────────────────────────

test('buildStreamPool drops fallbacks, known lemmas, passed concepts, and dedupes by lemma', () => {
  const pool = buildStreamPool({
    sources: [animals, food],
    knownLemmaKeys: new Set(['katze']),
    passedConceptIds: new Set(['food.bread']),
    seed: 7,
  })
  const ids = pool.map((word) => word.conceptId)
  assert.ok(!ids.includes('animals.platypus'), 'fallback translation excluded')
  assert.ok(!ids.includes('animals.cat'), 'known lemma excluded')
  assert.ok(!ids.includes('food.bread'), 'passed concept excluded')
  const otters = pool.filter((word) => word.lemmaKey === 'otter')
  assert.equal(otters.length, 1, 'same target term across categories appears once')
  assert.equal(pool.find((word) => word.conceptId === 'animals.dog')?.lemmaKey, 'hund')
  assert.equal(pool.find((word) => word.conceptId === 'animals.dog')?.categoryLabelKey, 'category.animals')
})

test('buildStreamPool front-loads easy levels and is deterministic per seed', () => {
  const many: StreamCategorySource = {
    slug: 'm',
    labelKey: 'category.m',
    emoji: '·',
    items: Array.from({ length: 60 }, (_, i) =>
      item({ conceptId: `m.w${i}`, level: 1 + (i % 10), de: `wort${i}`, en: `word${i}` })),
  }
  const a = buildStreamPool({ sources: [many], knownLemmaKeys: new Set(), passedConceptIds: new Set(), seed: 1 })
  const b = buildStreamPool({ sources: [many], knownLemmaKeys: new Set(), passedConceptIds: new Set(), seed: 1 })
  const c = buildStreamPool({ sources: [many], knownLemmaKeys: new Set(), passedConceptIds: new Set(), seed: 2 })
  assert.deepEqual(a.map((w) => w.conceptId), b.map((w) => w.conceptId), 'same seed → same order')
  assert.notDeepEqual(a.map((w) => w.conceptId), c.map((w) => w.conceptId), 'new seed → new order')
  const firstTen = a.slice(0, 10).map((w) => w.level)
  assert.ok(Math.max(...firstTen) <= 4, `first ten are easy (levels ${firstTen.join(',')})`)
  const lastTen = a.slice(-10).map((w) => w.level)
  assert.ok(Math.min(...lastTen) >= 7, `last ten are hard (levels ${lastTen.join(',')})`)
})

test('a target term identical to its gloss ranks behind its level peers', () => {
  const pool = buildStreamPool({
    sources: [{
      slug: 's',
      labelKey: 'category.s',
      emoji: '·',
      items: [
        item({ conceptId: 's.hotel', level: 1, de: 'Hotel', en: 'Hotel' }),
        item({ conceptId: 's.haus', level: 1, de: 'Haus', en: 'house' }),
      ],
    }],
    knownLemmaKeys: new Set(),
    passedConceptIds: new Set(),
    seed: 3,
  })
  assert.equal(pool[0]?.conceptId, 's.haus')
})

test('normalizeStreamLemma matches the SRS lemma key', () => {
  assert.equal(normalizeStreamLemma('  Straße '), 'straße')
  assert.equal(normalizeStreamLemma('école'), 'école'.normalize('NFC'))
})

test('poolIndexAt wraps as a ring', () => {
  assert.equal(poolIndexAt(0, 3), 0)
  assert.equal(poolIndexAt(3, 3), 0)
  assert.equal(poolIndexAt(7, 3), 1)
  assert.equal(poolIndexAt(0, 0), 0)
})

// ── Store ──────────────────────────────────────────────────────────────────

test('store: empty when missing or corrupt', () => {
  const storage = memoryStorage()
  const key = wordStreamStoreKey('u1', 'de')
  assert.deepEqual(readWordStreamStore(storage, key, '2026-09-03', 0), emptyWordStreamStore('2026-09-03'))
  storage.setItem(key, '{not json')
  assert.deepEqual(readWordStreamStore(storage, key, '2026-09-03', 0), emptyWordStreamStore('2026-09-03'))
  storage.setItem(key, JSON.stringify({ schemaVersion: 99, day: '2026-09-03', cursor: 5, passed: {} }))
  assert.equal(readWordStreamStore(storage, key, '2026-09-03', 0).cursor, 0, 'unknown schema resets')
  assert.deepEqual(readWordStreamStore(null, key, '2026-09-03', 0), emptyWordStreamStore('2026-09-03'))
})

test('store: cursor survives a reload within the day and resets on a new day', () => {
  const storage = memoryStorage()
  const key = wordStreamStoreKey('u1', 'de')
  const store = emptyWordStreamStore('2026-09-03')
  store.cursor = 12
  writeWordStreamStore(storage, key, store)
  assert.equal(readWordStreamStore(storage, key, '2026-09-03', 0).cursor, 12)
  assert.equal(readWordStreamStore(storage, key, '2026-09-04', 0).cursor, 0)
})

test('store: passes expire after the TTL, survive within it', () => {
  const storage = memoryStorage()
  const key = wordStreamStoreKey('u1', 'de')
  const now = Date.parse('2026-09-03T12:00:00.000Z')
  const store = emptyWordStreamStore('2026-09-03')
  store.passed['animals.dog'] = new Date(now - 13 * 86_400_000).toISOString()
  store.passed['animals.cat'] = new Date(now - 15 * 86_400_000).toISOString()
  writeWordStreamStore(storage, key, store)
  const read = readWordStreamStore(storage, key, '2026-09-04', now)
  assert.deepEqual([...passedConceptIdsOf(read)], ['animals.dog'])
})

test('store: write never throws on a broken storage', () => {
  const broken: StorageLike = {
    getItem: () => { throw new Error('nope') },
    setItem: () => { throw new Error('nope') },
    removeItem: () => { throw new Error('nope') },
  }
  writeWordStreamStore(broken, 'k', emptyWordStreamStore('2026-09-03'))
  assert.deepEqual(readWordStreamStore(broken, 'k', '2026-09-03', 0), emptyWordStreamStore('2026-09-03'))
})

// ── Motion ─────────────────────────────────────────────────────────────────

test('depth runs from spawn to exit, monotonic and screen-linear', () => {
  assert.equal(streamDepthAt(0), STREAM_Z_SPAWN)
  assert.ok(Math.abs(streamDepthAt(1) - STREAM_Z_EXIT) < 1e-9)
  let previous = streamDepthAt(0)
  for (let p = 0.05; p <= 1; p += 0.05) {
    const z = streamDepthAt(p)
    assert.ok(z < previous, 'z decreases with progress')
    previous = z
  }
  // 1/z is linear in progress: equal steps in p give equal steps in 1/z.
  const step1 = 1 / streamDepthAt(0.3) - 1 / streamDepthAt(0.2)
  const step2 = 1 / streamDepthAt(0.8) - 1 / streamDepthAt(0.7)
  assert.ok(Math.abs(step1 - step2) < 1e-9)
  assert.equal(streamDepthAt(-1), STREAM_Z_SPAWN)
  assert.ok(Math.abs(streamDepthAt(2) - STREAM_Z_EXIT) < 1e-9)
})

test('scale and opacity envelopes', () => {
  assert.equal(streamScaleAt(0), 0.87)
  assert.ok(Math.abs(streamScaleAt(1) - 1.23) < 1e-9)
  // 15 px base × floor ≥ the buoys' 13 px far band.
  assert.ok(15 * streamScaleAt(0) >= 13)
  assert.equal(streamOpacityAt(0), 0)
  assert.equal(streamOpacityAt(0.05), 0.5)
  assert.equal(streamOpacityAt(0.5), 1)
  assert.ok(streamOpacityAt(0.96) > 0 && streamOpacityAt(0.96) < 1)
  assert.equal(streamOpacityAt(1), 0)
})

test('desktop spread uses the viewport at every depth without changing phone lanes', () => {
  for (const width of [1024, 1440, 2560]) {
    for (const p of [0, 0.5, 1]) {
      const left = streamScreenXAt(STREAM_DESKTOP_LAYOUT, 0, p, width, 765)
      const right = streamScreenXAt(STREAM_DESKTOP_LAYOUT, 4, p, width, 765)
      assert.ok(left >= width * 0.09 && left <= width * 0.22)
      assert.ok(right >= width * 0.78 && right <= width * 0.91)
      assert.equal(left + right, width)
    }
  }
  for (const width of [320, 390, 768]) {
    const focal = 568 * 0.85
    for (const p of [0, 0.5, 1]) {
      assert.equal(streamScreenXAt(STREAM_MOBILE_LAYOUT, 0, p, width, focal), width / 2 - 1.15 * focal / streamDepthAt(p))
    }
  }
})

test('spawn cadence keeps consecutive words a quarter of the run apart', () => {
  assert.equal(streamSpawnIntervalMs(STREAM_MOBILE_LAYOUT), 6000)
  assert.equal(streamSpawnIntervalMs(STREAM_DESKTOP_LAYOUT), 3750)
  const gap = streamSpawnIntervalMs(STREAM_MOBILE_LAYOUT) / STREAM_MOBILE_LAYOUT.lifetimeMs
  assert.equal(gap, 1 / STREAM_MOBILE_LAYOUT.maxAlive)
})

test('lanes rotate round-robin with an occasional skip, never repeating', () => {
  assert.equal(nextStreamLane(0, 3, 0.1), 1)
  assert.equal(nextStreamLane(0, 3, 0.9), 2)
  assert.equal(nextStreamLane(2, 3, 0.1), 0)
  assert.equal(nextStreamLane(0, 1, 0.9), 0)
  for (let i = 0; i < 20; i++) {
    const lane = nextStreamLane(i % 5, 5, seededUnit(9, `${i}`))
    assert.notEqual(lane, i % 5)
  }
})

test('still slots spread nearest-first within the run', () => {
  assert.deepEqual(streamStillProgressSlots(0), [])
  assert.deepEqual(streamStillProgressSlots(1), [0.6])
  const four = streamStillProgressSlots(4)
  assert.equal(four.length, 4)
  for (let i = 1; i < four.length; i++) assert.ok(four[i] < four[i - 1])
  assert.ok(four[0] <= 0.9 && four[3] >= 0.15)
})

console.log(`\n${passed} passed`)
