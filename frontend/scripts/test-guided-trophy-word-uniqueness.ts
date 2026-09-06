/**
 * Cross-path trophy-word uniqueness check for Guided Today A1P1–A1P10.
 *
 * Trophy words are intended to feel collectible, special, and meaningfully
 * varied across the authored cells. Post-global-dedup pass policy:
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

import {
  getGuidedTodayPathOptions,
  resolveGuidedBaseContent,
  type GuidedTargetLanguage,
} from '../src/data/guidedLessons.ts'
import { GUIDED_LESSONS } from '../src/data/guidedLessonsAuthoring.ts'
import { isActiveGuidedVibeId, type ActiveGuidedVibeId } from '../src/data/guidedVibes.ts'

type Vibe = ActiveGuidedVibeId
type Cell = { pathId: string; lessonNumber: number; vibe: Vibe; word: string; targetLanguage: GuidedTargetLanguage }
type AllowlistEntry = {
  word: string
  cells: Array<{ pathId: string; lessonNumber: number; vibe: Vibe }>
  reason: string
}

const ACTIVE_PATH_OPTIONS = getGuidedTodayPathOptions()
const ACTIVE_PATHS = ACTIVE_PATH_OPTIONS.map((path) => path.id)
const TARGET_LANGUAGE_BY_PATH = new Map<string, GuidedTargetLanguage>(
  ACTIVE_PATH_OPTIONS.map((path) => [path.id, path.targetLanguage]),
)

// Hard-fail threshold for global multiplicity: more than this many cells of
// the same trophy word fails the build unless allowlisted.
const GLOBAL_HARD_FAIL_THRESHOLD = 3

// Within-path allowlist. Each entry must list every cell where the word
// appears in the path; the test only honors the entry if the actual cell
// set matches exactly. September 7 restored the full authored inventory
// after the runtime split left this check empty. These five existing repeats
// are retained deliberately; new or changed repetitions still fail.
const RETAINED_CURRICULUM_REASON = 'retained existing recorded curriculum; reuse is not a wrong-language answer; needs editorial replacement+recording review'

const WITHIN_PATH_ALLOWLIST: AllowlistEntry[] = [
  {
    word: 'again',
    cells: [
      { pathId: 'english-a1-practical-1', lessonNumber: 2, vibe: 'bright' },
      { pathId: 'english-a1-practical-1', lessonNumber: 9, vibe: 'wistful' },
    ],
    reason: RETAINED_CURRICULUM_REASON,
  },
  {
    word: 'walk',
    cells: [
      { pathId: 'english-a1-practical-3', lessonNumber: 2, vibe: 'wistful' },
      { pathId: 'english-a1-practical-3', lessonNumber: 9, vibe: 'bright' },
    ],
    reason: RETAINED_CURRICULUM_REASON,
  },
  {
    word: 'habitación',
    cells: [
      { pathId: 'spanish-a1-practical-8', lessonNumber: 1, vibe: 'bright' },
      { pathId: 'spanish-a1-practical-8', lessonNumber: 10, vibe: 'bright' },
    ],
    reason: RETAINED_CURRICULUM_REASON,
  },
  {
    word: 'fermata',
    cells: [
      { pathId: 'italian-a1-practical-3', lessonNumber: 5, vibe: 'bright' },
      { pathId: 'italian-a1-practical-3', lessonNumber: 10, vibe: 'bright' },
    ],
    reason: RETAINED_CURRICULUM_REASON,
  },
  {
    word: 'café',
    cells: [
      { pathId: 'portuguese-a1-practical-1', lessonNumber: 4, vibe: 'bright' },
      { pathId: 'portuguese-a1-practical-1', lessonNumber: 8, vibe: 'bright' },
    ],
    reason: RETAINED_CURRICULUM_REASON,
  },
]

// Cross-path / global allowlist. Each entry must list every cell where
// the word appears; the test only honors the entry if the actual cell
// set matches exactly. This is the escape hatch for product-approved
// global multiplicity above the hard-fail threshold. One recorded repeat
// restored by the September 7 inventory repair is retained explicitly.
const CROSS_PATH_ALLOWLIST: AllowlistEntry[] = [
  {
    word: 'again',
    cells: [
      { pathId: 'english-a1-practical-1', lessonNumber: 2, vibe: 'bright' },
      { pathId: 'english-a1-practical-1', lessonNumber: 9, vibe: 'wistful' },
      { pathId: 'english-a1-practical-5', lessonNumber: 2, vibe: 'bright' },
      { pathId: 'english-a1-practical-10', lessonNumber: 7, vibe: 'wistful' },
    ],
    reason: RETAINED_CURRICULUM_REASON,
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
console.log('\n[trophy field presence]')
const allCells: Cell[] = []
let expectedCells = 0
for (const lesson of GUIDED_LESSONS) {
  if (!ACTIVE_PATHS.includes(lesson.pathId)) continue
  const pathTargetLanguage = TARGET_LANGUAGE_BY_PATH.get(lesson.pathId)!
  const presentVibes = Object.keys(lesson.vibeVariants).filter(isActiveGuidedVibeId)
  expectedCells += presentVibes.length
  for (const vibe of presentVibes) {
    const variant = lesson.vibeVariants[vibe]!
    const t = variant.trophyWord
    if (!t) {
      failures += 1
      console.error(`  FAIL missing trophyWord at ${lesson.pathId}|L${lesson.lessonNumber}|${vibe}`)
      continue
    }
    const targetFields: Array<keyof typeof t> = ['word', 'example']
    const baseFields: Array<keyof typeof t> = ['meaning', 'whyThisWord']
    let cellOk = true
    for (const field of targetFields) {
      if (typeof t[field] !== 'string' || t[field].trim().length === 0) {
        failures += 1
        console.error(`  FAIL empty trophy.${String(field)} at ${lesson.pathId}|L${lesson.lessonNumber}|${vibe}`)
        cellOk = false
      }
    }
    for (const field of baseFields) {
      const resolved = resolveGuidedBaseContent(t[field], { authoredBaseLanguage: lesson.baseLanguage }).text
      if (resolved.trim().length === 0) {
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
        targetLanguage: pathTargetLanguage,
      })
    }
  }
}

assert('authored guided lesson inventory is non-empty', GUIDED_LESSONS.length > 0, GUIDED_LESSONS.length)
assert('active trophy inventory is non-empty', expectedCells > 0, expectedCells)
assert('active trophy inventory remains exactly 2,700 cells', expectedCells === 2700, expectedCells)

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

// ---- A1P1 ↔ A1P2 same-vibe hard check (historical guard, English-only) ----
console.log('\n[English A1P1 ↔ A1P2 same-vibe trophy uniqueness]')
const p1 = allCells.filter((c) => c.pathId === 'english-a1-practical-1' && c.targetLanguage === 'English')
const p2 = allCells.filter((c) => c.pathId === 'english-a1-practical-2' && c.targetLanguage === 'English')
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

// ---- Global multiplicity hard-fail + warn (per-language scope) ----
console.log(`\n[per-language global multiplicity — hard-fail at > ${GLOBAL_HARD_FAIL_THRESHOLD}, warn at > 1]`)
const wordGroups = new Map<string, Cell[]>()
for (const cell of allCells) {
  const key = `${cell.targetLanguage}::${cell.word}`
  const existing = wordGroups.get(key) ?? []
  existing.push(cell)
  wordGroups.set(key, existing)
}

const repeats = Array.from(wordGroups.entries())
  .filter(([, cells]) => cells.length > 1)
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))

let warnedRepeats = 0
let hardFailedRepeats = 0

if (repeats.length === 0) {
  assert('every trophy word is globally unique within its target language', true)
} else {
  for (const [key, cells] of repeats) {
    const [language, word] = key.split('::', 2) as [string, string]
    const allow = CROSS_PATH_ALLOWLIST.find((entry) => entry.word === word && sameCellSet(cells, entry.cells))
    if (cells.length > GLOBAL_HARD_FAIL_THRESHOLD) {
      if (allow) {
        passes += 1
        console.log(`  ok  allowed ${language} global repeat "${word}" (${cells.length} cells) — ${allow.reason}`)
      } else {
        failures += 1
        hardFailedRepeats += 1
        console.error(`  FAIL ${language} trophy "${word}" appears ${cells.length} times (> ${GLOBAL_HARD_FAIL_THRESHOLD}): ${cells.map(cellKey).join(', ')}`)
      }
    } else {
      warnedRepeats += 1
      const marker = allow ? '[allowed]' : '[warn]'
      console.log(`  ${marker} ${language} "${word}" — ${cells.map(cellKey).join(', ')}`)
    }
  }
}

console.log(`\n  summary: ${repeats.length} global repeat labels total (${warnedRepeats} warn-only, ${hardFailedRepeats} hard-failed)`)

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)
