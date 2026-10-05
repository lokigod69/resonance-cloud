// Exact/case-and-punctuation-normalised overlap report; no novelty certification.
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { root, buildManifest } from './export.mjs'
const sha = value => crypto.createHash('sha256').update(value).digest('hex')
const fold = text => text.normalize('NFC').toLocaleLowerCase().replace(/[\p{P}\p{S}]/gu, '').replace(/\s+/g, ' ').trim()
const snapshotDir = process.argv[2]
const output = process.argv[3]
if (!snapshotDir || !output) throw new Error('Usage: node audit-overlap.mjs <existing-corpus-snapshot-directory> <new-report-file>')
const corpusBytes = await fs.readFile(path.join(snapshotDir, 'authored-source-live.json'))
const corpus = JSON.parse(corpusBytes)
for (const source of corpus.sourceFiles) {
  const file = path.resolve(root, source.path)
  if (!file.startsWith(root + path.sep) || sha(await fs.readFile(file)) !== source.sha256) throw new Error(`Existing corpus snapshot is stale: ${source.path}`)
}
const candidates = new Map(), audited = []
function record(text, language, location) {
  if (typeof text !== 'string' || !text.trim()) return
  const key = `${language}:${fold(text)}`
  if (!candidates.has(key)) candidates.set(key, [])
  if (candidates.get(key).length < 3) candidates.get(key).push({ text, location })
}
// Search all strings in an English/Spanish lesson. This deliberately errs towards
// reporting explanation matches too, rather than omitting an unfamiliar surface.
function strings(value, language, location) {
  if (typeof value === 'string') record(value, language, location)
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, language, `${location}/${i}`))
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) strings(v, language, `${location}/${k}`)
}
for (const lesson of corpus.lessons) {
  const language = { English: 'en', Spanish: 'es' }[lesson.targetLanguage]
  if (language) strings(lesson, language, `existing/${lesson.id}`)
}
async function visit(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) await visit(file)
    else if (entry.name.endsWith('.json')) {
      const bytes = await fs.readFile(file), value = JSON.parse(bytes)
      const language = { English: 'en', Spanish: 'es' }[value.targetLanguage]
      if (language && Array.isArray(value.lessons)) {
        const name = path.relative(root, file).replaceAll('\\', '/')
        strings(value.lessons, language, name)
        audited.push({ file: name, sha256: sha(bytes) })
      }
    }
  }
}
for (const dir of ['b1-2026-10','b2-2026-10']) await visit(path.join(root, 'frontend/content-drafts', dir))
const manifest = await buildManifest()
const matches = manifest.phrases.flatMap(p => {
  const found = candidates.get(`${p.locale.slice(0,2)}:${fold(p.text)}`)
  return found ? [{text:p.text, locale:p.locale, words:fold(p.text).split(' ').length, uses:p.uses, matches:found}] : []
})
const report = { schemaVersion:1, method:'Whole-string exact and case/punctuation-normalised comparison; not semantic or plagiarism detection',
  scope:'Existing authored A1/A2 and live German B1 snapshot, plus complete staged English/Spanish B1/B2 JSON at this observation',
  sourceHashes:manifest.sources, corpusSnapshotSha256:sha(corpusBytes), verifiedCorpusFiles:corpus.sourceFiles,
  additionalDrafts:audited, uniqueStoryPhrases:manifest.uniquePhrases,
  longMatches:matches.filter(m => m.words >= 4), shortCommonLanguageMatches:matches.filter(m => m.words < 4),
  interpretation:'Short shared words/phrases are expected. Long matches require editorial inspection; a match can also occur in an explanation. Zero matches is not a claim of conceptual uniqueness.',
}
await fs.writeFile(output, JSON.stringify(report, null, 2)+'\n', {flag:'wx'})
console.log(JSON.stringify({longMatches:report.longMatches, shortCommonLanguageMatches:report.shortCommonLanguageMatches.length, auditedStagedFiles:audited.length},null,2))
