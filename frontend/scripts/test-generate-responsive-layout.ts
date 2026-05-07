import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

const glassCss = read('src/themes/glass-orb.css')
const premiumSelectors = read('src/components/generate/shared/PremiumVisualSelectors.tsx')
const generatePg = read('src/pages/GeneratePG.tsx')
const generateGo = read('src/pages/GenerateGO.tsx')
const cardImageStyleStep = read('src/components/generate/steps/CardImageStyleStep.tsx')

assert(
  premiumSelectors.includes('data-option-value={value}'),
  'Premium orb selectors must expose value hooks for responsive ordering and visual QA.',
)

assert(
  glassCss.includes('.premium-option-tile.selected .premium-option-orb')
    && !/\.premium-option-tile\.selected\s*\{[^}]*box-shadow:/s.test(glassCss)
    && !/\.premium-option-tile\.selected\s*\{[^}]*background:/s.test(glassCss),
  'Selected premium orb state must live on the orb, not on an outer tile box.',
)

assert(
  glassCss.includes('.premium-summary-row')
    && glassCss.includes('.premium-summary-orb')
    && generatePg.includes('PremiumSummaryRow')
    && generateGo.includes('PremiumSummaryRow'),
  'Generate flows must use shared clickable summary orb rows.',
)

assert(
  /@media\s*\(max-width:\s*640px\)[\s\S]*\.premium-selector-grid[\s\S]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(glassCss)
    && /@media\s*\(max-width:\s*640px\)[\s\S]*\.premium-style-grid[\s\S]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(glassCss),
  'Mobile Premium Customize selectors must use compact two-column grids.',
)

assert(
  /@media\s*\(max-width:\s*640px\)[\s\S]*data-option-value="card_premium"[\s\S]*order:\s*2/.test(glassCss)
    && /@media\s*\(max-width:\s*640px\)[\s\S]*data-option-value="card_standard"[\s\S]*order:\s*3/.test(glassCss),
  'Mobile product lane order must be Video, Premium Card, Standard Card.',
)

assert(
  cardImageStyleStep.includes('standard-card-style-step')
    && cardImageStyleStep.includes('standard-card-style-grid'),
  'Standard Card visual style must use centered shared layout classes.',
)

assert(
  generatePg.includes('window.scrollTo({ top: 0')
    && generateGo.includes('scrollIntoView({ behavior: \'smooth\', block: \'start\' })'),
  'Generate step navigation must reset to the top of the active step.',
)

console.log('Generate responsive layout source checks passed.')
