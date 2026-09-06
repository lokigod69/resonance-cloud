import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  canSubmitStreamPicture,
  resolveStreamPictureContext,
  streamPictureDeckName,
} from '../src/components/generate/streamPictureFlow'

function assert(label: string, condition: unknown): asserts condition {
  if (!condition) throw new Error(`FAIL: ${label}`)
  console.log(`PASS: ${label}`)
}

const navigationState = {
  streamWord: {
    targetTerm: 'die Bank',
    helperTerm: 'the bench',
    targetLanguageName: 'German',
    targetLanguageCode: 'de',
    helperLanguageName: 'English',
    helperLanguageCode: 'en',
  },
}

const context = resolveStreamPictureContext(navigationState, 'die Bank', 'German')
assert('matching StreamWord navigation state supplies the reviewed gloss', context?.helperTerm === 'the bench')
assert('matching StreamWord navigation state supplies the target language code', context?.targetLanguageCode === 'de')
assert('matching StreamWord navigation state supplies the gloss language code', context?.helperLanguageCode === 'en')
assert(
  'mismatched word navigation state is ignored',
  resolveStreamPictureContext(navigationState, 'die Kasse', 'German') === null,
)
assert(
  'mismatched language navigation state is ignored',
  resolveStreamPictureContext(navigationState, 'die Bank', 'Spanish') === null,
)

assert('deck names keep ordinary words', streamPictureDeckName('  die Bank  ') === 'die Bank')
assert('deck names are capped to the input contract', streamPictureDeckName('x'.repeat(80)).length === 50)
assert('paid submit waits for a known balance', !canSubmitStreamPicture(undefined, 1, false))
assert('paid submit blocks an insufficient balance', !canSubmitStreamPicture(0, 1, false))
assert('paid submit blocks while a request is running', !canSubmitStreamPicture(10, 1, true))
assert('paid submit enables only after an explicit affordable review', canSubmitStreamPicture(1, 1, false))

const generateSource = readFileSync(resolve(process.cwd(), 'src/pages/GenerateGO.tsx'), 'utf8')
const reviewSource = readFileSync(resolve(process.cwd(), 'src/components/generate/StreamPictureReview.tsx'), 'utf8')
const styleSource = readFileSync(resolve(process.cwd(), 'src/components/generate/steps/CardImageStyleStep.tsx'), 'utf8')

assert(
  'all valid word and language links own the focused path without a source marker',
  generateSource.includes('const focusedWordSeed = !deckIdParam && wordSeedOwned'),
)
assert(
  'focused links preselect Standard Card and open the focused review',
  generateSource.includes("setProductLane('card_standard')")
    && generateSource.includes('setStep(3)')
    && generateSource.includes('<StreamPictureReview'),
)
assert(
  'focused Generate calls the style-honoring submit path without a words override',
  generateSource.includes('onGenerate={() => { void handleInitialize() }}'),
)
assert(
  'focused navigation hides editable language and word summary controls',
  generateSource.includes('!existingDeck && !focusedWordSeed && language')
    && generateSource.includes('!focusedWordSeed && words.length > 0'),
)
assert(
  'focused back navigation deterministically preserves the selected language',
  generateSource.includes('navigate(`/dashboard?lang=${encodeURIComponent(seededWordLanguage)}`)'),
)
assert(
  'focused paid action is a disabled native button until its gate passes',
  reviewSource.includes('disabled={!canGenerate}')
    && reviewSource.includes('onClick={onGenerate}')
    && reviewSource.includes('data-stream-picture-generate')
    && reviewSource.includes('data-stream-picture-review')
    && reviewSource.includes("t('generate.primaryGenerate')"),
)
assert(
  'glassy standard style labels remain translated',
  styleSource.includes("label: t('generate.cardImageStyle.realistic.label')")
    && styleSource.includes("label: t('generate.cardImageStyle.editorial.label')")
    && styleSource.includes("label: t('generate.cardImageStyle.random.label')")
    && !styleSource.includes("'Realistic',"),
)

console.log('Stream picture flow contracts passed.')
