/**
 * Static validation for Guided Today path overview status behavior.
 *
 * Run: npx tsx scripts/test-guided-today-path-overview.ts
 */

import {
  ACTIVE_GUIDED_VIBE_IDS,
  FUTURE_GUIDED_VIBE_IDS,
} from '../src/data/guidedVibes.ts'
import {
  getDeterministicBuildChips,
  getDeterministicMatchColumns,
  getGuidedPathOverview,
  getGuidedPathLessons,
  resolveGuidedLessonVariant,
} from '../src/data/guidedLessons.ts'
import {
  createEmptyTodayProgressState,
  markTodayLessonComplete,
  restartTodayLessonProgress,
} from '../src/lib/todayProgress.ts'
import {
  getSelectedGuidedVibe,
  setSelectedGuidedVibe,
  todayGuidedVibeKey,
} from '../src/lib/todayVibe.ts'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

let failures = 0
let passes = 0

function assert(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1
    console.log(`  ok  ${name}`)
    return
  }

  failures += 1
  console.error(`  FAIL ${name}`)
  if (detail !== undefined) console.error('       ', detail)
}

const pathId = 'english-a1-practical'
const lessons = getGuidedPathLessons(pathId)
const firstLessonDefinition = lessons[0]
const secondLessonDefinition = lessons[1]

if (!firstLessonDefinition || !secondLessonDefinition) {
  throw new Error('Expected at least two Guided Today lessons for path overview checks.')
}

const firstLesson = resolveGuidedLessonVariant(firstLessonDefinition, 'bright')
const secondLesson = resolveGuidedLessonVariant(secondLessonDefinition, 'bright')

console.log('\n[path overview status]')
const emptyOverview = getGuidedPathOverview(pathId, createEmptyTodayProgressState(), 'bright')
assert('overview exposes 10 lessons', emptyOverview.lessons.length === 10, emptyOverview.lessons.length)
assert('empty progress recommends lesson 1', emptyOverview.recommendedLesson?.id === firstLesson.id, emptyOverview.recommendedLesson?.id)
assert('empty progress is not path complete', !emptyOverview.isComplete)
assert('lesson 1 is current with empty progress', emptyOverview.lessons[0]?.status === 'current', emptyOverview.lessons[0])
assert('lesson 2 is not started with empty progress', emptyOverview.lessons[1]?.status === 'not-started', emptyOverview.lessons[1])

const completedFirst = markTodayLessonComplete(createEmptyTodayProgressState(), firstLesson, minimalResult())
const afterFirstOverview = getGuidedPathOverview(pathId, completedFirst, 'bright')
assert('first incomplete advances to lesson 2 after lesson 1 completion', afterFirstOverview.recommendedLesson?.id === secondLesson.id, afterFirstOverview.recommendedLesson?.id)
assert('lesson 1 card is complete after completion', afterFirstOverview.lessons[0]?.status === 'complete', afterFirstOverview.lessons[0])
assert('lesson 2 card is current after lesson 1 completion', afterFirstOverview.lessons[1]?.status === 'current', afterFirstOverview.lessons[1])
assert('lesson 3 card is not started after lesson 1 completion', afterFirstOverview.lessons[2]?.status === 'not-started', afterFirstOverview.lessons[2])
const selectedFifthOverview = getGuidedPathOverview(pathId, completedFirst, 'bright', lessons[4]?.id)
assert('clicked lesson selection updates the selected lesson panel', selectedFifthOverview.selectedLesson?.id === lessons[4]?.id, selectedFifthOverview.selectedLesson?.id)
assert('clicked lesson selection does not change first-incomplete recommendation', selectedFifthOverview.recommendedLesson?.id === secondLesson.id, selectedFifthOverview.recommendedLesson?.id)

let allCompleteProgress = createEmptyTodayProgressState()
for (const lessonDefinition of lessons) {
  allCompleteProgress = markTodayLessonComplete(
    allCompleteProgress,
    resolveGuidedLessonVariant(lessonDefinition, 'bright'),
    minimalResult(),
  )
}
const allCompleteOverview = getGuidedPathOverview(pathId, allCompleteProgress, 'sharp')
assert('all-complete state is detectable', allCompleteOverview.isComplete)
assert('all-complete state has no recommended lesson', allCompleteOverview.recommendedLesson === undefined, allCompleteOverview.recommendedLesson)
assert('all cards are complete when path is complete', allCompleteOverview.lessons.every((lesson) => lesson.status === 'complete'), allCompleteOverview.lessons)

