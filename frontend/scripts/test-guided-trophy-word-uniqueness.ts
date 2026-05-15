/**
 * Cross-path trophy-word uniqueness check for Guided Today A1P1–A1P10.
 *
 * Hard-fails on:
 *   - missing or empty trophy fields (word, meaning, example, whyThisWord)
 *   - same-lesson cross-vibe trophy collisions
 *   - any within-path repeat across the 30 cells of a path that is not in
 *     the within-path ALLOWLIST (exact-cell based)
 *   - any A1P1 ↔ A1P2 same-vibe trophy collision (historical guard from
 *     the A1P2 trophy-word source revision incident)
 *
 * Reports all cross-path repeats as informational so a future pass can
 * decide whether they qualify as legitimate core-A1 vocabulary or need
 * targeted patching.
 *
 * Run: npx tsx scripts/test-guided-trophy-word-uniqueness.ts
 */

import { GUIDED_LESSONS } from '../src/data/guidedLessons.ts'
import type { ActiveGuidedVibeId } from '../src/data/guidedVibes.ts'

type Vibe = ActiveGuidedVibeId
type Cell = { pathId: string; lessonNumber: number; vibe: Vibe; word: string }
type AllowlistEntry = {
  word: string
  cells: Array<{ pathId: string; lessonNumber: number; vibe: Vibe }>
  reason: string
}

const ACTIVE_PATHS = [
  'english-a1-practical-1',
  'english-a1-practical-2',
  'english-a1-practical-3',
  'english-a1-practical-4',
  'english-a1-practical-5',
  'english-a1-practical-6',
  'english-a1-practical-7',
  'english-a1-practical-8',
  'english-a1-practical-9',
  'english-a1-practical-10',
]

const VIBES: Vibe[] = ['bright', 'wistful', 'sharp']

