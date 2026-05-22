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
  source,
  /type\s+FeedbackPulse\s*=\s*'remembered'\s*\|\s*'reviewLater'/,
  'StudyFlashcard should model red/green grading feedback explicitly',
)

assert.match(
  source,
  /const\s+\[feedbackPulse,\s*setFeedbackPulse\]\s*=\s*useState<FeedbackPulse\s*\|\s*null>\(null\)/,
  'StudyFlashcard should keep transient grading feedback in local state',
)

assert.match(
  source,
  /handleFeedbackReviewLater[\s\S]*?playFeedbackAndAdvance\('reviewLater',\s*handleReviewLater\)/,
  'review-later grading should trigger the red feedback pulse before advancing',
)

assert.match(
  source,
  /handleFeedbackRemembered[\s\S]*?playFeedbackAndAdvance\('remembered',\s*handleRemembered\)/,
  'remembered grading should trigger the green feedback pulse before advancing',
)

assert.match(
  source,
  /<AnimatePresence>\s*\{feedbackPulse && \(/,
  'StudyFlashcard should render an animated feedback overlay when grading',
)

assert.match(
  source,
  /boxShadow:[\s\S]*?feedbackPulse === 'remembered'[\s\S]*?rgba\(34, 197, 94, 0\.35\)[\s\S]*?rgba\(239, 68, 68, 0\.35\)/,
  'StudyFlashcard should render distinct subtle green and red glow outlines',
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