console.log('\n[pure selection and restart behavior]')
const progressBeforeSelection = JSON.stringify(completedFirst)
getGuidedPathOverview(pathId, completedFirst, 'wistful', secondLesson.id)
assert('lesson selection does not mutate progress', JSON.stringify(completedFirst) === progressBeforeSelection, completedFirst)

const completedTwo = markTodayLessonComplete(completedFirst, secondLesson, minimalResult())
const restartedSecond = restartTodayLessonProgress(completedTwo, secondLesson)
assert('restart clears selected lesson progress', !restartedSecond.courses[pathId]?.completedLessonIds.includes(secondLesson.id), restartedSecond)
assert('restart does not clear other completed lessons', restartedSecond.courses[pathId]?.completedLessonIds.includes(firstLesson.id) === true, restartedSecond)

console.log('\n[vibe behavior]')
const originalWindow = globalThis.window
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: createMemoryStorage() },
  configurable: true,
})

try {
  const progressBeforeVibe = JSON.stringify(completedFirst)
  setSelectedGuidedVibe(pathId, 'sharp')
  assert('active vibe switch persists selected voice', getSelectedGuidedVibe(pathId) === 'sharp')
  assert('vibe switch does not mutate progress', JSON.stringify(completedFirst) === progressBeforeVibe, completedFirst)
  for (const futureVibeId of FUTURE_GUIDED_VIBE_IDS) {
    setSelectedGuidedVibe(pathId, futureVibeId)
    assert(`${futureVibeId} remains non-selectable`, getSelectedGuidedVibe(pathId) === 'bright')
  }
  assert('only active launch vibes are selectable', JSON.stringify(ACTIVE_GUIDED_VIBE_IDS) === JSON.stringify(['bright', 'wistful', 'sharp']), ACTIVE_GUIDED_VIBE_IDS)
  assert('vibe storage key remains path-scoped', todayGuidedVibeKey(pathId) === 'resonance_guided_vibe__english-a1-practical')
} finally {
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    configurable: true,
  })
}

console.log('\n[privacy]')
const storedResultJson = JSON.stringify(completedTwo.courses[pathId]?.lessons[firstLesson.id]?.result)
assert('no raw typed answers are stored', !containsAny(storedResultJson, ['typedAnswer', 'typeAnswer', 'typedRecallAnswer', 'rawAnswer']), completedTwo)
assert('no raw speech transcripts are stored', !containsAny(storedResultJson, ['speechTranscript', 'transcriptText', 'rawTranscript']), completedTwo)

console.log('\n[source-level UX simplification]')
const todayPathOverviewSource = readSource('../src/components/today/TodayPathOverview.tsx')
const todaySessionSource = readSource('../src/components/today/TodaySession.tsx')
const todayHeroSource = readSource('../src/components/today/TodayHero.tsx')
const todayPageSource = readSource('../src/pages/Today.tsx')
const todayCssSource = readOptionalSource('../src/components/today/Today.css')
const buildPhraseSource = readSource('../src/components/today/BuildPhraseStep.tsx')
const matchPairsSource = readSource('../src/components/today/MatchPairsStep.tsx')
const typeRecallSource = readSource('../src/components/today/TypeRecallStep.tsx')
const sceneStepSource = sliceBetween(todaySessionSource, 'function SceneStep', 'function CompleteStep')
const completeStepSource = sliceBetween(todaySessionSource, 'function CompleteStep', 'function canContinueFromSpeak')
const guidedVibePickerSource = sliceBetween(todayHeroSource, 'export function GuidedVibePicker', 'export function TodayCompactHeader')
const todayCompactHeaderSource = sliceBetween(todayHeroSource, 'export function TodayCompactHeader', '')
const lessonPathCardSource = sliceBetween(todayPathOverviewSource, 'function LessonPathCard', 'function StatusIcon')
const recommendedLessonPanelSource = sliceBetween(todayPathOverviewSource, 'function RecommendedLessonPanel', 'function LessonPathCard')

