// Script Lab registry — the one place that knows which writing systems exist.
//
// Entries are lightweight metadata safe to import from anywhere (tiles, nav,
// dashboards); the full symbol inventory loads lazily with the /alphabet page
// chunk via load(), mirroring the routeImports pattern.
//
// To add a writing system (russian-cyrillic, arabic-abjad, japanese-hiragana…):
//   1. Author src/data/scripts/<name>.ts exporting a ScriptDefinition default.
//   2. Append an entry here with the canonical language value from lib/languages.ts.
//   3. Run `npm run test:script-lab` — the integrity suite validates every
//      registered script automatically.
// No UI changes are needed; see docs/Product/FABLE_SCRIPT_LAB_ARCHITECTURE.md.

import type { ScriptDefinition, ScriptKind } from './types'

export type ScriptRegistryEntry = {
  id: string
  /** Canonical language value, e.g. 'Korean' — matches lib/languages.ts and
   * LanguageContext.activeLanguage. */
  language: string
  /** ISO code, e.g. 'ko'. */
  languageCode: string
  kind: ScriptKind
  /** Native script name, e.g. '한글'. */
  nativeName: string
  /** Learner-facing script name, e.g. 'Hangul'. */
  displayName: string
  /** Character rendered on tiles/cards as the script's emblem. */
  emblem: string
  load: () => Promise<{ default: ScriptDefinition }>
}

export const SCRIPTS: ScriptRegistryEntry[] = [
  {
    id: 'korean-hangul',
    language: 'Korean',
    languageCode: 'ko',
    kind: 'alphabet',
    nativeName: '한글',
    displayName: 'Hangul',
    emblem: '한',
    load: () => import('@/data/scripts/koreanHangul'),
  },
]

export function getScriptEntry(scriptId: string | null | undefined): ScriptRegistryEntry | undefined {
  if (!scriptId) return undefined
  return SCRIPTS.find((entry) => entry.id === scriptId)
}

/** Scripts registered for a canonical language value (e.g. 'Korean'). */
export function getScriptsForLanguage(language: string | null | undefined): ScriptRegistryEntry[] {
  if (!language) return []
  return SCRIPTS.filter((entry) => entry.language === language)
}
