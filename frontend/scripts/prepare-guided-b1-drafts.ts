/** Validate the staged P1 courses and export a local, provider-free audio snapshot. */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { draftTtsLessons, validateB1Draft } from './lib/guidedB1Drafts'

const directory = resolve(import.meta.dirname, '../content-drafts/b1-2026-10')
const args = process.argv.slice(2)
const batches = { priority: ['english', 'spanish', 'french'], 'italian-portuguese': ['italian', 'portuguese'] }
let batch: keyof typeof batches = 'priority'
const batchIndex = args.indexOf('--batch')
if (batchIndex >= 0) {
  const selected = args[batchIndex + 1]
  if (selected !== 'priority' && selected !== 'italian-portuguese') throw new Error('Unknown B1 draft batch')
  batch = selected
  args.splice(batchIndex, 2)
}
if (args.length > 1 || args.some(arg => arg.startsWith('--'))) throw new Error('Usage: tsx scripts/prepare-guided-b1-drafts.ts [--batch priority|italian-portuguese] [snapshot.json]')
const languages = batches[batch].map(slug => {
  const source = readFileSync(resolve(directory, `${slug}.json`), 'utf8')
  const draft = validateB1Draft(JSON.parse(source))
  if (draft.targetLanguage.toLowerCase() !== slug) throw new Error(`Wrong target in ${slug}.json`)
  return {
    targetLanguage: draft.targetLanguage,
    targetLanguageCode: draft.targetLanguageCode,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    lessons: draftTtsLessons(draft),
  }
})
const output = args[0]
if (output) writeFileSync(resolve(output), JSON.stringify({ schemaVersion: 1, status: 'draft', languages }, null, 2) + '\n')
console.log(JSON.stringify({ validated: languages.map(language => ({ target: language.targetLanguage, lessons: language.lessons.length, sourceSha256: language.sourceSha256 })), snapshot: output ?? null }, null, 2))
