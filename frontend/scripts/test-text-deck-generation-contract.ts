import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const deckListClassic = readFileSync(resolve(process.cwd(), 'src/pages/Decks.tsx'), 'utf8')
const deckListGlassy = readFileSync(resolve(process.cwd(), 'src/pages/DecksPG.tsx'), 'utf8')
const generateClassic = readFileSync(resolve(process.cwd(), 'src/pages/GeneratePG.tsx'), 'utf8')
const generateGlassy = readFileSync(resolve(process.cwd(), 'src/pages/GenerateGO.tsx'), 'utf8')
const extractWordsModal = readFileSync(resolve(process.cwd(), 'src/components/speak/ExtractWordsModal.tsx'), 'utf8')

assert.match(
  deckListClassic,
  /isImagelessDeck\s*\?\s*\([\s\S]*?<Type[\s\S]*?:\s*\([\s\S]*?<Music/,
  'Classic text deck placeholders should use the Type icon instead of Music',
)

assert.match(
  deckListGlassy,
  /deck\.deck_type\s*===\s*'card_text'\s*\?\s*Type\s*:\s*Music/,
  'Glassy text deck artwork should use the Type icon instead of Music',
)

assert.doesNotMatch(
  deckListClassic,
  /ImagelessDeckBadge/,
  'Classic deck list should not render a duplicate T/Text badge for text decks',
)

assert.doesNotMatch(
  deckListGlassy,
  /ImagelessDeckBadge/,
  'Glassy deck list should not render a duplicate T/Text badge for text decks',
)

assert.doesNotMatch(
  deckListGlassy,
  /<p className="water-deck-language">/,
  'Glassy water deck copy should not repeat the language already shown in the artwork',
)

for (const [label, source] of [
  ['Classic generate', generateClassic],
  ['Glassy generate', generateGlassy],
] as const) {
  assert.match(
    source,
    /submitInFlightRef/,
    `${label} should synchronously guard duplicate generate taps`,
  )
  assert.match(
    source,
    /effectiveProductLane\s*===\s*'card_text'|productLane\s*===\s*'card_text'/,
    `${label} should route card_text through the imageless import path`,
  )
  assert.match(
    source,
    /translateAndIpa/,
    `${label} should enrich card_text words with translation and IPA before import`,
  )
  assert.match(
    source,
    /submitImagelessImport/,
    `${label} should create card_text decks with submit_imageless_import`,
  )
}

assert.match(
  extractWordsModal,
  /importInFlightRef/,
  'Speak extraction import should synchronously guard duplicate import taps',
)

console.log('text deck generation and deck-list contract checks passed')
