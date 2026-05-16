/**
 * Cross-path trophy-word uniqueness check for Guided Today A1P1–A1P10.
 *
 * Trophy words are intended to feel collectible, special, and meaningfully
 * varied across the 300 active cells. Post-global-dedup pass policy:
 *
 * Hard-fails on:
 *   - missing or empty trophy fields (word, meaning, example, whyThisWord)
 *   - same-lesson cross-vibe trophy collisions
 *   - any within-path repeat across the 30 cells of a path that is not in
 *     the within-path ALLOWLIST (exact-cell based)
 *   - any trophy word appearing more than 3 times globally unless exact-cell
 *     allowlisted in CROSS_PATH_ALLOWLIST
 *   - any A1P1 ↔ A1P2 same-vibe trophy collision (historical guard from
 *     the A1P2 trophy-word source revision incident)
 *
 * Warn-reports (not hard-fail):
 *   - any trophy word appearing more than once globally — surfaces remaining
 *     2-3 cell repeats so future content passes can decide to diversify or
 *     not.
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

// Hard-fail threshold for global multiplicity: more than this many cells of
// the same trophy word fails the build unless allowlisted.
const GLOBAL_HARD_FAIL_THRESHOLD = 3

// Within-path allowlist. Each entry must list every cell where the word
// appears in the path; the test only honors the entry if the actual cell
// set matches exactly. After the A1P1-P10 global dedup pass, all earlier
// within-path duplicates were patched and no entries remain. Leaving this
// list empty (rather than removing the mechanism) preserves the structure
// for future product-approved exact-cell exceptions.
const WITHIN_PATH_ALLOWLIST: AllowlistEntry[] = []

// Cross-path / global allowlist. Each entry must list every cell where
// the word appears; the test only honors the entry if the actual cell
// set matches exactly. This is the escape hatch for product-approved
// global multiplicity above the hard-fail threshold. Empty by default
// after the global dedup pass.
const CROSS_PATH_ALLOWLIST: AllowlistEntry[] = []

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

// ---- Same-lesson cross-vibe hard-fail ----
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
let withinPathFound = 0
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
    withinPathFound += 1
    const allow = WITHIN_PATH_ALLOWLIST.find((entry) => entry.word === word && sameCellSet(cells, entry.cells))
    if (allow) {
      passes += 1
      console.log(`  ok  ${pathId} allowed internal repeat "${word}" — ${allow.reason}`)
    } else {
      failures += 1
      console.error(`  FAIL ${pathId} unallowed internal repeat "${word}" at ${cells.map(cellKey).join(', ')}`)
    }
  }
}
if (withinPathFound === 0) {
  console.log('  (all paths internally distinct)')
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

// ---- Global multiplicity hard-fail + warn ----
console.log(`\n[global multiplicity — hard-fail at > ${GLOBAL_HARD_FAIL_THRESHOLD}, warn at > 1]`)
const wordGroups = new Map<string, Cell[]>()
for (const cell of allCells) {
  const existing = wordGroups.get(cell.word) ?? []
  existing.push(cell)
  wordGroups.set(cell.word, existing)
}

const repeats = Array.from(wordGroups.entries())
  .filter(([, cells]) => cells.length > 1)
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))

let warnedRepeats = 0
let hardFailedRepeats = 0

if (repeats.length === 0) {
  assert('every trophy word is globally unique', true)
} else {
  for (const [word, cells] of repeats) {
    const allow = CROSS_PATH_ALLOWLIST.find((entry) => entry.word === word && sameCellSet(cells, entry.cells))
    if (cells.length > GLOBAL_HARD_FAIL_THRESHOLD) {
      if (allow) {
        passes += 1
        console.log(`  ok  allowed global repeat "${word}" (${cells.length} cells) — ${allow.reason}`)
      } else {
        failures += 1
        hardFailedRepeats += 1
        console.error(`  FAIL "${word}" appears ${cells.length} times (> ${GLOBAL_HARD_FAIL_THRESHOLD}): ${cells.map(cellKey).join(', ')}`)
      }
    } else {
      warnedRepeats += 1
      const marker = allow ? '[allowed]' : '[warn]'
      console.log(`  ${marker} "${word}" — ${cells.map(cellKey).join(', ')}`)
    }
  }
}

console.log(`\n  summary: ${repeats.length} global repeat labels total (${warnedRepeats} warn-only, ${hardFailedRepeats} hard-failed)`)

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)
