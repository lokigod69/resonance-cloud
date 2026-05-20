// Smoke tests for the pure curriculum image-set resolver.
// Run with: npx tsx frontend/src/lib/curriculumImageSets.test.ts
//
// These tests deliberately inject in-memory indexes so the test does not
// depend on the auto-generated availability file. The default indexes are
// covered by the manifest parse checks in Part 8 verification.

import {
  normalizeCurriculumImageSetWord,
  resolveCurriculumImageSetAsset,
  type CurriculumImageSetAssetIndex,
} from './curriculumImageSets'

let failures = 0

function assert(label: string, condition: boolean, detail?: string): void {
  if (!condition) {
    failures += 1
    console.error(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
  } else {
    console.log(`ok   ${label}`)
  }
}

function indexFor(words: string[], basePath: string): CurriculumImageSetAssetIndex {
  const set = new Set(words)
  return {
    has: (w) => set.has(w),
    publicBasePath: basePath,
  }
}

// Normalization
assert(
  'normalizeCurriculumImageSetWord lowercases and strips diacritics',
  normalizeCurriculumImageSetWord('Müller') === 'muller',
)
assert(
  "normalizeCurriculumImageSetWord converts 'brother-in-law' to snake_case",
  normalizeCurriculumImageSetWord('brother-in-law') === 'brother_in_law',
)
assert(
  'normalizeCurriculumImageSetWord folds ß to ss',
  normalizeCurriculumImageSetWord('straße') === 'strasse',
)
assert(
  'normalizeCurriculumImageSetWord trims leading/trailing separators',
  normalizeCurriculumImageSetWord("'apple's") === 'apples',
)

// Active Set A, term in A
{
  const r = resolveCurriculumImageSetAsset('apple', {
    activeSetKey: 'A',
    indexBySet: {
      A: indexFor(['apple'], '/curriculum/en/set-a'),
      C: indexFor(['apple'], '/curriculum/en/set-c'),
    },
  })
  assert('active=A resolves to set-a path', r.publicPath === '/curriculum/en/set-a/apple.webp')
  assert('active=A reports resolvedSet=A', r.resolvedSet === 'A')
  assert('active=A reports no fallback', r.fallbackUsed === false)
}

// Active Set C, term in C
{
  const r = resolveCurriculumImageSetAsset('apple', {
    activeSetKey: 'C',
    indexBySet: {
      A: indexFor(['apple'], '/curriculum/en/set-a'),
      C: indexFor(['apple'], '/curriculum/en/set-c'),
    },
  })
  assert('active=C resolves to set-c path', r.publicPath === '/curriculum/en/set-c/apple.webp')
  assert('active=C reports resolvedSet=C', r.resolvedSet === 'C')
  assert('active=C reports no fallback', r.fallbackUsed === false)
}

// Active Set C, term missing from C, present in A — fall back to A
{
  const r = resolveCurriculumImageSetAsset('uncle', {
    activeSetKey: 'C',
    indexBySet: {
      A: indexFor(['uncle'], '/curriculum/en/set-a'),
      C: indexFor([], '/curriculum/en/set-c'),
    },
  })
  assert('active=C with C-miss falls back to set-a path', r.publicPath === '/curriculum/en/set-a/uncle.webp')
  assert('active=C with C-miss reports resolvedSet=A', r.resolvedSet === 'A')
  assert('active=C with C-miss reports fallbackUsed=true', r.fallbackUsed === true)
}

// Term missing from both sets — return null path, no resolved set
{
  const r = resolveCurriculumImageSetAsset('zzznonexistent', {
    activeSetKey: 'C',
    indexBySet: {
      A: indexFor(['apple'], '/curriculum/en/set-a'),
      C: indexFor(['apple'], '/curriculum/en/set-c'),
    },
  })
  assert('missing from both: publicPath is null', r.publicPath === null)
  assert('missing from both: resolvedSet is null', r.resolvedSet === null)
  assert('missing from both: fallbackUsed is false', r.fallbackUsed === false)
}

// Active Set A, term missing from A — no implicit cross-set climb to C
{
  const r = resolveCurriculumImageSetAsset('only_in_c', {
    activeSetKey: 'A',
    indexBySet: {
      A: indexFor([], '/curriculum/en/set-a'),
      C: indexFor(['only_in_c'], '/curriculum/en/set-c'),
    },
  })
  assert(
    'active=A with A-miss does NOT silently climb to C',
    r.publicPath === null && r.resolvedSet === null,
  )
}

if (failures > 0) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proc = (globalThis as any).process
  console.error(`\n${failures} test(s) failed.`)
  if (proc && typeof proc.exit === 'function') {
    proc.exit(1)
  } else {
    throw new Error(`${failures} curriculumImageSets test(s) failed`)
  }
} else {
  console.log('\nAll curriculumImageSets resolver tests passed.')
}
