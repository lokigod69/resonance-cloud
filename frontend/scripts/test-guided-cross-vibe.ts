/**
 * Cross-Vibe Distinctness Test for Guided Today A1P1-A1P10.
 *
 * Enforces that within a single lesson, the three vibe variants (bright,
 * wistful, sharp) diverge by more than a leading or trailing hedge alone.
 * Computes hedge-strip Levenshtein similarity on two surfaces (targetText
 * and reassembled typeRecall), takes the max per pair, and applies a
 * two-tier threshold: hard fail at >=0.85 (blocks CI), warn at [0.70, 0.85).
 *
 * A second assertion enforces that the three vibes' trophy word strings
 * within each lesson are pairwise distinct (no allowlist).
 *
 * Run: npx tsx scripts/test-guided-cross-vibe.ts
 */

import {
  GUIDED_LESSONS,
} from '../src/data/guidedLessons.ts'
import type { ActiveGuidedVibeId } from '../src/data/guidedVibes.ts'

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
] as const

type ActivePathId = (typeof ACTIVE_PATHS)[number]

const VIBE_ORDER: ActiveGuidedVibeId[] = ['bright', 'sharp', 'wistful']

type DistinctnessAllowlistEntry = {
  pathId: string
  lessonNumber: number
  vibeA: 'bright' | 'sharp' | 'wistful'
  vibeB: 'bright' | 'sharp' | 'wistful'
  surface: 'targetText' | 'typeRecall' | 'either'
  reason: string
}

const ALLOWLIST: DistinctnessAllowlistEntry[] = [
  {
    pathId: 'english-a1-practical-2',
    lessonNumber: 9,
    vibeA: 'bright',
    vibeB: 'sharp',
    surface: 'targetText',
    reason: 'Intentional vocabulary differentiation: bus vs train as trophy anchors. Frame shared by design.',
  },
  {
    pathId: 'english-a1-practical-5',
    lessonNumber: 4,
    vibeA: 'bright',
    vibeB: 'wistful',
    surface: 'targetText',
    reason: 'Canonical fixed-expression call/response: "Nice to meet you" + softening tag is the legitimate Wistful variant.',
  },
]

const HARD_FAIL_THRESHOLD = 0.85
const WARN_LOWER_THRESHOLD = 0.70

const LEADING_HEDGES = [
  'Maybe',
  'Sorry',
  'Just',
  'Please',
  'Bitte',
  'Vielleicht',
  'Entschuldigung',
  'Eigentlich',
  'Hi there',
  'Hi',
  'Hello',
  'Excuse me',
]

const TRAILING_HEDGES = [
  'please',
  'perhaps',
  'then',
  'too',
  'I think',
  'for me',
  'maybe',
  "if you don't mind",
]

const SORTED_LEADING_HEDGES = [...LEADING_HEDGES].sort((a, b) => b.length - a.length)
const SORTED_TRAILING_HEDGES = [...TRAILING_HEDGES].sort((a, b) => b.length - a.length)

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s.,;:!?\-—]+|[\s.,;:!?\-—]+$/g, '')
    .trim()
}

function stripLeadingHedges(value: string): string {
  let prev = ''
  let current = value
  while (prev !== current) {
    prev = current
    for (const hedge of SORTED_LEADING_HEDGES) {
      const pattern = new RegExp(`^${escapeRegex(hedge.toLowerCase())}\\b\\s*[,.\\-—]?\\s*`)
      const next = current.replace(pattern, '').trim()
      if (next !== current) {
        current = next
        break
      }
    }
  }
  return current
}

function stripTrailingHedges(value: string): string {
  let prev = ''
  let current = value
  while (prev !== current) {
    prev = current
    for (const hedge of SORTED_TRAILING_HEDGES) {
      const pattern = new RegExp(`[\\s,.\\-—]+${escapeRegex(hedge.toLowerCase())}\\s*[.,!?]*$`)
      const next = current.replace(pattern, '').trim()
      if (next !== current) {
        current = next
        break
      }
    }
  }
  return current
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }
  return matrix[a.length][b.length]
}

