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

function containsCall(source: string, callee: string, argument: string): boolean {
  const escapedCallee = callee.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedArgument = argument.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${escapedCallee}\\(\\s*['"]${escapedArgument}['"]\\s*\\)`).test(source)
}

const glassCss = read('src/themes/glass-orb.css')
const premiumSelectors = read('src/components/generate/shared/PremiumVisualSelectors.tsx')
const generatePg = read('src/pages/GeneratePG.tsx')
const generateGo = read('src/pages/GenerateGO.tsx')
const cardImageStyleStep = read('src/components/generate/steps/CardImageStyleStep.tsx')
const categoryPicker = read('src/components/generate/steps/CategoryPicker.tsx')
const wordsStep = read('src/components/generate/steps/WordsStep.tsx')
const premiumQuickModePanel = read('src/components/generate/shared/PremiumQuickModePanel.tsx')
const premiumCustomizeStep = read('src/components/generate/steps/PremiumCardCustomizationStep.tsx')
const glassInput = read('src/components/generate/shared/GlassInput.tsx')

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

const typeOwnIndex = categoryPicker.indexOf("t('generate.words.typeOwn')")
const pickCategoryIndex = categoryPicker.indexOf("t('generate.words.pickCategory')")
assert(
  typeOwnIndex >= 0
    && pickCategoryIndex > typeOwnIndex
    && !categoryPicker.includes('Type Your Own')
    && !categoryPicker.includes('Pick a Category')
    && !categoryPicker.includes('Choose a Category'),
  'Add Words first-choice buttons must use translated Type Your Own / Pick a Category keys in order.',
)

assert(
  categoryPicker.includes('words-choice-button')
    && !/glow\s+onClick=\{\(\)\s*=>\s*setMode\('picking'\)\}/.test(categoryPicker),
  'Add Words first-choice buttons must use equal neutral choice styling without the old green glow.',
)

assert(
  (wordsStep.includes('>Back</button>') || />\s*Back\s*<\/button>/.test(wordsStep))
    && !wordsStep.includes('Back to Categories'),
  'Manual word entry back button must use the shorter "Back" label.',
)

assert(
  wordsStep.includes('words-back-button')
    && /\.words-back-button\s*\{[\s\S]*width:\s*fit-content[\s\S]*margin-inline:\s*auto/.test(glassCss),
  'Manual word entry back control must use a visible centered neutral button style.',
)

assert(
  !premiumQuickModePanel.includes('Sparkles')
    && /className="premium-quick-button"[\s\S]*\{\s*t\(option\.labelKey\)\s*\}/.test(premiumQuickModePanel)
    && !/className="premium-quick-button"[\s\S]*<[^>]*Icon|className="premium-quick-button"[\s\S]*<Sparkles/.test(premiumQuickModePanel),
  'Premium quick mode buttons must render label-only controls without sparkle or star icons.',
)

assert(
  categoryPicker.includes('className="word-count-slider"')
    && categoryPicker.includes('word-count-slider-endpoints')
    && categoryPicker.includes('<span>1</span>')
    && categoryPicker.includes('<span>Max 20</span>')
    && /min=\{1\}[\s\S]*max=\{20\}/.test(categoryPicker),
  'Category picker slider must keep range 1-20 and display visible endpoint labels.',
)

assert(
  glassCss.includes('.word-count-slider')
    && glassCss.includes('.word-count-slider-endpoints')
    && glassCss.includes('::-webkit-slider-thumb')
    && glassCss.includes('::-moz-range-thumb'),
  'Category picker slider must have prominent shared track and thumb styling.',
)

assert(
  glassCss.includes('--premium-quick-main-width')
    && /\.premium-quick-primary\s*\{[\s\S]*width:\s*min\(100%,\s*var\(--premium-quick-main-width\)\)/.test(glassCss)
    && /\.premium-customize-button\s*\{[\s\S]*width:\s*min\(100%,\s*var\(--premium-quick-main-width\)\)/.test(glassCss),
  'Premium Quick Generate and Customize must share a centered max-width token.',
)

assert(
  /--premium-quick-main-width:\s*240px/.test(glassCss)
    && /\.premium-quick-grid\s*\{[\s\S]*repeat\(auto-fit,\s*minmax\(120px,\s*1fr\)\)/.test(glassCss)
    && /\.skin-glassy \.gen-orb\s*\{[\s\S]*width:\s*124px[\s\S]*height:\s*124px/.test(glassCss)
    && /\.premium-summary-orb\s*\{[\s\S]*max-width:\s*180px/.test(glassCss)
    && /\.premium-selector-grid\s*\{[\s\S]*minmax\(160px,\s*192px\)/.test(glassCss)
    && /\.premium-option-helper\s*\{[\s\S]*-webkit-line-clamp:\s*2/.test(glassCss),
  'German-safe Premium layout fixes must stay in place.',
)

assert(
  glassInput.includes('break-words')
    && glassInput.includes('[hyphens:auto]')
    && !glassInput.includes('break-all'),
  'GlassInput locked word chips must use German-safe word wrapping.',
)

assert(
  containsCall(generateGo, 't', 'generateGo.chooseLanguageOrbit')
    && containsCall(generateGo, 't', 'generateGo.selectVisualContext')
    && containsCall(generateGo, 't', 'generateGo.auralAtmosphere')
    && generateGo.includes('productLaneLabel(productLane)')
    && !generateGo.includes('Choose Language Orbit')
    && !generateGo.includes('Select Visual Context')
    && !generateGo.includes('Aural Atmosphere'),
  'GenerateGO scaffold must render translated user-visible labels.',
)

assert(
  premiumQuickModePanel.includes('useTranslation')
    && containsCall(premiumQuickModePanel, 't', 'generate.quickGenerate')
    && containsCall(premiumQuickModePanel, 't', 'generate.customize')
    && !premiumQuickModePanel.includes('>Quick Generate<')
    && !premiumQuickModePanel.includes('>Customize<'),
  'Premium quick mode panel must render translated controls.',
)

assert(
  premiumCustomizeStep.includes('useTranslation')
    && containsCall(premiumCustomizeStep, 't', 'premium.customize.title')
    && containsCall(premiumCustomizeStep, 't', 'premium.meaning.title')
    && containsCall(premiumCustomizeStep, 't', 'premium.presentation.title')
    && containsCall(premiumCustomizeStep, 't', 'premium.artStyle.title')
    && !premiumCustomizeStep.includes('Premium Card Customize')
    && !premiumCustomizeStep.includes('Meaning Strategy')
    && !premiumCustomizeStep.includes('Presentation Form')
    && !premiumCustomizeStep.includes('Art Style'),
  'Premium customize step must render translated headings.',
)

assert(
  containsCall(categoryPicker, 't', 'generate.quickGenerate')
    && containsCall(categoryPicker, 't', 'generate.customize')
    && /label=\{\s*t\(option\.labelKey\)\s*\}/.test(categoryPicker)
    && !/label="Quick Generate"|label="Customize"|label=\{option\.label\}/.test(categoryPicker),
  'Premium quick choices in CategoryPicker must render translated labels.',
)

assert(
  !/>\s*Quick Generate\s*</.test(categoryPicker)
    && !/>\s*Customize\s*</.test(categoryPicker),
  'CategoryPicker quick/customize controls must not render hardcoded English labels.',
)

assert(
  /\.generate-selection-summary\s*\{[\s\S]*margin-top:\s*clamp\(22px,\s*3\.5vw,\s*36px\)/.test(glassCss)
    && glassCss.includes('scroll-margin-top: calc(var(--glassy-header-offset, 0px) + 18px)'),
  'Generate selection summary chips must keep consistent breathing room below the header.',
)

assert(
  generatePg.includes('window.scrollTo({ top: 0')
    && generateGo.includes('generate-selection-summary')
    && generateGo.includes('summaryTarget && summaryTarget.childElementCount > 0'),
  'Generate step navigation must keep the shared selection summary visible below the header.',
)

console.log('Generate responsive layout source checks passed.')
