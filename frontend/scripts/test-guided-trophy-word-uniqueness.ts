/**
 * Cross-path trophy-word uniqueness check for Guided Today A1P1–A1P5.
 *
 * Hard-fails on:
 *   - any A1P1 ↔ A1P2 same-vibe trophy collision (the acute issue fixed
 *     in the A1P2 trophy-word source revision)
 *   - any within-path repeat that is not in the ALLOWLIST
 *
 * Reports all cross-path repeats as informational so future passes can
 * decide whether they qualify as legitimate core-A1 vocabulary.
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
]

const VIBES: Vibe[] = ['bright', 'wistful', 'sharp']

// Product-owner-approved repeats. Each entry must list every cell where
// the word appears; the test only honors the entry if the actual cell
// set matches.
const ALLOWLIST: AllowlistEntry[] = [
  {
    word: 'ready',
    cells: [
      { pathId: 'english-a1-practical-1', lessonNumber: 6, vibe: 'bright' },
      { pathId: 'english-a1-practical-1', lessonNumber: 4, vibe: 'sharp' },
    ],
    reason: 'A1P1 internal cross-vibe repeat: bright "ready for the train" (L6) and sharp "ready to order" (L4). Different lesson contexts; documented in GUIDED_TROPHY_WORD_SOURCE_DUPLICATION_INVESTIGATION_2026_05_15.md.',
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

// Collect every (path, lesson, vibe) → trophy word
const allCells: Cell[] = []
for (const lesson of GUIDED_LESSONS) {
  if (!ACTIVE_PATHS.includes(lesson.pathId)) continue
  for (const vibe of VIBES) {
    const variant = lesson.vibeVariants[vibe]
    if (!variant) continue
    allCells.push({
      pathId: lesson.pathId,
      lessonNumber: lesson.lessonNumber,
      vibe,
      word: variant.trophyWord.word.toLowerCase(),
    })
  }
}

console.log(`\n[trophy-word uniqueness] scanned ${allCells.length} cells across ${ACTIVE_PATHS.length} active paths`)

// ---- Within-path checks ----
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

// ---- A1P1 ↔ A1P2 same-vibe hard check ----
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