// Product-owner-approved within-path repeats. Each entry must list every
// cell where the word appears; the test only honors the entry if the
// actual cell set matches exactly.
//
// Most P6/P7/P8 entries below reflect themed-path vocabulary clusters
// (P6 Health, P7 Travel, P8 Hotel). Each repeat is cell-specific and
// motivated by the lesson titles named in the reason. Future passes can
// patch any individual cell; the script will then fail until the
// allowlist entry is updated or removed.
const ALLOWLIST: AllowlistEntry[] = [
  {
    word: 'ready',
    cells: [
      { pathId: 'english-a1-practical-1', lessonNumber: 6, vibe: 'bright' },
      { pathId: 'english-a1-practical-1', lessonNumber: 4, vibe: 'sharp' },
    ],
    reason: 'A1P1 internal cross-vibe repeat: bright "ready for the train" (L6) and sharp "ready to order" (L4). Different lesson contexts; documented in GUIDED_TROPHY_WORD_SOURCE_DUPLICATION_INVESTIGATION_2026_05_15.md.',
  },

  // ---- A1P6 (Health, Pharmacy, Small Needs) themed cluster ----
  {
    word: 'safe',
    cells: [
      { pathId: 'english-a1-practical-6', lessonNumber: 1, vibe: 'bright' },
      { pathId: 'english-a1-practical-6', lessonNumber: 8, vibe: 'wistful' },
    ],
    reason: 'P6 safety anchor: L1 bright "i-dont-feel-well" frames recovery as feeling safe; L8 wistful "i-have-an-allergy" frames disclosure as keeping the body safe. Documented in GUIDED_TODAY_A1P1_P10_TROPHY_WORD_AUDIT_AND_MICRO_PATCH_2026_05_15.md.',
  },
  {
    word: 'careful',
    cells: [
      { pathId: 'english-a1-practical-6', lessonNumber: 1, vibe: 'wistful' },
      { pathId: 'english-a1-practical-6', lessonNumber: 3, vibe: 'sharp' },
    ],
    reason: 'P6 caution anchor: L1 wistful "i-dont-feel-well" = cautious self-report; L3 sharp "i-need-medicine" = careful medicine request. Distinct lesson contexts within a small health-vocab path.',
  },
  {
    word: 'clear',
    cells: [
      { pathId: 'english-a1-practical-6', lessonNumber: 1, vibe: 'sharp' },
      { pathId: 'english-a1-practical-6', lessonNumber: 8, vibe: 'bright' },
    ],
    reason: 'P6 clarity anchor: L1 sharp "i-dont-feel-well" = clear symptom statement; L8 bright "i-have-an-allergy" = clear disclosure. Both stress unambiguous communication in a medical context.',
  },
  {
    word: 'nearby',
    cells: [
      { pathId: 'english-a1-practical-6', lessonNumber: 2, vibe: 'wistful' },
      { pathId: 'english-a1-practical-6', lessonNumber: 7, vibe: 'bright' },
    ],
    reason: 'P6 locate-resource anchor: L2 wistful "a-pharmacy-nearby" and L7 bright "is-there-a-doctor" both explicitly use "nearby" to locate health resources; lesson titles directly motivate the repeat.',
  },
  {
    word: 'here',
    cells: [
      { pathId: 'english-a1-practical-6', lessonNumber: 2, vibe: 'sharp' },
      { pathId: 'english-a1-practical-6', lessonNumber: 4, vibe: 'bright' },
    ],
    reason: 'P6 spatial/body-location split: L2 sharp "a-pharmacy-nearby" = spatial "close by here"; L4 bright "it-hurts-here" = body-location "here". Two distinct semantic senses of the same English word.',
  },
  {
    word: 'rest',
    cells: [
      { pathId: 'english-a1-practical-6', lessonNumber: 5, vibe: 'wistful' },
      { pathId: 'english-a1-practical-6', lessonNumber: 6, vibe: 'sharp' },
    ],
    reason: 'P6 recovery anchor: L5 wistful "i-have-a-headache" = rest as cure; L6 sharp "i-need-water" = rest as part of the small-needs ask. Core A1 health-recovery vocabulary.',
  },
  {
    word: 'urgent',
    cells: [
      { pathId: 'english-a1-practical-6', lessonNumber: 5, vibe: 'sharp' },
      { pathId: 'english-a1-practical-6', lessonNumber: 9, vibe: 'wistful' },
    ],
    reason: 'P6 urgency anchor: L5 sharp "i-have-a-headache" and L9 wistful "can-you-call-for-help" both frame medical urgency. Themed within the health/pharmacy path.',
  },
  {
    word: 'calm',
    cells: [
      { pathId: 'english-a1-practical-6', lessonNumber: 7, vibe: 'wistful' },
      { pathId: 'english-a1-practical-6', lessonNumber: 9, vibe: 'bright' },
    ],
    reason: 'P6 regulating anchor: L7 wistful "is-there-a-doctor" "Stay calm." and L9 bright "can-you-call-for-help" "Stay calm and ask." Originally a 3-way that included L10 sharp; L10 sharp was patched to "now" in this audit pass.',
  },

  // ---- A1P7 (Travel, Tickets, Simple Movement) themed cluster ----
  {
    word: 'time',
    cells: [
      { pathId: 'english-a1-practical-7', lessonNumber: 3, vibe: 'wistful' },
      { pathId: 'english-a1-practical-7', lessonNumber: 9, vibe: 'sharp' },
    ],
    reason: 'P7 travel-duration anchor: L3 wistful "what-time-does-it-leave" = departure time; L9 sharp "how-long-does-it-take" = duration time. Two distinct senses of "time" in travel.',
  },
  {
    word: 'clear',
    cells: [
      { pathId: 'english-a1-practical-7', lessonNumber: 3, vibe: 'sharp' },
      { pathId: 'english-a1-practical-7', lessonNumber: 9, vibe: 'wistful' },
    ],
    reason: 'P7 clarity-of-timing anchor: L3 sharp "Clear time, please." and L9 wistful "A clear time helps." Both lessons frame travel clarity.',
  },
  {
    word: 'careful',
    cells: [
      { pathId: 'english-a1-practical-7', lessonNumber: 4, vibe: 'sharp' },
      { pathId: 'english-a1-practical-7', lessonNumber: 5, vibe: 'wistful' },
    ],
    reason: 'P7 travel-safety anchor: L4 sharp "is-this-the-right-train" = careful boarding; L5 wistful "i-need-a-taxi" = careful taxi request. Core A1 travel-caution vocabulary.',
  },
  {
    word: 'please',
    cells: [
      { pathId: 'english-a1-practical-7', lessonNumber: 5, vibe: 'sharp' },
      { pathId: 'english-a1-practical-7', lessonNumber: 6, vibe: 'wistful' },
    ],
    reason: 'P7 polite-request anchor: L5 sharp "Please call a taxi." and L6 wistful "Please go slowly." Both are core A1 politeness uses. L6 wistful trophy example was refreshed in this audit pass after the L6 targetText polish.',
  },
  {
    word: 'there',
    cells: [
      { pathId: 'english-a1-practical-7', lessonNumber: 6, vibe: 'bright' },
      { pathId: 'english-a1-practical-7', lessonNumber: 8, vibe: 'sharp' },
    ],
    reason: 'P7 destination anchor: L6 bright "can-we-go-there" and L8 sharp "i-am-going-to-the-station" "Take me there." Lesson titles directly motivate the repeat.',
  },
  {
    word: 'take',
    cells: [
      { pathId: 'english-a1-practical-7', lessonNumber: 6, vibe: 'sharp' },
      { pathId: 'english-a1-practical-7', lessonNumber: 9, vibe: 'bright' },
    ],
    reason: 'P7 two-senses-of-take split: L6 sharp = bringen (to bring me there); L9 bright = dauern (how long it takes). Same English form, two different German meanings inside the same path.',
  },

  // ---- A1P8 (Hotel, Room, Staying Somewhere) themed cluster ----
  {
    word: 'ready',
    cells: [
      { pathId: 'english-a1-practical-8', lessonNumber: 1, vibe: 'sharp' },
      { pathId: 'english-a1-practical-8', lessonNumber: 8, vibe: 'wistful' },
    ],
    reason: 'P8 day-arc readiness: L1 sharp "i-have-a-reservation" = ready to check in; L8 wistful "i-want-to-sleep" = ready to sleep. Bookends of a hotel-day arc.',
  },
  {
    word: 'night',
    cells: [
      { pathId: 'english-a1-practical-8', lessonNumber: 2, vibe: 'wistful' },
      { pathId: 'english-a1-practical-8', lessonNumber: 8, vibe: 'sharp' },
    ],
    reason: 'P8 night/sleep anchor: L2 wistful "i-need-a-room" "A quiet night helps." and L8 sharp "i-want-to-sleep" "I need sleep tonight." Both lessons anchor on night.',
  },
  {
    word: 'hotel',
    cells: [
      { pathId: 'english-a1-practical-8', lessonNumber: 2, vibe: 'sharp' },
      { pathId: 'english-a1-practical-8', lessonNumber: 3, vibe: 'bright' },
    ],
    reason: 'P8 path locator: P8 is the hotel path; L2 sharp "i-need-a-room" and L3 bright "where-is-my-room" both use "hotel" as the verbalized locator.',
  },
  {
    word: 'clear',
    cells: [
      { pathId: 'english-a1-practical-8', lessonNumber: 4, vibe: 'sharp' },
      { pathId: 'english-a1-practical-8', lessonNumber: 5, vibe: 'wistful' },
    ],
    reason: 'P8 clarity anchor: L4 sharp "i-need-the-key" "The key, please." and L5 wistful "is-there-wi-fi" "Clear Wi-Fi helps." Both lessons frame clarity-of-ask at the front desk.',
  },

  // ---- A1P10 (Daily Wrap-Up, Small Talk, Leaving Well) ----
  {
    word: 'ready',
    cells: [
      { pathId: 'english-a1-practical-10', lessonNumber: 1, vibe: 'sharp' },
      { pathId: 'english-a1-practical-10', lessonNumber: 6, vibe: 'wistful' },
    ],
    reason: 'P10 wrap-up readiness: L1 sharp "today-was-good" = ready to finish the day; L6 wistful "i-need-to-go" = ready to go. Bookends of the wrap-up arc.',
  },
]

