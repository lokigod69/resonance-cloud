// Removes web-served asset trees from dist/ before `cap sync ios` so the native
// bundle stays small. On device these paths are fetched from the public web origin
// via publicAssetUrl() (src/lib/publicOrigins.ts). The plain `build` script is
// untouched, so the Vercel deploy still ships the full trees.
//
// Phase 1: dist/curriculum (~471M). Phase 2: dist/guided/trophy-songs +
// dist/guided/vibes (the guided literals funnel through publicAssetUrl).
// The rest of dist/guided (today, reviews, trophies, lesson-numbers, ~5M)
// stays bundled on purpose — it is small and works offline.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const distDir = path.join(root, 'dist')

const STRIP_TARGETS = ['curriculum', 'guided/trophy-songs', 'guided/vibes']

function dirSizeBytes(dir: string): number {
  let total = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) total += dirSizeBytes(full)
    else if (entry.isFile()) total += fs.statSync(full).size
  }
  return total
}

function formatMiB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}

if (!fs.existsSync(distDir)) {
  console.error('strip-ios-bundle: dist/ not found — run `vite build --mode ios` first')
  process.exit(1)
}

let freed = 0
for (const target of STRIP_TARGETS) {
  const full = path.join(distDir, target)
  if (!fs.existsSync(full)) {
    // Fail loud: a missing tree means the build layout changed and the strip
    // list is stale — do not silently ship a different bundle than intended.
    console.error(`strip-ios-bundle: expected dist/${target} to exist — build layout changed?`)
    process.exit(1)
  }
  const size = dirSizeBytes(full)
  fs.rmSync(full, { recursive: true })
  freed += size
  console.log(`strip-ios-bundle: removed dist/${target} (${formatMiB(size)})`)
}

console.log(`strip-ios-bundle: freed ${formatMiB(freed)}; dist is now ${formatMiB(dirSizeBytes(distDir))}`)
