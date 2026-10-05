// Offline contract regressions for recording coverage and source identities.
import assert from 'node:assert/strict'
import { buildManifest, loadCollections, speechEntries, validateCollection } from './export.mjs'

const { collections } = await loadCollections()
const manifest = await buildManifest()
const rows = collections.flatMap(speechEntries)
assert.equal(rows.length, collections.flatMap(c => c.episodes).reduce((total, e) => total + 49 + e.newWords.length, 0))
assert.equal(new Set(rows.map(r => r.id)).size, rows.length)
assert.equal(rows.filter(r => r.kind === 'line').length, 16 * 18)
assert.equal(rows.filter(r => r.kind === 'description').length, 16 * 12)
assert.equal(rows.filter(r => r.kind === 'label').length, 16 * 12)
assert.equal(rows.filter(r => r.kind === 'title').length, 16 * 7)
assert.equal(manifest.phrases.reduce((n, p) => n + p.uses.length, 0), rows.length)
assert.equal(manifest.firstAttemptCharacters, manifest.phrases.reduce((n, p) => n + [...p.text].length, 0))
for (const mutate of [
  c => { c.episodes[0].pages[0].hotspots.pop() },
  c => { c.episodes[0].pages[0].lines[0].text = '' },
  c => { c.episodes[0].pages[0].lines[0].text = '<break>' },
  c => { c.episodes[0].pages[0].lines[0].meaning.de = '' },
  c => { c.episodes[0].pages[0].hotspots[0].id = c.episodes[0].pages[0].lines[0].id },
  c => { c.episodes[0].id = 'generic-story' },
  c => { c.episodes[0].locale = 'es-ES' },
  c => { c.episodes[0].newNarration = 'An accidentally unexported phrase.' },
  c => { c.episodes[0].pages[0].hotspots[0].x = NaN },
]) {
  const invalid = structuredClone(collections[0]); mutate(invalid)
  assert.throws(() => validateCollection(invalid, 'en-GB'))
}
const unicode = structuredClone(collections[0])
unicode.episodes[0].pages[0].lines[0].text = 'A star: 𓇼'
assert.doesNotThrow(() => validateCollection(unicode, 'en-GB'))
console.log(JSON.stringify({ result: 'PASS', stories: manifest.episodes, pages: manifest.pages,
  uses: manifest.uses, uniquePhrases: manifest.uniquePhrases, negativeCases: 9,
  unicodeCodePointCounting: true, providerCalls: 0 }, null, 2))
