import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { formatMusicDeckLabel } from '../src/lib/musicTrackLabels.ts'

const root = process.cwd()

type TranslateFn = (key: string) => string

const t: TranslateFn = (key) => ({
  'langName.Bisaya': 'Bisaya',
  'langName.Indonesian': 'Indonesian',
  'langName.German': 'German',
}[key] ?? key)

assert.equal(
  formatMusicDeckLabel('Tiere \u00b7 Level 1', 'Bisaya', t),
  'Tiere \u00b7 Level 1 \u00b7 Bisaya',
  'deck labels should append localized Bisaya language names',
)
assert.equal(
  formatMusicDeckLabel('Tiere \u00b7 Level 1', 'Indonesian', t),
  'Tiere \u00b7 Level 1 \u00b7 Indonesian',
  'same-named level decks should differ by language',
)
assert.equal(
  formatMusicDeckLabel('Animals', null, t),
  'Animals',
  'missing language should leave the deck label unchanged',
)

function assertMusicPage(path: string, label: string) {
  const source = readFileSync(join(root, path), 'utf8')
  assert.match(source, /import \{ formatMusicDeckLabel[^}]*\} from '@\/lib\/musicTrackLabels'/, `${label}: should import shared label helper`)
  assert.match(source, /decks\(id, name, target_language\)/, `${label}: word query should fetch deck target_language`)
  assert.match(source, /target_language:\s*deckRow\?\.target_language \?\? null/, `${label}: word tracks should source language from deck`)
  assert.match(source, /formatMusicDeckLabel\(deckRow\?\.name \?\? 'Unknown deck', deckRow\?\.target_language \?\? null, t\)/, `${label}: word deck labels should include language`)
  assert.match(source, /deck_id, category_slug, level_number, target_language/, `${label}: level query should fetch deck_id with level metadata`)
  assert.match(source, /formatMusicDeckLabel\([^,]+,\s*row\.target_language,\s*t\)/, `${label}: level deck labels should include language`)
}

assertMusicPage('src/pages/Music.tsx', 'Music')
assertMusicPage('src/pages/MusicPG.tsx', 'MusicPG')

console.log('test-music-page-language-labels: OK')