function cellKey(c: { pathId: string; lessonNumber: number; vibe: Vibe }) {
  return `${c.pathId}|L${c.lessonNumber}|${c.vibe}`
}

function sameCellSet(a: Cell[], b: AllowlistEntry['cells']) {
  if (a.length !== b.length) return false
  const aKeys = a.map(cellKey).sort()
  const bKeys = b.map(cellKey).sort()
  return aKeys.every((key, i) => key === bKeys[i])
}

let passes = 0
let failures = 0

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

// ---- Field presence / non-empty hard-fail ----
console.log('\n[trophy field presence — A1P1-A1P10]')
const allCells: Cell[] = []
for (const lesson of GUIDED_LESSONS) {
  if (!ACTIVE_PATHS.includes(lesson.pathId)) continue
  for (const vibe of VIBES) {
    const variant = lesson.vibeVariants[vibe]
    if (!variant) {
      failures += 1
      console.error(`  FAIL missing variant ${lesson.pathId}|L${lesson.lessonNumber}|${vibe}`)
      continue
    }
    const t = variant.trophyWord
    if (!t) {
      failures += 1
      console.error(`  FAIL missing trophyWord at ${lesson.pathId}|L${lesson.lessonNumber}|${vibe}`)
      continue
    }
    const fields: Array<keyof typeof t> = ['word', 'meaning', 'example', 'whyThisWord']
    let cellOk = true
    for (const field of fields) {
      if (typeof t[field] !== 'string' || t[field].trim().length === 0) {
        failures += 1
        console.error(`  FAIL empty trophy.${String(field)} at ${lesson.pathId}|L${lesson.lessonNumber}|${vibe}`)
        cellOk = false
      }
    }
    if (cellOk) {
      allCells.push({
        pathId: lesson.pathId,
        lessonNumber: lesson.lessonNumber,
        vibe,
        word: variant.trophyWord.word.toLowerCase(),
      })
    }
  }
}

