// Offline storybook contract and speech manifest. No network, credentials or TTS.
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const contentDir = path.join(root, 'frontend/content-drafts/storybooks-2026-10')
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const keys = (value, expected, name) => {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${name}: expected object`)
  assert(Object.keys(value).sort().join('|') === [...expected].sort().join('|'), `${name}: missing or unknown fields`)
}
const text = (value, name) => {
  assert(typeof value === 'string' && value.trim() === value && value.length > 0 && value.length < 1800, `${name}: invalid text`)
  assert(value === value.normalize('NFC') && !/[\u0000-\u001f\u007f<>]/u.test(value), `${name}: unsafe or non-NFC text`)
}
const pair = (value, name) => {
  keys(value, ['en', 'de'], name)
  for (const lang of ['en', 'de']) text(value[lang], `${name}.${lang}`)
}
const phrase = (value, name) => { text(value?.text, name); pair(value.meaning, name) }

export function validateCollection(collection, locale) {
  keys(collection, ['schemaVersion', 'locale', 'episodes'], 'collection')
  assert(collection.schemaVersion === 1 && collection.locale === locale && Array.isArray(collection.episodes), 'Invalid collection envelope')
  assert(collection.episodes.length === 8, `${locale}: expected eight complete episodes`)
  const ids = new Set()
  const levels = { A1: 0, A2: 0, B1: 0, B2: 0 }
  for (const e of collection.episodes) {
    keys(e, ['id','locale','level','world','title','learningFocus','fictionNote','newWords','pages'], 'episode')
    assert(typeof e.id === 'string' && /^[a-z0-9-]+$/.test(e.id) && !ids.has(e.id), 'Invalid or duplicate episode id')
    ids.add(e.id)
    assert(e.locale === locale && Object.hasOwn(levels, e.level), `${e.id}: locale/level mismatch`)
    assert(e.id.startsWith(`${locale.slice(0, 2)}-${e.level.toLowerCase()}-`), `${e.id}: id must include locale and level`)
    levels[e.level]++
    assert(['culture', 'ocean', 'deep-time', 'cosmos', 'absurd', 'fables'].includes(e.world), `${e.id}: invalid world`)
    keys(e.title, ['text','meaning'], e.id); phrase(e.title, e.id)
    pair(e.learningFocus, `${e.id}.learningFocus`)
    pair(e.fictionNote, `${e.id}.fictionNote`)
    assert(Array.isArray(e.newWords) && e.newWords.length <= 3, `${e.id}: too many pre-taught words`)
    e.newWords.forEach((w, i) => { keys(w, ['text','meaning'], `${e.id}.word${i}`); phrase(w, `${e.id}.word${i}`) })
    assert(Array.isArray(e.pages) && e.pages.length === 6, `${e.id}: needs six complete pages`)
    const localIds = new Set()
    for (const [p, page] of e.pages.entries()) {
      const name = `${e.id}.page${p + 1}`
      keys(page, ['title','artBrief','lines','hotspots'], name)
      keys(page.title, ['text','meaning'], name); phrase(page.title, name)
      text(page.artBrief, `${name}.artBrief`)
      assert(Array.isArray(page.lines) && page.lines.length === 3, `${name}: needs three lines`)
      assert(Array.isArray(page.hotspots) && page.hotspots.length === 2, `${name}: needs two objects`)
      for (const item of [...page.lines, ...page.hotspots]) {
        assert(typeof item.id === 'string' && /^[a-z0-9-]+$/.test(item.id) && !localIds.has(item.id), `${name}: duplicate/invalid entry id`)
        localIds.add(item.id)
        phrase(item, `${name}.${item.id}`)
        pair(item.note, `${name}.${item.id}.note`)
      }
      page.lines.forEach(line => { keys(line, ['id','speaker','text','meaning','note'], `${name}.line`); text(line.speaker, `${name}.speaker`) })
      for (const obj of page.hotspots) {
        keys(obj, ['id','label','text','meaning','note','x','y'], `${name}.object`)
        keys(obj.label, ['text','meaning'], `${name}.label`)
        phrase(obj.label, `${name}.${obj.id}.label`)
        assert([obj.x, obj.y].every(n => Number.isFinite(n) && n >= 10 && n <= 90), `${name}: invalid hotspot coordinate`)
      }
    }
  }
  assert(Object.values(levels).every(n => n === 2), `${locale}: needs two episodes per level`)
  return collection
}

export function speechEntries(collection) {
  const rows = []
  const add = (episode, page, entry, kind, phrase) => rows.push({
    id: `${episode.id}/${page}/${entry}/${kind}`, episodeId: episode.id,
    locale: episode.locale, level: episode.level, world: episode.world,
    page, kind, text: phrase.text, speaker: phrase.speaker || (kind === 'line' ? 'narrator' : kind),
  })
  for (const e of collection.episodes) {
    add(e, 0, 'story', 'title', e.title)
    e.newWords.forEach((w, i) => add(e, 0, `word-${i + 1}`, 'vocabulary', w))
    e.pages.forEach((p, i) => {
      add(e, i + 1, 'page', 'title', p.title)
      p.lines.forEach(l => add(e, i + 1, l.id, 'line', l))
      p.hotspots.forEach(h => {
        add(e, i + 1, h.id, 'label', h.label)
        add(e, i + 1, h.id, 'description', h)
      })
    })
  }
  return rows
}

export async function loadCollections() {
  const collections = [], sources = {}
  for (const [name, locale] of [['english.json', 'en-GB'], ['spanish.json', 'es-ES']]) {
    const raw = await fs.readFile(path.join(contentDir, name))
    sources[name] = hash(raw)
    collections.push(validateCollection(JSON.parse(raw), locale))
  }
  return { collections, sources }
}

export async function buildManifest() {
  const { collections, sources } = await loadCollections()
  const uses = collections.flatMap(speechEntries)
  assert(new Set(uses.map(row => row.id)).size === uses.length, 'Duplicate speech-use identity across collections')
  const unique = new Map()
  for (const row of uses) {
    const key = hash(`${row.locale}\0${row.text}`)
    if (!unique.has(key)) unique.set(key, { textKey: key, locale: row.locale, text: row.text, characters: [...row.text].length, uses: [] })
    unique.get(key).uses.push(row.id)
  }
  const phrases = [...unique.values()]
  return {
    schemaVersion: 1, status: 'offline-unvoiced', sources,
    modelCandidate: 'eleven_v4', voiceAssignments: null, spendingAuthorized: false,
    recordedFiles: 0, published: false, episodes: collections.flatMap(c => c.episodes).length,
    pages: collections.flatMap(c => c.episodes).reduce((n, e) => n + e.pages.length, 0),
    uses: uses.length, uniquePhrases: phrases.length,
    firstAttemptCharacters: phrases.reduce((n, p) => n + p.characters, 0),
    byLocale: Object.fromEntries(['en-GB', 'es-ES'].map(locale => [locale, {
      uniquePhrases: phrases.filter(p => p.locale === locale).length,
      characters: phrases.filter(p => p.locale === locale).reduce((n, p) => n + p.characters, 0),
    }])),
    phrases, speechUses: uses,
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await buildManifest()
  const destination = process.argv[2]
  if (destination) await fs.writeFile(destination, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
  const { phrases, speechUses, ...summary } = manifest
  console.log(JSON.stringify(summary, null, 2))
}