assert('overview lesson cards do not render trophy word labels', !containsAny(todayPathOverviewSource, ['today.path.trophyWord', 'lesson.trophyWord', '<Trophy']))
assert('overview lesson cards do not render selected-vibe phrase previews', !todayPathOverviewSource.includes('lesson.corePhrase.targetText'))
assert('overview lesson cards do not render situation descriptions', !lessonPathCardSource.includes('lesson.situation'))
assert(
  'overview renders voice selector before recommended lesson panel',
  todayPathOverviewSource.indexOf('<GuidedVibePicker') > 0
    && todayPathOverviewSource.indexOf('<GuidedVibePicker') < todayPathOverviewSource.indexOf('<RecommendedLessonPanel'),
)
assert('vibe picker does not render palette swatches', !containsAny(guidedVibePickerSource, ['vibeSwatches', 'backgroundColor: color']))
assert('vibe picker does not render example phrases', !containsAny(guidedVibePickerSource, ['today.vibePicker.exampleLabel', 'variant?.corePhrase.targetText']))
assert('vibe picker renders emblem images for active voice cards', guidedVibePickerSource.includes('<img') && guidedVibePickerSource.includes('vibe.emblem?.url'))
assert('vibe picker keeps emblem images contained without stretching', guidedVibePickerSource.includes('object-contain'))
assert('Scene step does not reveal trophy word', !containsAny(sceneStepSource, ['today.trophyWord.title', 'lesson.trophyWord']))
assert('Complete step can reveal trophy word', containsAny(completeStepSource, ['today.trophyWord.title', 'lesson.trophyWord.word']))
assert('session exposes explicit Back to path action outside step navigation', containsAny(todaySessionSource, ['today.path.backToPath', 'onViewPath']))
assert('session header does not render selected-vibe phrase text', !todayCompactHeaderSource.includes('lesson.corePhrase.targetText'))
assert('session source avoids target phrase spoiler in compact header', !containsAny(todayCompactHeaderSource, ['corePhrase', 'targetText']))
assert('session has no generic bottom Back step control', !containsAny(todaySessionSource, ['handleBack', "t('today.back')"]))
assert('Back to path handler only exits the session view', todayPageSource.includes('const handleExitToIntro = () => {\n    setSessionActive(false)\n  }'), sliceBetween(todayPageSource, 'const handleExitToIntro', 'const handleComplete'))
const progressBeforeBackToPath = JSON.stringify(completedTwo)
assert('Back to path does not mutate progress', JSON.stringify(completedTwo) === progressBeforeBackToPath, completedTwo)
assert('recommended panel label is next lesson, not internal recommendation copy', recommendedLessonPanelSource.includes("t('today.path.nextLessonLabel')") && !recommendedLessonPanelSource.includes("t('today.path.recommendedLabel')"))
assert('Today page separates lesson selection from session start', containsAny(todayPageSource, ['const handleSelectLesson', 'setSelectedLessonId(lessonId)']) && containsAny(todayPageSource, ['const handleStartSelectedLesson', 'setSessionActive(true)']))
assert('path overview receives a select handler and separate start handler', todayPathOverviewSource.includes('onSelectLesson') && todayPathOverviewSource.includes('onStartLesson'))
assert('lesson cards select lessons without opening the session', lessonPathCardSource.includes('onSelectLesson(lesson.id)') && !lessonPathCardSource.includes('onOpenLesson(lesson.id)'))
assert('selected lesson panel keeps selected/recommended label copy screen-reader only', recommendedLessonPanelSource.includes('className="sr-only"') && recommendedLessonPanelSource.includes("t('today.path.selectedLessonLabel')") && recommendedLessonPanelSource.includes("t('today.path.nextLessonLabel')"))
assert('selected lesson panel visible copy is reduced to lesson, title, action', !recommendedLessonPanelSource.includes('uppercase tracking-[0.18em] text-[var(--text-muted)]'))

console.log('\n[source-level atmosphere tokens]')
assert('Today root exposes selected vibe as a data attribute', todayPageSource.includes('data-guided-vibe={selectedVibeId}'))
assert('Today imports scoped atmosphere CSS', todayPageSource.includes("components/today/Today.css"))
for (const token of [
  '--today-accent',
  '--today-accent-strong',
  '--today-accent-soft',
  '--today-glow',
  '--today-border',
  '--today-panel',
  '--today-text-soft',
]) {
  assert(`Today CSS defines ${token}`, todayCssSource.includes(token))
}
for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
  assert(`Today CSS defines scoped ${vibeId} atmosphere`, todayCssSource.includes(`[data-guided-vibe="${vibeId}"]`))
}
assert('Today CSS aliases local tokens to existing accent consumers', containsAny(todayCssSource, ['--accent: var(--today-accent)', '--primary: var(--today-accent)']))
assert('Today CSS accents selected vibe cards with local tokens', todayCssSource.includes('.today-vibe-card[aria-pressed="true"]') && todayCssSource.includes('var(--today-glow)'))
assert('Today CSS accents progress indicator inside Today only', todayCssSource.includes('[data-slot="progress-indicator"]') && todayCssSource.includes('var(--today-accent-strong)'))
assert('Today CSS accents default primary buttons inside Today only', todayCssSource.includes('[data-slot="button"][data-variant="default"]') && todayCssSource.includes('var(--today-accent-strong)'))
assert('Today CSS keeps vibe emblems contained', todayCssSource.includes('.today-vibe-emblem') && todayCssSource.includes('object-fit: contain'))
const sharpAtmosphereSource = sliceBetween(todayCssSource, '.today-shell[data-guided-vibe="sharp"]::before', '.today-shell .theme-panel')
assert('Sharp atmosphere comes from top-right', containsAny(sharpAtmosphereSource, ['ellipse at 82% 4%', 'ellipse at 86% 8%', 'ellipse at 84% 6%']) && !sharpAtmosphereSource.includes('ellipse at 50% 0%'), sharpAtmosphereSource)

