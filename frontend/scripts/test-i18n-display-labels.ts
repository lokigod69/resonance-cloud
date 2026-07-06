import { createT } from '../src/lib/translations'
import { getDeckLanguageLabel, getDeckStatusLabel } from '../src/lib/i18nDisplay'

function assertEqual(actual: string, expected: string, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected "${expected}", got "${actual}"`)
  }
}

const tEn = createT('en')
const tDe = createT('de')
const tFr = createT('fr')

assertEqual(tEn('generate.words.addTitle'), 'Add your words', 'EN words title')
assertEqual(tDe('generate.words.addTitle'), 'Wörter hinzufügen', 'DE words title')
assertEqual(tFr('generate.words.addTitle'), 'Ajouter tes mots', 'FR words title')

assertEqual(getDeckStatusLabel('draft', tDe), 'Entwurf', 'DE draft status')
assertEqual(getDeckStatusLabel('generating', tDe), 'Wird erstellt', 'DE generating status')
assertEqual(getDeckStatusLabel('pending', tDe), 'Wartet', 'DE pending status')
assertEqual(getDeckStatusLabel('complete', tDe), 'Fertig', 'DE complete status')
assertEqual(getDeckStatusLabel('partial', tDe), 'Teilweise fertig', 'DE partial status')
assertEqual(getDeckStatusLabel('failed', tDe), 'Fehler', 'DE failed status')
assertEqual(getDeckStatusLabel('cancelled', tDe), 'Abgebrochen', 'DE cancelled status')
assertEqual(getDeckStatusLabel('custom_status', tDe), 'custom_status', 'Unknown status fallback')

assertEqual(getDeckLanguageLabel('English', tDe), 'Englisch', 'DE English language label')
assertEqual(getDeckLanguageLabel('German', tDe), 'Deutsch', 'DE German language label')
assertEqual(getDeckLanguageLabel('Korean', tDe), 'Koreanisch', 'DE Korean language label')
assertEqual(getDeckLanguageLabel('Italian', tDe), 'Italienisch', 'DE Italian language label')
assertEqual(getDeckLanguageLabel('MadeUp', tDe), 'MadeUp', 'Unknown language fallback')

console.log('i18n display label checks passed')