const expectedCells = ACTIVE_PATHS.length * 10 * VIBES.length
assert(
  `expected ${expectedCells} active trophy cells; observed ${allCells.length}`,
  allCells.length === expectedCells,
  { observed: allCells.length, expected: expectedCells },
)

console.log(`\n[trophy-word uniqueness] scanned ${allCells.length} cells across ${ACTIVE_PATHS.length} active paths`)

// ---- Same-lesson cross-vibe hard-fail (defense in depth) ----
console.log('\n[same-lesson cross-vibe uniqueness]')
const lessonGroups = new Map<string, Cell[]>()
for (const cell of allCells) {
  const key = `${cell.pathId}|L${cell.lessonNumber}`
  const existing = lessonGroups.get(key) ?? []
  existing.push(cell)
  lessonGroups.set(key, existing)
}
let sameLessonCollisionFound = false
for (const [lessonKey, cells] of lessonGroups) {
  const wordToVibes = new Map<string, Vibe[]>()
  for (const cell of cells) {
    const list = wordToVibes.get(cell.word) ?? []
    list.push(cell.vibe)
    wordToVibes.set(cell.word, list)
  }
  for (const [word, vibes] of wordToVibes) {
    if (vibes.length > 1) {
      failures += 1
      sameLessonCollisionFound = true
      console.error(`  FAIL same-lesson collision "${word}" at ${lessonKey} across vibes ${vibes.join(', ')}`)
    }
  }
}
if (!sameLessonCollisionFound) {
  assert('all lessons have pairwise-distinct trophy words across vibes', true)
}

// ---- Within-path hard-fail ----
console.log('\n[within-path uniqueness]')
for (const pathId of ACTIVE_PATHS) {
  const cellsInPath = allCells.filter((c) => c.pathId === pathId)
  const wordToCells = new Map<string, Cell[]>()
  for (const cell of cellsInPath) {
    const existing = wordToCells.get(cell.word) ?? []
    existing.push(cell)
    wordToCells.set(cell.word, existing)
  }

  const repeats = Array.from(wordToCells.entries()).filter(([, cells]) => cells.length > 1)
  if (repeats.length === 0) {
    assert(`${pathId} has ${cellsInPath.length} internally distinct trophy words`, true)
    continue
  }

  for (const [word, cells] of repeats) {
    const allow = ALLOWLIST.find((entry) => entry.word === word && sameCellSet(cells, entry.cells))
    if (allow) {
      passes += 1
      console.log(`  ok  ${pathId} allowed internal repeat "${word}" — ${allow.reason}`)
    } else {
      failures += 1
      console.error(`  FAIL ${pathId} unallowed internal repeat "${word}" at ${cells.map(cellKey).join(', ')}`)
    }
  }
}

// ---- A1P1 ↔ A1P2 same-vibe hard check (historical guard) ----
console.log('\n[A1P1 ↔ A1P2 same-vibe trophy uniqueness]')
const p1 = allCells.filter((c) => c.pathId === 'english-a1-practical-1')
const p2 = allCells.filter((c) => c.pathId === 'english-a1-practical-2')
const collisions: Array<{ word: string; p1Cell: Cell; p2Cell: Cell }> = []
for (const p2Cell of p2) {
  const p1Match = p1.find((p1Cell) => p1Cell.vibe === p2Cell.vibe && p1Cell.word === p2Cell.word)
  if (p1Match) {
    collisions.push({ word: p2Cell.word, p1Cell: p1Match, p2Cell })
  }
}

if (collisions.length === 0) {
  assert('no A1P1 ↔ A1P2 same-vibe trophy duplicates', true)
} else {
  for (const c of collisions) {
    failures += 1
    console.error(
      `  FAIL A1P1 ↔ A1P2 same-vibe collision: "${c.word}" `
      + `at ${cellKey(c.p1Cell)} and ${cellKey(c.p2Cell)}`,
    )
  }
}

// ---- Cross-path repeats (informational) ----
console.log('\n[cross-path repeats — informational]')
const wordGroups = new Map<string, Cell[]>()
for (const cell of allCells) {
  const existing = wordGroups.get(cell.word) ?? []
  existing.push(cell)
  wordGroups.set(cell.word, existing)
}

const crossPathRepeats = Array.from(wordGroups.entries())
  .filter(([, cells]) => new Set(cells.map((c) => c.pathId)).size > 1)
  .sort((a, b) => a[0].localeCompare(b[0]))

if (crossPathRepeats.length === 0) {
  console.log('  (none)')
} else {
  console.log(`  ${crossPathRepeats.length} trophy words appear in more than one path:`)
  for (const [word, cells] of crossPathRepeats) {
    const allow = ALLOWLIST.find((entry) => entry.word === word)
    const marker = allow ? '[allowed]' : '[info]'
    console.log(`  ${marker} "${word}" — ${cells.map(cellKey).join(', ')}`)
  }
}

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)