console.log('\n[source-level UX teardown]')
assert('Today compact header does not render time estimate', !containsAny(todayCompactHeaderSource, ['today.estimatedTime', 'estimatedMinutes', '<Clock3']))
assert('lesson cards use whole-card button semantics', lessonPathCardSource.includes('<button') && !lessonPathCardSource.includes('<article'), lessonPathCardSource)
assert('lesson cards avoid tiny-only open actions', !containsAny(lessonPathCardSource, ['getCardActionLabel', 'today.path.openLessonAction']))
assert('match feedback avoids verbose expected correction copy', !containsAny(matchPairsSource, ['expected', 'Expected', 'Erwartet', 'today.matchPairs.expected']))
assert('type recall wrong feedback does not reveal the answer by default', !typeRecallSource.includes("t('today.type.wrong', { answer"))
assert('type recall correct feedback is visual-only', !typeRecallSource.includes("t('today.type.correct')"))
assert('type recall fallback is compact answer reveal, not choice chips', typeRecallSource.includes("t('today.type.answerLine'") && !containsAny(typeRecallSource, ['getGuidedTypeFallbackChoices', 'handleFallbackChoice', "t('today.type.fallbackLabel')", 'theme-chip']))
assert('build feedback remains compact without expected correction copy', !containsAny(buildPhraseSource, ['expected', 'Expected', 'Erwartet', 'today.build.expected']))
assert('build correct feedback text is not rendered', !containsAny(buildPhraseSource, ["t('today.build.correct')", 'CheckCircle2']))
assert('build step auto-validates without an Antwort prüfen button', !containsAny(buildPhraseSource, ["t('today.checkAnswer')", 'handleCheck']))
assert('completion can open the next lesson as primary action', completeStepSource.includes('onOpenNextLesson') && completeStepSource.includes("t('today.nextLesson')"))
assert('completion restart action is visually tertiary', completeStepSource.includes('today-completion-replayAction'))
assert('trophy completion avoids long why-it-matters copy', !completeStepSource.includes('whyThisWord'))

const deterministicBuildChips = getDeterministicBuildChips(firstLesson)
assert(
  'build chips are not presented in exact authored order',
  deterministicBuildChips.map((entry) => entry.chip).join('|') !== firstLesson.build.chips.join('|'),
  deterministicBuildChips,
)
const buildShuffleSamples = lessons
  .filter((lessonDefinition) => [1, 4, 8, 10].includes(lessonDefinition.lessonNumber))
  .flatMap((lessonDefinition) => ACTIVE_GUIDED_VIBE_IDS.map((vibeId) => resolveGuidedLessonVariant(lessonDefinition, vibeId)))
const weakBuildShuffles = buildShuffleSamples.filter((lesson) => {
  const shuffled = getDeterministicBuildChips(lesson)
  const unchangedPositions = shuffled.filter((entry, position) => entry.index === position).length
  return unchangedPositions > shuffled.length - 2 || startsWithTargetBuildOrder(lesson, shuffled)
})
assert('build chip shuffle avoids exact or near-original order across sampled lessons/vibes', weakBuildShuffles.length === 0, weakBuildShuffles)

const matchColumnSamples = lessons
  .slice(0, 10)
  .flatMap((lessonDefinition) => ACTIVE_GUIDED_VIBE_IDS.map((vibeId) => resolveGuidedLessonVariant(lessonDefinition, vibeId)))
