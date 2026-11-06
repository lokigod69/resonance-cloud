import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Run after the iOS build, after Capacitor sync, and against the exact archive
// being uploaded. Capacitor adds bridge files of its own to the native copy.
function verifyTree(expected: string, actual: string): number {
  let files = 0
  for (const entry of readdirSync(expected, { withFileTypes: true })) {
    const source = join(expected, entry.name)
    const copy = join(actual, entry.name)
    if (entry.isDirectory()) {
      files += verifyTree(source, copy)
    } else if (entry.isFile()) {
      assert(readFileSync(source).equals(readFileSync(copy)), `Packaged file differs: ${copy}`)
      files++
    }
  }
  return files
}

const dist = resolve('dist')
const target = process.argv[2] ? resolve(process.argv[2]) : dist
const reference = resolve('public/scripts')
const app = readFileSync(join(dist, 'index.html'), 'utf8')
const entry = app.match(/<script\b[^>]+\bsrc="(\/assets\/[^"]+\.js)"/)?.[1]
assert(entry && existsSync(join(dist, entry)), 'Expected a compiled Vite application in dist.')
for (const tree of ['curriculum', 'guided/trophy-songs', 'guided/vibes']) {
  assert(!existsSync(join(target, tree)), `Unexpected web-only asset directory: ${tree}. Run the iOS build.`)
}
const count = verifyTree(reference, join(target, 'scripts'))
console.log(`Verified ${count} Script Lab recordings and credit files against the source in ${target}.`)
if (target !== dist) {
  const files = verifyTree(dist, target)
  console.log(`Verified all ${files} files from the fresh iOS web build in the packaged app.`)
}
