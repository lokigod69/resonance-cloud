import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sourcePath = resolve(process.cwd(), 'src/pages/StudyFlashcard.tsx')
const source = readFileSync(sourcePath, 'utf8')
const studyUiSource = readFileSync(resolve(process.cwd(), 'src/hooks/useStudyUI.ts'), 'utf8')

assert.match(
  source,
  /import\s+\{\s*usePronunciation\s*\}\s+from\s+['"]@\/hooks\/usePronunciation['"]/,
  'StudyFlashcard should use the shared pronunciation playback hook',
)

assert.match(
  source,
  /const\s+\{\s*playWord\s*\}\s*=\s*usePronunciation\(\)/,
  'StudyFlashcard should expose playWord from usePronunciation',
)

assert.match(
  source,
  /<button[\s\S]*?aria-label=\{`Play pronunciation for \$\{current\.word\}`\}[\s\S]*?onClick=\{\(\)\s*=>\s*\{\s*void playWord\(current\)\s*\}\}/,
  'the visible study word should be an accessible button that plays the current word',
)

assert.match(
  source,
  /<button[\s\S]*?<h2[\s\S]*?>\{current\.word\}<\/h2>[\s\S]*?<\/button>/,
  'the word heading should remain visible inside the pronunciation button',
)

assert.match(
  studyUiSource,
  /tag === 'BUTTON'/,
  'global study keyboard shortcuts should ignore focused buttons so pronunciation controls do not reveal or grade cards',
)

console.log('study flashcard pronunciation wiring checks passed')