export function hedgeStripLevSim(a: string, b: string): number {
  const aNormalized = normalize(a)
  const bNormalized = normalize(b)
  const aStripped = stripTrailingHedges(stripLeadingHedges(aNormalized))
  const bStripped = stripTrailingHedges(stripLeadingHedges(bNormalized))
  if (aStripped.length === 0 || bStripped.length === 0) return 0
  const distance = levenshtein(aStripped, bStripped)
  const maxLen = Math.max(aStripped.length, bStripped.length)
  if (maxLen === 0) return 0
  return 1 - distance / maxLen
}

function reassembleTypeRecall(variant: { typeRecall: { before: string; answer: string; after: string } }): string {
  return `${variant.typeRecall.before}${variant.typeRecall.answer}${variant.typeRecall.after}`
}

function canonicalPair(a: 'bright' | 'sharp' | 'wistful', b: 'bright' | 'sharp' | 'wistful'): {
  vibeA: 'bright' | 'sharp' | 'wistful'
  vibeB: 'bright' | 'sharp' | 'wistful'
} {
  if (a === b) {
    return { vibeA: a, vibeB: b }
  }
  return a < b ? { vibeA: a, vibeB: b } : { vibeA: b, vibeB: a }
}

function findAllowlistEntry(
  pathId: string,
  lessonNumber: number,
  vibeA: 'bright' | 'sharp' | 'wistful',
  vibeB: 'bright' | 'sharp' | 'wistful',
  surface: 'targetText' | 'typeRecall',
): DistinctnessAllowlistEntry | undefined {
  const canonical = canonicalPair(vibeA, vibeB)
  return ALLOWLIST.find(
    (entry) =>
      entry.pathId === pathId
      && entry.lessonNumber === lessonNumber
      && entry.vibeA === canonical.vibeA
      && entry.vibeB === canonical.vibeB
      && (entry.surface === surface || entry.surface === 'either'),
  )
}

type PairResult = {
  pathId: string
  lessonNumber: number
  vibeA: 'bright' | 'sharp' | 'wistful'
  vibeB: 'bright' | 'sharp' | 'wistful'
  surfaceScores: { targetText: number; typeRecall: number }
  maxScore: number
  maxSurface: 'targetText' | 'typeRecall'
  allowlistEntry: DistinctnessAllowlistEntry | undefined
}

const pairResults: PairResult[] = []
const hardFails: PairResult[] = []
const warns: PairResult[] = []
const allowlistHits: PairResult[] = []
let totalPairs = 0

const trophyCollisions: { pathId: string; lessonNumber: number; word: string; vibes: string[] }[] = []

for (const lesson of GUIDED_LESSONS) {
  if (!ACTIVE_PATHS.includes(lesson.pathId as ActivePathId)) continue

  const bright = lesson.vibeVariants.bright
  const wistful = lesson.vibeVariants.wistful
  const sharp = lesson.vibeVariants.sharp
  if (!bright || !wistful || !sharp) continue

  const trophyByVibe: Record<'bright' | 'sharp' | 'wistful', string> = {
    bright: bright.trophyWord.word.toLowerCase(),
    sharp: sharp.trophyWord.word.toLowerCase(),
    wistful: wistful.trophyWord.word.toLowerCase(),
  }
  const collidingVibes: string[] = []
  for (const a of VIBE_ORDER) {
    for (const b of VIBE_ORDER) {
      if (a >= b) continue
      if (trophyByVibe[a] === trophyByVibe[b]) {
        collidingVibes.push(`${a}/${b}=${trophyByVibe[a]}`)
      }
    }
  }
  if (collidingVibes.length > 0) {
    const wordSet = new Set(Object.values(trophyByVibe))
    trophyCollisions.push({
      pathId: lesson.pathId,
      lessonNumber: lesson.lessonNumber,
      word: Array.from(wordSet).join(','),
      vibes: collidingVibes,
    })
  }

  const variants: Record<'bright' | 'sharp' | 'wistful', typeof bright> = {
    bright,
    sharp,
    wistful,
  }

  const pairs: Array<['bright' | 'sharp' | 'wistful', 'bright' | 'sharp' | 'wistful']> = [
    ['bright', 'wistful'],
    ['bright', 'sharp'],
    ['wistful', 'sharp'],
  ]

  for (const [vibeA, vibeB] of pairs) {
    totalPairs += 1
    const a = variants[vibeA]
    const b = variants[vibeB]
    const targetTextScore = hedgeStripLevSim(a.corePhrase.targetText, b.corePhrase.targetText)
    const typeRecallScore = hedgeStripLevSim(reassembleTypeRecall(a), reassembleTypeRecall(b))
    const maxSurface = typeRecallScore > targetTextScore ? 'typeRecall' : 'targetText'
    const maxScore = Math.max(targetTextScore, typeRecallScore)
    const allowlistEntry = findAllowlistEntry(lesson.pathId, lesson.lessonNumber, vibeA, vibeB, maxSurface)

    const result: PairResult = {
      pathId: lesson.pathId,
      lessonNumber: lesson.lessonNumber,
      vibeA,
      vibeB,
      surfaceScores: { targetText: targetTextScore, typeRecall: typeRecallScore },
      maxScore,
      maxSurface,
      allowlistEntry,
    }
    pairResults.push(result)

    if (maxScore >= HARD_FAIL_THRESHOLD) {
      if (allowlistEntry) {
        allowlistHits.push(result)
      } else {
        hardFails.push(result)
      }
    } else if (maxScore >= WARN_LOWER_THRESHOLD) {
      if (allowlistEntry) {
        allowlistHits.push(result)
      } else {
        warns.push(result)
      }
    }
  }
}