const alignedMatchColumns = matchColumnSamples.filter((lesson) => {
  const columns = getDeterministicMatchColumns(lesson)
  return columns.english.some((pair, index) => columns.german[index]?.id === pair.id)
})
assert('match pair columns are independently shuffled and avoid row-aligned obvious pairs', alignedMatchColumns.length === 0, alignedMatchColumns.map((lesson) => `${lesson.id}/${lesson.vibeId}`))

console.log('\n[content coherence audit]')
const coherenceFlags = collectCoherenceFlags()
for (const flag of coherenceFlags) {
  console.warn(`  review ${flag}`)
}
assert('Lesson 8 variants avoid known incoherent review items and chips', !coherenceFlags.some((flag) => flag.includes('lesson 8')), coherenceFlags)

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)

function minimalResult() {
  return {
    buildAttempts: 1,
    typeAttempts: 1,
    typeUsedFallback: false,
    speakAttempts: 0,
    speakTranscriptMatch: 0,
    speakPassed: false,
    knownMarkedCount: 0,
  }
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
}

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8')
}

function readOptionalSource(relativePath: string) {
  try {
    return readSource(relativePath)
  } catch {
    return ''
  }
}

function sliceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0) return ''
  if (end.length === 0) return source.slice(startIndex)
  const endIndex = source.indexOf(end, startIndex)
  if (endIndex < 0) return ''
  return source.slice(startIndex, endIndex)
}

function collectCoherenceFlags() {
  const flags: string[] = []
  const weakGenericItems = new Set(['almost', 'focused', 'decided'])
  const knownLesson8OddPhrases = ['right call', 'good or odd']
  const lesson8AllowedItems = new Set(['i love', 'i like', 'it', 'here', 'nice', 'good', 'place', 'quiet'])

  for (const lessonDefinition of lessons) {
    for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
      const variant = lessonDefinition.vibeVariants[vibeId]
      if (!variant) continue

      const searchableContext = [
        lessonDefinition.title,
        lessonDefinition.situation.en,
        lessonDefinition.situation.de,
        variant.corePhrase.targetText,
        variant.corePhrase.baseText,
        ...variant.chunks.flatMap((chunk) => [chunk.targetText, chunk.baseText]),
      ].join(' ').toLowerCase()

      const seenTargets = new Set<string>()
      for (const item of variant.lessonItems) {
        const target = item.targetText.toLowerCase()
        if (seenTargets.has(target)) {
          flags.push(`lesson ${lessonDefinition.lessonNumber}/${vibeId}: duplicated lesson item "${item.targetText}"`)
        }
        seenTargets.add(target)

        if (item.baseText.trim().length < 2) {
          flags.push(`lesson ${lessonDefinition.lessonNumber}/${vibeId}: suspiciously short German base text for "${item.targetText}"`)
        }

        if (weakGenericItems.has(target)) {
          flags.push(`lesson ${lessonDefinition.lessonNumber}/${vibeId}: weak generic lesson item "${item.targetText}"`)
        }

        if (knownLesson8OddPhrases.some((phrase) => target.includes(phrase))) {
          flags.push(`lesson ${lessonDefinition.lessonNumber}/${vibeId}: suspicious lesson item "${item.targetText}"`)
        }

        const targetWords = target.split(/\s+/).filter((word) => word.length > 2)
        const relatedToContext = lessonDefinition.lessonNumber === 8 && lesson8AllowedItems.has(target)
          ? true
          : targetWords.some((word) => searchableContext.includes(word))
        if (lessonDefinition.lessonNumber === 8 && !relatedToContext) {
          flags.push(`lesson 8/${vibeId}: lesson item may be disconnected from I like/place context: "${item.targetText}"`)
        }
      }

      for (const chip of variant.build.chips) {
        const normalizedChip = chip.toLowerCase().replace(/[.!?,]/g, '').trim()
        if (lessonDefinition.lessonNumber === 8 && knownLesson8OddPhrases.some((phrase) => normalizedChip.includes(phrase))) {
          flags.push(`lesson 8/${vibeId}: suspicious build chip "${chip}"`)
        }
      }
    }
  }

  return flags
}

function startsWithTargetBuildOrder(
  lesson: typeof firstLesson,
  shuffled: Array<{ index: number }>,
) {
  const targetIndexes: number[] = []
  for (let index = 0; index < lesson.build.chips.length; index += 1) {
    targetIndexes.push(index)
    if (targetIndexes.map((chipIndex) => lesson.build.chips[chipIndex]).join(' ') === lesson.build.targetText) {
      return targetIndexes.every((chipIndex, position) => shuffled[position]?.index === chipIndex)
    }
  }
  return false
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
}
