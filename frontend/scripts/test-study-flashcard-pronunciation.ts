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
  source,
  /import\s+\{[\s\S]*ChevronLeft[\s\S]*ChevronRight[\s\S]*\}\s+from\s+['"]lucide-react['"]/,
  'StudyFlashcard should import neutral previous/skip icons',
)

assert.match(
  source,
  /handleRemembered,\s*handleReviewLater,\s*restart,\s*skipPrev,\s*skipNext,/,
  'StudyFlashcard should expose neutral session navigation actions',
)

assert.match(
  source,
  /aria-label="Previous card"[\s\S]*?onClick=\{skipPrev\}/,
  'StudyFlashcard should render a previous-card button that does not grade the card',
)

assert.match(
  source,
  /aria-label="Skip card"[\s\S]*?onClick=\{skipNext\}/,
  'StudyFlashcard should render a skip-card button that does not grade the card',
)

assert.match(
  studyUiSource,
  /tag === 'BUTTON'/,
  'global study keyboard shortcuts should ignore focused buttons so pronunciation controls do not reveal or grade cards',
)

assert.match(
  studyUiSource,
  /findNextUnvisitedIndex[\s\S]*?visitedIdsRef\.current\.has\(words\[idx\]\.id\)/,
  'neutral skips should let ungraded cards return later in the session before completion',
)

assert.doesNotMatch(
  source,
  /sessionComplete\s*\|\|\s*!revealed/,
  'flashcard keyboard grading should work before the answer is revealed',
)

assert.doesNotMatch(
  source,
  /\{revealed && \(\s*<motion\.div[\s\S]*?aria-label="Review Later"/,
  'flashcard review-later control should not be gated by the reveal state',
)

assert.doesNotMatch(
  source,
  /\{revealed && \(\s*<motion\.div[\s\S]*?aria-label="Remembered"/,
  'flashcard remembered control should not be gated by the reveal state',
)

assert.doesNotMatch(
  source,
  /<span[^>]*>\{t\('study\.(reviewLater|rememberedAction)'\)\}<\/span>/,
  'flashcard grading controls should stay icon-only on mobile and desktop',
)

console.log('study flashcard pronunciation wiring checks passed')
