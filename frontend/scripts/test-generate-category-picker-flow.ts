import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const categoryPicker = readFileSync(resolve(process.cwd(), 'src/components/generate/steps/CategoryPicker.tsx'), 'utf8')
const wordsStep = readFileSync(resolve(process.cwd(), 'src/components/generate/steps/WordsStep.tsx'), 'utf8')

assert.match(
  categoryPicker,
  /const DEFAULT_CATEGORY_WORD_COUNT = 5/,
  'category suggestions should default to 5 words',
)

assert.match(
  categoryPicker,
  /const MAX_CATEGORY_WORD_COUNT = 10/,
  'category suggestions should cap at 10 words',
)

assert.match(
  categoryPicker,
  /min=\{MIN_CATEGORY_WORD_COUNT\}[\s\S]*?max=\{MAX_CATEGORY_WORD_COUNT\}/,
  'category amount slider should run from 5 to 10',
)

const tileClickBody = categoryPicker.match(/function handleTileClick\(category: Category\) \{([\s\S]*?)\n {2}\}/)?.[1] ?? ''
assert.doesNotMatch(
  tileClickBody,
  /fetchSuggestions/,
  'clicking a category should only select it, not fetch immediately',
)

assert.match(
  categoryPicker,
  /onMergeWords\(suggestedWords\)[\s\S]*resetExpansion\(\)/,
  'successful category fetch should merge suggestions directly and collapse the drawer',
)

assert.doesNotMatch(
  categoryPicker,
  /regenerateAll|RefreshCw|AddToList|addToList/,
  'category picker should not expose regenerate-all or separate add-to-list affordances',
)

const categoryIndex = wordsStep.indexOf('        <CategoryPicker')
const inputIndex = wordsStep.indexOf('          <GlassInput')
const chipsIndex = wordsStep.indexOf('          <WordChips')
const actionsIndex = wordsStep.indexOf('                <PremiumQuickModePanel')

assert.ok(categoryIndex !== -1, 'WordsStep should render CategoryPicker')
assert.ok(inputIndex !== -1, 'WordsStep should render GlassInput')
assert.ok(chipsIndex !== -1, 'WordsStep should render WordChips')
assert.ok(actionsIndex !== -1, 'WordsStep should render PremiumQuickModePanel')
assert.ok(categoryIndex < inputIndex, 'categories should appear above the manual input')
assert.ok(inputIndex < chipsIndex, 'manual input should appear before green word chips')
assert.ok(chipsIndex < actionsIndex, 'premium actions should appear under the green word chips')

console.log('generate category picker flow checks passed')