console.log('[cross-vibe distinctness] hedge-strip Levenshtein similarity')
console.log(`  thresholds: hard-fail >= ${HARD_FAIL_THRESHOLD}, warn >= ${WARN_LOWER_THRESHOLD}`)
console.log(`  pairs scanned: ${totalPairs}`)
console.log(`  allowlist entries: ${ALLOWLIST.length}`)
console.log(`  allowlist hits: ${allowlistHits.length}`)
console.log(`  hard fails: ${hardFails.length}`)
console.log(`  warns: ${warns.length}`)

if (allowlistHits.length > 0) {
  console.log('\n[allowlist hits]')
  for (const hit of allowlistHits) {
    console.log(
      `  [ALLOWED] ${hit.pathId} L${hit.lessonNumber} ${hit.vibeA}/${hit.vibeB} `
      + `surface=${hit.maxSurface} score=${hit.maxScore.toFixed(3)} `
      + `(targetText=${hit.surfaceScores.targetText.toFixed(3)}, typeRecall=${hit.surfaceScores.typeRecall.toFixed(3)})`,
    )
    console.log(`             reason: ${hit.allowlistEntry?.reason ?? '(unknown)'}`)
  }
}

if (warns.length > 0) {
  console.log('\n[warns]')
  for (const warn of warns) {
    console.error(
      `  [WARN] ${warn.pathId} L${warn.lessonNumber} ${warn.vibeA}/${warn.vibeB} `
      + `surface=${warn.maxSurface} score=${warn.maxScore.toFixed(3)} `
      + `(targetText=${warn.surfaceScores.targetText.toFixed(3)}, typeRecall=${warn.surfaceScores.typeRecall.toFixed(3)})`,
    )
  }
}

let failureCount = 0

if (hardFails.length > 0) {
  console.error('\n[hard fails]')
  for (const fail of hardFails) {
    console.error(
      `  [FAIL] ${fail.pathId} L${fail.lessonNumber} ${fail.vibeA}/${fail.vibeB} `
      + `surface=${fail.maxSurface} score=${fail.maxScore.toFixed(3)} `
      + `(targetText=${fail.surfaceScores.targetText.toFixed(3)}, typeRecall=${fail.surfaceScores.typeRecall.toFixed(3)})`,
    )
    failureCount += 1
  }
}

if (trophyCollisions.length > 0) {
  console.error('\n[trophy collisions]')
  for (const collision of trophyCollisions) {
    console.error(
      `  [FAIL] ${collision.pathId} L${collision.lessonNumber} `
      + `trophy collision: ${collision.vibes.join(', ')}`,
    )
    failureCount += 1
  }
} else {
console.log('\n[trophy distinctness] all lessons in A1P1-A1P10 have pairwise-distinct trophy words across vibes')
}

console.log(`\nsummary: ${totalPairs} pairs, ${hardFails.length} hard fails, ${warns.length} warns, ${allowlistHits.length} allowlist hits, ${trophyCollisions.length} trophy collisions`)

if (failureCount > 0) {
  process.exit(1)
}
