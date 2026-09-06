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
  getGuidedTodayPathOptions,
  getGuidedPathOverview,
  getGuidedPathLessons,
  loadAllGuidedLessons,
  resolveGuidedBaseContent,
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
import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

await loadAllGuidedLessons()

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

const pathOneId = 'english-a1-practical-1'
const pathTwoId = 'english-a1-practical-2'
const pathThreeId = 'english-a1-practical-3'
const pathFourId = 'english-a1-practical-4'
const pathFiveId = 'english-a1-practical-5'
const pathSixId = 'english-a1-practical-6'
const pathSevenId = 'english-a1-practical-7'
const pathEightId = 'english-a1-practical-8'
const pathNineId = 'english-a1-practical-9'
const pathTenId = 'english-a1-practical-10'
const lessons = getGuidedPathLessons(pathOneId)
const pathTwoLessons = getGuidedPathLessons(pathTwoId)
const pathThreeLessons = getGuidedPathLessons(pathThreeId)
const pathFourLessons = getGuidedPathLessons(pathFourId)
const pathFiveLessons = getGuidedPathLessons(pathFiveId)
const pathSixLessons = getGuidedPathLessons(pathSixId)
const pathSevenLessons = getGuidedPathLessons(pathSevenId)
const pathEightLessons = getGuidedPathLessons(pathEightId)
const pathNineLessons = getGuidedPathLessons(pathNineId)
const pathTenLessons = getGuidedPathLessons(pathTenId)
const firstLessonDefinition = lessons[0]
const secondLessonDefinition = lessons[1]

if (!firstLessonDefinition || !secondLessonDefinition) {
  throw new Error('Expected at least two Guided Today lessons for path overview checks.')
}

const firstLesson = resolveGuidedLessonVariant(firstLessonDefinition, 'bright')
const secondLesson = resolveGuidedLessonVariant(secondLessonDefinition, 'bright')

console.log('\n[path overview status]')
const emptyOverview = getGuidedPathOverview(pathOneId, createEmptyTodayProgressState(), 'bright')
assert('A1 Practical 1 overview exposes 10 lessons', emptyOverview.lessons.length === 10, emptyOverview.lessons.length)
const emptyPathTwoOverview = getGuidedPathOverview(pathTwoId, createEmptyTodayProgressState(), 'sharp')
assert('A1 Practical 2 overview exposes 10 lessons', emptyPathTwoOverview.lessons.length === 10, emptyPathTwoOverview.lessons.length)
const emptyPathThreeOverview = getGuidedPathOverview(pathThreeId, createEmptyTodayProgressState(), 'wistful')
assert('A1 Practical 3 overview exposes 10 lessons', emptyPathThreeOverview.lessons.length === 10, emptyPathThreeOverview.lessons.length)
const emptyPathFourOverview = getGuidedPathOverview(pathFourId, createEmptyTodayProgressState(), 'bright')
assert('A1 Practical 4 overview exposes 10 lessons', emptyPathFourOverview.lessons.length === 10, emptyPathFourOverview.lessons.length)
const emptyPathFiveOverview = getGuidedPathOverview(pathFiveId, createEmptyTodayProgressState(), 'sharp')
assert('A1 Practical 5 overview exposes 10 lessons', emptyPathFiveOverview.lessons.length === 10, emptyPathFiveOverview.lessons.length)
const emptyPathSixOverview = getGuidedPathOverview(pathSixId, createEmptyTodayProgressState(), 'bright')
assert('A1 Practical 6 overview exposes 10 lessons', emptyPathSixOverview.lessons.length === 10, emptyPathSixOverview.lessons.length)
const emptyPathSevenOverview = getGuidedPathOverview(pathSevenId, createEmptyTodayProgressState(), 'wistful')
assert('A1 Practical 7 overview exposes 10 lessons', emptyPathSevenOverview.lessons.length === 10, emptyPathSevenOverview.lessons.length)
const emptyPathEightOverview = getGuidedPathOverview(pathEightId, createEmptyTodayProgressState(), 'bright')
assert('A1 Practical 8 overview exposes 10 lessons', emptyPathEightOverview.lessons.length === 10, emptyPathEightOverview.lessons.length)
const emptyPathNineOverview = getGuidedPathOverview(pathNineId, createEmptyTodayProgressState(), 'sharp')
assert('A1 Practical 9 overview exposes 10 lessons', emptyPathNineOverview.lessons.length === 10, emptyPathNineOverview.lessons.length)
const emptyPathTenOverview = getGuidedPathOverview(pathTenId, createEmptyTodayProgressState(), 'bright')
assert('A1 Practical 10 overview exposes 10 lessons', emptyPathTenOverview.lessons.length === 10, emptyPathTenOverview.lessons.length)
assert('empty progress recommends lesson 1', emptyOverview.recommendedLesson?.id === firstLesson.id, emptyOverview.recommendedLesson?.id)
assert('empty progress is not path complete', !emptyOverview.isComplete)
assert('lesson 1 is current with empty progress', emptyOverview.lessons[0]?.status === 'current', emptyOverview.lessons[0])
assert('lesson 2 is not started with empty progress', emptyOverview.lessons[1]?.status === 'not-started', emptyOverview.lessons[1])

const completedFirst = markTodayLessonComplete(createEmptyTodayProgressState(), firstLesson, minimalResult())
const afterFirstOverview = getGuidedPathOverview(pathOneId, completedFirst, 'bright')
assert('first incomplete advances to lesson 2 after lesson 1 completion', afterFirstOverview.recommendedLesson?.id === secondLesson.id, afterFirstOverview.recommendedLesson?.id)
assert('lesson 1 card is complete after completion', afterFirstOverview.lessons[0]?.status === 'complete', afterFirstOverview.lessons[0])
assert('lesson 1 card exposes completed Bright vibe badge data after Bright completion', JSON.stringify(afterFirstOverview.lessons[0]?.completedVibeIds) === JSON.stringify(['bright']), afterFirstOverview.lessons[0])
assert('lesson 2 card is current after lesson 1 completion', afterFirstOverview.lessons[1]?.status === 'current', afterFirstOverview.lessons[1])
assert('lesson 3 card is not started after lesson 1 completion', afterFirstOverview.lessons[2]?.status === 'not-started', afterFirstOverview.lessons[2])
const selectedFifthOverview = getGuidedPathOverview(pathOneId, completedFirst, 'bright', lessons[4]?.id)
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
const allCompleteOverview = getGuidedPathOverview(pathOneId, allCompleteProgress, 'sharp')
assert('all-complete state is detectable', allCompleteOverview.isComplete)
assert('all-complete state has no recommended lesson', allCompleteOverview.recommendedLesson === undefined, allCompleteOverview.recommendedLesson)
assert('all cards are complete when path is complete', allCompleteOverview.lessons.every((lesson) => lesson.status === 'complete'), allCompleteOverview.lessons)

console.log('\n[pure selection and restart behavior]')
const progressBeforeSelection = JSON.stringify(completedFirst)
getGuidedPathOverview(pathOneId, completedFirst, 'wistful', secondLesson.id)
assert('lesson selection does not mutate progress', JSON.stringify(completedFirst) === progressBeforeSelection, completedFirst)

const completedTwo = markTodayLessonComplete(completedFirst, secondLesson, minimalResult())
const restartedSecond = restartTodayLessonProgress(completedTwo, secondLesson)
assert('restart clears selected lesson progress', !restartedSecond.courses[pathOneId]?.completedLessonIds.includes(secondLesson.id), restartedSecond)
assert('restart does not clear other completed lessons', restartedSecond.courses[pathOneId]?.completedLessonIds.includes(firstLesson.id) === true, restartedSecond)
const completedFirstSharp = markTodayLessonComplete(completedFirst, resolveGuidedLessonVariant(firstLessonDefinition, 'sharp'), minimalResult())
const afterFirstSharpOverview = getGuidedPathOverview(pathOneId, completedFirstSharp, 'wistful')
assert('completing another vibe keeps one overall completed lesson', afterFirstSharpOverview.completedCount === 1, afterFirstSharpOverview)
assert('path card exposes multiple completed active vibe badges', JSON.stringify(afterFirstSharpOverview.lessons[0]?.completedVibeIds) === JSON.stringify(['bright', 'sharp']), afterFirstSharpOverview.lessons[0])
const pathTwoFirst = resolveGuidedLessonVariant(pathTwoLessons[0]!, 'bright')
const completedAcrossPaths = markTodayLessonComplete(completedFirst, pathTwoFirst, minimalResult())
assert('A1 Practical 1 count stays scoped after A1 Practical 2 completion', getGuidedPathOverview(pathOneId, completedAcrossPaths, 'bright').completedCount === 1, completedAcrossPaths)
assert('A1 Practical 2 count stays scoped after A1 Practical 1 completion', getGuidedPathOverview(pathTwoId, completedAcrossPaths, 'bright').completedCount === 1, completedAcrossPaths)
const pathThreeFirstDefinition = pathThreeLessons[0]
if (pathThreeFirstDefinition) {
  const pathThreeFirst = resolveGuidedLessonVariant(pathThreeFirstDefinition, 'sharp')
  const completedAcrossThreePaths = markTodayLessonComplete(completedAcrossPaths, pathThreeFirst, minimalResult())
  assert('A1 Practical 3 count stays scoped after earlier path completions', getGuidedPathOverview(pathThreeId, completedAcrossThreePaths, 'sharp').completedCount === 1, completedAcrossThreePaths)
  assert('earlier path counts stay scoped after A1 Practical 3 completion', getGuidedPathOverview(pathOneId, completedAcrossThreePaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathTwoId, completedAcrossThreePaths, 'bright').completedCount === 1, completedAcrossThreePaths)
  const pathFourFirstDefinition = pathFourLessons[0]
  if (pathFourFirstDefinition) {
    const pathFourFirst = resolveGuidedLessonVariant(pathFourFirstDefinition, 'bright')
    const completedAcrossFourPaths = markTodayLessonComplete(completedAcrossThreePaths, pathFourFirst, minimalResult())
    assert('A1 Practical 4 count stays scoped after earlier path completions', getGuidedPathOverview(pathFourId, completedAcrossFourPaths, 'bright').completedCount === 1, completedAcrossFourPaths)
    assert('earlier path counts stay scoped after A1 Practical 4 completion', getGuidedPathOverview(pathOneId, completedAcrossFourPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathTwoId, completedAcrossFourPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathThreeId, completedAcrossFourPaths, 'sharp').completedCount === 1, completedAcrossFourPaths)
    const pathFiveFirstDefinition = pathFiveLessons[0]
    if (pathFiveFirstDefinition) {
      const pathFiveFirst = resolveGuidedLessonVariant(pathFiveFirstDefinition, 'wistful')
      const completedAcrossFivePaths = markTodayLessonComplete(completedAcrossFourPaths, pathFiveFirst, minimalResult())
      assert('A1 Practical 5 count stays scoped after earlier path completions', getGuidedPathOverview(pathFiveId, completedAcrossFivePaths, 'wistful').completedCount === 1, completedAcrossFivePaths)
      assert('earlier path counts stay scoped after A1 Practical 5 completion', getGuidedPathOverview(pathOneId, completedAcrossFivePaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathTwoId, completedAcrossFivePaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathThreeId, completedAcrossFivePaths, 'sharp').completedCount === 1 && getGuidedPathOverview(pathFourId, completedAcrossFivePaths, 'bright').completedCount === 1, completedAcrossFivePaths)
      const pathSixFirstDefinition = pathSixLessons[0]
      if (pathSixFirstDefinition) {
        const pathSixFirst = resolveGuidedLessonVariant(pathSixFirstDefinition, 'bright')
        const completedAcrossSixPaths = markTodayLessonComplete(completedAcrossFivePaths, pathSixFirst, minimalResult())
        assert('A1 Practical 6 count stays scoped after earlier path completions', getGuidedPathOverview(pathSixId, completedAcrossSixPaths, 'bright').completedCount === 1, completedAcrossSixPaths)
        assert('earlier path counts stay scoped after A1 Practical 6 completion', getGuidedPathOverview(pathOneId, completedAcrossSixPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathTwoId, completedAcrossSixPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathThreeId, completedAcrossSixPaths, 'sharp').completedCount === 1 && getGuidedPathOverview(pathFourId, completedAcrossSixPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathFiveId, completedAcrossSixPaths, 'wistful').completedCount === 1, completedAcrossSixPaths)
        const pathSevenFirstDefinition = pathSevenLessons[0]
        if (pathSevenFirstDefinition) {
          const pathSevenFirst = resolveGuidedLessonVariant(pathSevenFirstDefinition, 'wistful')
          const completedAcrossSevenPaths = markTodayLessonComplete(completedAcrossSixPaths, pathSevenFirst, minimalResult())
          assert('A1 Practical 7 count stays scoped after earlier path completions', getGuidedPathOverview(pathSevenId, completedAcrossSevenPaths, 'wistful').completedCount === 1, completedAcrossSevenPaths)
          assert('earlier path counts stay scoped after A1 Practical 7 completion', getGuidedPathOverview(pathOneId, completedAcrossSevenPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathTwoId, completedAcrossSevenPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathThreeId, completedAcrossSevenPaths, 'sharp').completedCount === 1 && getGuidedPathOverview(pathFourId, completedAcrossSevenPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathFiveId, completedAcrossSevenPaths, 'wistful').completedCount === 1 && getGuidedPathOverview(pathSixId, completedAcrossSevenPaths, 'bright').completedCount === 1, completedAcrossSevenPaths)
          const pathEightFirstDefinition = pathEightLessons[0]
          if (pathEightFirstDefinition) {
            const pathEightFirst = resolveGuidedLessonVariant(pathEightFirstDefinition, 'bright')
            const completedAcrossEightPaths = markTodayLessonComplete(completedAcrossSevenPaths, pathEightFirst, minimalResult())
            assert('A1 Practical 8 count stays scoped after earlier path completions', getGuidedPathOverview(pathEightId, completedAcrossEightPaths, 'bright').completedCount === 1, completedAcrossEightPaths)
            assert('earlier path counts stay scoped after A1 Practical 8 completion', getGuidedPathOverview(pathOneId, completedAcrossEightPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathTwoId, completedAcrossEightPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathThreeId, completedAcrossEightPaths, 'sharp').completedCount === 1 && getGuidedPathOverview(pathFourId, completedAcrossEightPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathFiveId, completedAcrossEightPaths, 'wistful').completedCount === 1 && getGuidedPathOverview(pathSixId, completedAcrossEightPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathSevenId, completedAcrossEightPaths, 'wistful').completedCount === 1, completedAcrossEightPaths)
            const pathNineFirstDefinition = pathNineLessons[0]
            if (pathNineFirstDefinition) {
              const pathNineFirst = resolveGuidedLessonVariant(pathNineFirstDefinition, 'sharp')
              const completedAcrossNinePaths = markTodayLessonComplete(completedAcrossEightPaths, pathNineFirst, minimalResult())
              assert('A1 Practical 9 count stays scoped after earlier path completions', getGuidedPathOverview(pathNineId, completedAcrossNinePaths, 'sharp').completedCount === 1, completedAcrossNinePaths)
              assert('earlier path counts stay scoped after A1 Practical 9 completion', getGuidedPathOverview(pathOneId, completedAcrossNinePaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathTwoId, completedAcrossNinePaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathThreeId, completedAcrossNinePaths, 'sharp').completedCount === 1 && getGuidedPathOverview(pathFourId, completedAcrossNinePaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathFiveId, completedAcrossNinePaths, 'wistful').completedCount === 1 && getGuidedPathOverview(pathSixId, completedAcrossNinePaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathSevenId, completedAcrossNinePaths, 'wistful').completedCount === 1 && getGuidedPathOverview(pathEightId, completedAcrossNinePaths, 'bright').completedCount === 1, completedAcrossNinePaths)
              const pathTenFirstDefinition = pathTenLessons[0]
              if (pathTenFirstDefinition) {
                const pathTenFirst = resolveGuidedLessonVariant(pathTenFirstDefinition, 'bright')
                const completedAcrossTenPaths = markTodayLessonComplete(completedAcrossNinePaths, pathTenFirst, minimalResult())
                assert('A1 Practical 10 count stays scoped after earlier path completions', getGuidedPathOverview(pathTenId, completedAcrossTenPaths, 'bright').completedCount === 1, completedAcrossTenPaths)
                assert('earlier path counts stay scoped after A1 Practical 10 completion', getGuidedPathOverview(pathOneId, completedAcrossTenPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathTwoId, completedAcrossTenPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathThreeId, completedAcrossTenPaths, 'sharp').completedCount === 1 && getGuidedPathOverview(pathFourId, completedAcrossTenPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathFiveId, completedAcrossTenPaths, 'wistful').completedCount === 1 && getGuidedPathOverview(pathSixId, completedAcrossTenPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathSevenId, completedAcrossTenPaths, 'wistful').completedCount === 1 && getGuidedPathOverview(pathEightId, completedAcrossTenPaths, 'bright').completedCount === 1 && getGuidedPathOverview(pathNineId, completedAcrossTenPaths, 'sharp').completedCount === 1, completedAcrossTenPaths)
              }
            }
          }
        }
      }
    }
  }
}

console.log('\n[vibe behavior]')
const originalWindow = globalThis.window
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: createMemoryStorage() },
  configurable: true,
})

try {
  const progressBeforeVibe = JSON.stringify(completedFirst)
  setSelectedGuidedVibe(pathOneId, 'sharp')
  assert('active vibe switch persists selected voice', getSelectedGuidedVibe(pathOneId) === 'sharp')
  assert('path-specific vibe selection does not bleed into A1 Practical 2', getSelectedGuidedVibe(pathTwoId) === 'bright')
  setSelectedGuidedVibe(pathTwoId, 'wistful')
  assert('A1 Practical 2 can persist its own selected voice', getSelectedGuidedVibe(pathTwoId) === 'wistful')
  assert('A1 Practical 1 keeps its selected voice', getSelectedGuidedVibe(pathOneId) === 'sharp')
  setSelectedGuidedVibe(pathThreeId, 'bright')
  assert('A1 Practical 3 can persist its own selected voice', getSelectedGuidedVibe(pathThreeId) === 'bright')
  assert('A1 Practical 2 keeps its selected voice after A1 Practical 3 selection', getSelectedGuidedVibe(pathTwoId) === 'wistful')
  setSelectedGuidedVibe(pathFourId, 'sharp')
  assert('A1 Practical 4 can persist its own selected voice', getSelectedGuidedVibe(pathFourId) === 'sharp')
  assert('A1 Practical 3 keeps its selected voice after A1 Practical 4 selection', getSelectedGuidedVibe(pathThreeId) === 'bright')
  setSelectedGuidedVibe(pathFiveId, 'wistful')
  assert('A1 Practical 5 can persist its own selected voice', getSelectedGuidedVibe(pathFiveId) === 'wistful')
  assert('A1 Practical 4 keeps its selected voice after A1 Practical 5 selection', getSelectedGuidedVibe(pathFourId) === 'sharp')
  setSelectedGuidedVibe(pathSixId, 'bright')
  assert('A1 Practical 6 can persist its own selected voice', getSelectedGuidedVibe(pathSixId) === 'bright')
  assert('A1 Practical 5 keeps its selected voice after A1 Practical 6 selection', getSelectedGuidedVibe(pathFiveId) === 'wistful')
  setSelectedGuidedVibe(pathSevenId, 'sharp')
  assert('A1 Practical 7 can persist its own selected voice', getSelectedGuidedVibe(pathSevenId) === 'sharp')
  assert('A1 Practical 6 keeps its selected voice after A1 Practical 7 selection', getSelectedGuidedVibe(pathSixId) === 'bright')
  setSelectedGuidedVibe(pathEightId, 'bright')
  assert('A1 Practical 8 can persist its own selected voice', getSelectedGuidedVibe(pathEightId) === 'bright')
  assert('A1 Practical 7 keeps its selected voice after A1 Practical 8 selection', getSelectedGuidedVibe(pathSevenId) === 'sharp')
  setSelectedGuidedVibe(pathNineId, 'wistful')
  assert('A1 Practical 9 can persist its own selected voice', getSelectedGuidedVibe(pathNineId) === 'wistful')
  assert('A1 Practical 8 keeps its selected voice after A1 Practical 9 selection', getSelectedGuidedVibe(pathEightId) === 'bright')
  setSelectedGuidedVibe(pathTenId, 'sharp')
  assert('A1 Practical 10 can persist its own selected voice', getSelectedGuidedVibe(pathTenId) === 'sharp')
  assert('A1 Practical 9 keeps its selected voice after A1 Practical 10 selection', getSelectedGuidedVibe(pathNineId) === 'wistful')
  assert('vibe switch does not mutate progress', JSON.stringify(completedFirst) === progressBeforeVibe, completedFirst)
  for (const futureVibeId of FUTURE_GUIDED_VIBE_IDS) {
    setSelectedGuidedVibe(pathOneId, futureVibeId)
    assert(`${futureVibeId} remains non-selectable`, getSelectedGuidedVibe(pathOneId) === 'bright')
  }
  assert('only active launch vibes are selectable', JSON.stringify(ACTIVE_GUIDED_VIBE_IDS) === JSON.stringify(['bright', 'wistful', 'sharp']), ACTIVE_GUIDED_VIBE_IDS)
  assert('vibe storage key remains path-scoped', todayGuidedVibeKey(pathOneId) === 'resonance_guided_vibe__english-a1-practical-1')
} finally {
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    configurable: true,
  })
}

console.log('\n[privacy]')
const storedResultJson = JSON.stringify(completedTwo.courses[pathOneId]?.lessons[firstLesson.id]?.result)
assert('no raw typed answers are stored', !containsAny(storedResultJson, ['typedAnswer', 'typeAnswer', 'typedRecallAnswer', 'rawAnswer']), completedTwo)
assert('no raw speech transcripts are stored', !containsAny(storedResultJson, ['speechTranscript', 'transcriptText', 'rawTranscript']), completedTwo)

console.log('\n[source-level UX simplification]')
const todayPathOverviewSource = readSource('../src/components/today/TodayPathOverview.tsx')
const todaySessionSource = readSource('../src/components/today/TodaySession.tsx')
const todayHeroSource = readSource('../src/components/today/TodayHero.tsx')
const todayPageSource = readSource('../src/pages/Today.tsx')
const todayCssSource = readOptionalSource('../src/components/today/Today.css')
const todayHeroOrbAsset = '../public/guided/today/today-orb-hero.png'
const todayLessonOrbAsset = '../public/guided/today/today-lesson-orb.png'
const todaySpeechMicAsset = '../public/guided/today/speech-microphone-orb.png'
const todayMobileRailAsset = '../public/guided/today/today-path-rail-mobile.png'
const todayDesktopRailAsset = '../public/guided/today/today-path-rail-desktop.png'
const buildPhraseSource = readSource('../src/components/today/BuildPhraseStep.tsx')
const matchPairsSource = readSource('../src/components/today/MatchPairsStep.tsx')
const speakStepSource = readSource('../src/components/today/SpeakStep.tsx')
const guidedSpeechPromptSource = readSource('../src/components/today/GuidedSpeechPrompt.tsx')
const typeRecallSource = readSource('../src/components/today/TypeRecallStep.tsx')
const sceneStepSource = sliceBetween(todaySessionSource, 'function SceneStep', 'function CompleteStep')
const completeStepSource = sliceBetween(todaySessionSource, 'function CompleteStep', 'function canContinueFromSpeak')
const guidedVibePickerSource = sliceBetween(todayHeroSource, 'export function GuidedVibePicker', 'export function TodayCompactHeader')
const todayCompactHeaderSource = sliceBetween(todayHeroSource, 'export function TodayCompactHeader', '')
const lessonPathCardSource = sliceBetween(todayPathOverviewSource, 'function LessonPathCard', 'function LessonCellMarker')
const recommendedLessonPanelSource = sliceBetween(todayPathOverviewSource, 'function RecommendedLessonPanel', 'function LessonPathCard')
const lessonCellMarkerSource = sliceBetween(todayPathOverviewSource, 'function LessonCellMarker', 'function LessonNumberMarker')
const todaySegmentNodeSource = sliceBetween(todayPathOverviewSource, 'function TodaySegmentNode', 'function RecommendedLessonPanel')
const todaySegmentReviewBranchSource = sliceBetween(todaySegmentNodeSource, "if (kind === 'review')", "\n  if (kind === 'trophy')")
const todaySegmentTrophyBranchSource = sliceBetween(todaySegmentNodeSource, "if (kind === 'trophy')", "\n  return null")
const desktopRouteSource = sliceBetween(todayPathOverviewSource, '<div className="today-path-desktopFlow"', '{checkpointCard && (')
const reviewTileCss = sliceBetween(todayCssSource, '.today-segment-reviewTile {', '}')
const reviewTileHoverCss = sliceBetween(todayCssSource, '.today-segment-reviewTile:hover', '}')
const trophyTileCss = sliceBetween(todayCssSource, '.today-segment-trophyTile {', '}')
const trophyTileHoverCss = sliceBetween(todayCssSource, '.today-segment-trophyTile:hover', '}')
const segmentGridCss = sliceBetween(todayCssSource, '.today-path-segmentGrid {', '}')
const desktopRouteRowCss = sliceBetween(todayCssSource, '.today-path-desktopRouteRow {', '}')
const mobileConnectorCss = sliceBetween(todayCssSource, '.today-path-mobileConnectorSegment {', '}')
const mobileTrophyTileCss = sliceBetween(todayCssSource, '.today-path-mobileRewards .today-segment-trophyTile {', '}')
const selectedGridLessonCss = sliceBetween(todayCssSource, '.today-path-gridLesson[data-selected="true"] {', '}')
const selectedLessonNumberCss = sliceBetween(todayCssSource, '.today-path-card[data-selected="true"] .today-path-cardNumberImage {', '}')
const sessionHeaderSource = sliceBetween(todaySessionSource, '<header className="today-session-header">', '<TodayLessonProgressRail')
const sessionTaskHeaderSource = sliceBetween(todaySessionSource, '<div className="today-session-taskHeader">', '</div>')
const sessionTaskCardCss = sliceBetween(todayCssSource, '.today-session-taskCard {', '}')
const sceneMediaContextCss = sliceBetween(todayCssSource, '.today-scene-mediaContext {', '}')
const speakRecordingButtonSource = sliceBetween(guidedSpeechPromptSource, "className={cn('today-speech-primaryAction'", '</button>')
const speechSecondaryActionsSource = sliceBetween(guidedSpeechPromptSource, '<div className="today-speech-secondaryActions', '</div>')
const speechMicAssetCss = sliceBetween(todayCssSource, '.today-speech-micAsset {', '}')
const speechSuccessIconCss = sliceBetween(todayCssSource, '.today-speech-successIcon {', '}')
const completionCorePhraseCss = sliceBetween(todayCssSource, '.today-completion-corePhrase {', '}')

assert('overview lesson cards do not render trophy word labels', !containsAny(todayPathOverviewSource, ['today.path.trophyWord', 'lesson.trophyWord', '<Trophy']))
assert('overview lesson cards do not render selected-vibe phrase previews', !todayPathOverviewSource.includes('lesson.corePhrase.targetText'))
assert('overview lesson cards do not render situation descriptions', !lessonPathCardSource.includes('lesson.situation'))
assert('overview no longer renders a standalone voice selector before recommended lesson panel', !todayPathOverviewSource.includes('<GuidedVibePicker'))
assert('vibe picker does not render palette swatches', !containsAny(guidedVibePickerSource, ['vibeSwatches', 'backgroundColor: color']))
assert('vibe picker does not render example phrases', !containsAny(guidedVibePickerSource, ['today.vibePicker.exampleLabel', 'variant?.corePhrase.targetText']))
assert('vibe picker renders emblem images for active voice cards', guidedVibePickerSource.includes('<img') && guidedVibePickerSource.includes('vibe.emblem?.url'))
assert('vibe picker keeps emblem images contained without stretching', guidedVibePickerSource.includes('object-contain'))
assert('Scene step does not reveal trophy word', !containsAny(sceneStepSource, ['today.trophyWord.title', 'lesson.trophyWord']))
assert('Scene step leads with the core phrase before the lesson media', sceneStepSource.indexOf('today-scene-phraseCard') >= 0 && sceneStepSource.indexOf('today-scene-phraseCard') < sceneStepSource.indexOf('<LessonMediaFrame'), sceneStepSource)
assert('Scene step no longer uses old desktop side-by-side media and copy columns', !sceneStepSource.includes('lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]') && !sceneStepSource.includes('lg:items-center'), sceneStepSource)
assert('Scene step demotes situation copy into compact context beside the video', sceneStepSource.includes('today-scene-mediaContext') && sceneStepSource.includes('today-scene-situationStrip') && sceneStepSource.indexOf('today-scene-situationStrip') > sceneStepSource.indexOf('<LessonMediaFrame'), sceneStepSource)
assert('Complete step can reveal trophy word', containsAny(completeStepSource, ['today.trophyWord.title', 'lesson.trophyWord.word']))
assert('session keeps path return only for completion/end states', completeStepSource.includes('onViewPath') && !sliceBetween(todaySessionSource, '<div className="mb-6', '<Progress').includes('onViewPath'))
assert('session header does not render selected-vibe phrase text', !todayCompactHeaderSource.includes('lesson.corePhrase.targetText'))
assert('session source avoids target phrase spoiler in compact header', !containsAny(todayCompactHeaderSource, ['corePhrase', 'targetText']))
assert('session has no generic bottom Back step control', !containsAny(todaySessionSource, ['handleBack', "t('today.back')"]))
assert('Back to path handler only exits the session view', todayPageSource.includes('const handleExitToIntro = () => {\n    setSessionActive(false)\n  }'), sliceBetween(todayPageSource, 'const handleExitToIntro', 'const handleComplete'))
const progressBeforeBackToPath = JSON.stringify(completedTwo)
assert('Back to path does not mutate progress', JSON.stringify(completedTwo) === progressBeforeBackToPath, completedTwo)
assert('recommended panel label is next lesson, not internal recommendation copy', recommendedLessonPanelSource.includes("t('today.path.nextLessonLabel')") && !recommendedLessonPanelSource.includes("t('today.path.recommendedLabel')"))
assert('path overview prioritizes an explicitly selected lesson over the recommendation in the featured card', todayPathOverviewSource.includes('const pathLesson = overview.selectedLesson ?? overview.recommendedLesson'), todayPathOverviewSource)
assert('Today page separates lesson selection from session start and can launch a targeted lesson', containsAny(todayPageSource, ['const handleSelectLesson', 'setSelectedLessonId(lessonId)']) && todayPageSource.includes('const handleStartSelectedLesson = (lessonId?: string)') && todayPageSource.includes('setSessionActive(true)'))
assert('Today page scrolls to the lesson top when a session starts', todayPageSource.includes('scrollTodayToTop') && todayPageSource.includes('window.scrollTo({ top: 0') && sliceBetween(todayPageSource, 'const handleStartSelectedLesson', 'const handleOpenNextLesson').includes('scrollTodayToTop()'), todayPageSource)
assert('Today beta banner omits unrelated subscription checkout copy', todayPageSource.includes('today-betaBanner') && !todayPageSource.includes('Subscription checkout is in private testing'), todayPageSource)
assert('path overview receives a select handler and targeted start handler', todayPathOverviewSource.includes('onSelectLesson') && todayPathOverviewSource.includes('onStartLesson: (lessonId?: string) => void'))
const englishPathIdsInOrder = getGuidedTodayPathOptions()
  .filter((path) => path.targetLanguage === 'English')
  .map((path) => path.id)
const expectedEnglishPathIds = [
  pathOneId,
  pathTwoId,
  pathThreeId,
  pathFourId,
  pathFiveId,
  pathSixId,
  pathSevenId,
  pathEightId,
  pathNineId,
  pathTenId,
  ...Array.from({ length: 10 }, (_, index) => `english-a2-practical-${index + 1}`),
]
assert(
  'path selector source exposes all implemented A1 and A2 English paths in authored order',
  JSON.stringify(englishPathIdsInOrder) === JSON.stringify(expectedEnglishPathIds),
  englishPathIdsInOrder,
)
for (const path of getGuidedTodayPathOptions()) {
  assert(`${path.id} (${path.targetLanguage}) overview exposes 10 lessons`, getGuidedPathLessons(path.id).length === 10, path)
}
assert('Today page stores selected path id and passes path options to overview', containsAny(todayPageSource, ['selectedPathId', 'getGuidedTodayPathOptions']) && todayPathOverviewSource.includes('pathOptions'))
assert('Today language-body load failure offers a localized retry instead of an endless spinner', todayPageSource.includes('.catch(() =>') && todayPageSource.includes('setFailedLanguage(selectedLanguage)') && todayPageSource.includes("t('errors.route.retry')") && todayPageSource.includes('setLanguageLoadAttempt((attempt) => attempt + 1)'), todayPageSource)
assert('path overview opens gear settings instead of permanent path chips', todayPathOverviewSource.includes('Settings') && todayPathOverviewSource.includes('GuidedPathDirectory') && todayPathOverviewSource.includes("aria-label={t('today.path.changePath')}") && !todayPathOverviewSource.includes('today-path-switcher'))
assert('path overview shows a visible Options gear control without a dropdown chevron', todayPathOverviewSource.includes('today-path-optionsButton') && todayPathOverviewSource.includes("t('today.path.options')") && todayPathOverviewSource.includes('<Settings') && !todayPathOverviewSource.includes('<ChevronDown'), todayPathOverviewSource)
assert('path overview shows compact localized lesson progress in the top hero', todayPathOverviewSource.includes('today-path-heroProgressRail') && todayPathOverviewSource.includes('today-path-heroProgressFill') && todayPathOverviewSource.includes("t('today.path.lessonProgressHero'") && todayPathOverviewSource.includes('overview.totalLessons'), todayPathOverviewSource)
assert('path overview renders Path Check as a separate diagnostic action outside the options modal', todayPathOverviewSource.includes('PathCheckTile') && todayPathOverviewSource.includes('today-path-checkAction') && todayPathOverviewSource.includes('pathCheckHref'), todayPathOverviewSource)
assert('path overview uses reusable transparent PNG orb assets', todayPathOverviewSource.includes('TODAY_PATH_HERO_ASSET') && todayPathOverviewSource.includes('TODAY_PATH_LESSON_ORB_ASSET') && todayPathOverviewSource.includes('today-path-heroOrb') && assetHasBytes(todayHeroOrbAsset, 100000) && assetHasBytes(todayLessonOrbAsset, 60000), todayPathOverviewSource)
assert('path overview keeps old full rail PNG assets out of the lesson grid overlay', assetHasBytes(todayMobileRailAsset, 20000) && assetHasBytes(todayDesktopRailAsset, 30000) && !todayPathOverviewSource.includes('TODAY_PATH_MOBILE_RAIL_ASSET') && !todayPathOverviewSource.includes('TODAY_PATH_DESKTOP_RAIL_ASSET') && !todayPathOverviewSource.includes('today-path-mobileRailAsset') && !todayPathOverviewSource.includes('today-path-desktopRailAsset'), todayPathOverviewSource)
assert('path overview renders review and trophy with raw media inside compact pills', todayPathOverviewSource.includes('TodaySegmentNode') && todayPathOverviewSource.includes('data-node-kind="review"') && todayPathOverviewSource.includes('data-node-kind="trophy"') && todayPathOverviewSource.includes('today-path-nodeMedia') && !todayPathOverviewSource.includes('today-path-nodeMarker today-segment-reviewMedia') && !todayPathOverviewSource.includes('today-path-nodeMarker today-segment-trophyMedia'), todayPathOverviewSource)
assert('desktop path keeps connector art between the five lesson cards', desktopRouteSource.includes('today-path-connector') && desktopRouteSource.includes('<ConnectorWave />') && desktopRouteSource.includes('lessonIndex < segment.lessons.length - 1') && segmentGridCss.includes('--today-node-size') && segmentGridCss.includes('grid-template-columns'), { desktopRouteSource, segmentGridCss })
assert('desktop path uses two compact seven-slot rows with rewards inline after lessons', todayPathOverviewSource.includes('today-path-desktopRouteRow') && todayPathOverviewSource.includes('today-path-desktopRewardSlot') && !todayPathOverviewSource.includes('today-path-desktopRewards') && desktopRouteRowCss.includes('grid-template-columns') && desktopRouteRowCss.includes('today-desktop-route-width'), { todayPathOverviewSource, desktopRouteRowCss })
assert('desktop path uses reduced-motion-aware animated connector SVGs between lesson numbers', todayPathOverviewSource.includes('function ConnectorWave') && todayPathOverviewSource.includes('today-path-connectorWave') && todayCssSource.includes('.today-path-connectorWave path') && todayCssSource.includes('@keyframes today-connector-drift') && todayCssSource.includes('animation: none !important'), { todayPathOverviewSource, todayCssSource })
assert('mobile path connectors are separate short segments between lesson rows', todayPathOverviewSource.includes('today-path-mobileConnectorSegment') && !todayCssSource.includes('.today-path-mobileRailAsset') && mobileConnectorCss.includes('height:') && mobileConnectorCss.includes('grid-column: 1'), { mobileConnectorCss, todayPathOverviewSource })
assert('segment review nodes render only the review image with no visible copy', todaySegmentReviewBranchSource.includes('today-path-nodeMedia') && !containsAny(todaySegmentReviewBranchSource, ['today-path-nodeCopy', 'today-path-nodeTitle', 'rangeLabel']), todaySegmentReviewBranchSource)
assert('segment review tile CSS removes pill chrome around the review asset', reviewTileCss.includes('background: transparent') && reviewTileCss.includes('border-width: 0') && reviewTileCss.includes('box-shadow: none') && reviewTileCss.includes('justify-content: center'), reviewTileCss)
assert('segment trophy nodes render only the centered trophy asset with no visible copy', todaySegmentTrophyBranchSource.includes('today-segment-trophyMedia') && !containsAny(todaySegmentTrophyBranchSource, ['today-path-nodeCopy', 'today-path-nodeTitle', 'today-segment-trophyComplete', '{label}']), todaySegmentTrophyBranchSource)
assert('review and trophy assets glow as the clickable hover affordance', reviewTileHoverCss.includes('filter:') && reviewTileHoverCss.includes('drop-shadow') && trophyTileHoverCss.includes('filter:') && trophyTileHoverCss.includes('drop-shadow'), { reviewTileHoverCss, trophyTileHoverCss })
assert('trophy reward floats without oval chrome like review across breakpoints', trophyTileCss.includes('background: transparent') && trophyTileCss.includes('border-width: 0') && trophyTileCss.includes('box-shadow: none') && trophyTileCss.includes('justify-content: center') && mobileTrophyTileCss.includes('padding: 0'), { trophyTileCss, mobileTrophyTileCss })
assert('path overview keeps selected lesson details inside a glass featured card', todayPathOverviewSource.includes('today-featuredLesson') && todayPathOverviewSource.includes('today-featuredLessonOrb') && todayCssSource.includes('.today-featuredLesson'), todayPathOverviewSource)
assert('path overview consolidates language picker into gear settings', !todayPathOverviewSource.includes('GuidedLanguagePicker') && todayPathOverviewSource.includes('availableLanguages={availableLanguages}') && todayPathOverviewSource.includes('onSelectLanguage={onSelectLanguage}'))
assert('path overview consolidates English vibe picker into gear settings', !todayPathOverviewSource.includes('GuidedVibePicker') && todayPathOverviewSource.includes('selectedVibeId={selectedVibeId}') && todayPathOverviewSource.includes('onSelectVibe={onSelectVibe}'))
assert('main Today header no longer renders visible Path Check action', !sliceBetween(todayPathOverviewSource, '<div className="today-path-actions', '<GuidedPathDirectory').includes('today.path.pathCheck'))
assert('path overview renders two in-path segment review nodes', todayPathOverviewSource.includes('GUIDED_SEGMENT_REVIEWS') && todayPathOverviewSource.includes('SegmentReviewTile') && todayPathOverviewSource.includes("t(segment.labelKey)"))
assert('segment review nodes reference lessons 1-5 and 6-10', todayPathOverviewSource.includes('start: 1') && todayPathOverviewSource.includes('end: 5') && todayPathOverviewSource.includes('start: 6') && todayPathOverviewSource.includes('end: 10'))
assert('segment review nodes link to segment-review checkpoint route', todayPathOverviewSource.includes('mode=segment-review') && todayPathOverviewSource.includes('segment=${segment.segment}') && todayPathOverviewSource.includes('vibe=${selectedVibeId}'))
const segmentReviewTileSource = sliceBetween(todayPathOverviewSource, 'function SegmentReviewTile', 'function RecommendedLessonPanel')
assert('segment review tiles stay always clickable', segmentReviewTileSource.includes('<Link') && !segmentReviewTileSource.includes('aria-disabled') && !segmentReviewTileSource.includes('if (!isAvailable)'))
assert('segment review tiles hide visible progress and lock copy', !containsAny(segmentReviewTileSource, ['progressLabel', '/5', 'today.path.notReadyYet', 'today.path.startReview', '<Lock']))
assert('segment review tiles keep completion metadata without changing 0/10 lesson completion count', todayPathOverviewSource.includes('data-review-completed-count') && !todayPathOverviewSource.includes('totalLessons +'))
assert('segment review tiles use active vibe WebP review assets', todayPathOverviewSource.includes('${selectedVibeId}-review.webp') && todayPathOverviewSource.includes('/guided/reviews/${assetName}') && !todayPathOverviewSource.includes('-review.png'))
assert('segment review tiles use local segment review completion for complete WebP asset state', todayPathOverviewSource.includes('readGuidedSegmentReviewRecord') && segmentReviewTileSource.includes('${selectedVibeId}-review-complete.webp') && segmentReviewTileSource.includes('data-review-complete'))
assert('Bright lesson cards render image number assets', todayPathOverviewSource.includes('LessonNumberMarker') && todayPathOverviewSource.includes('/guided/lesson-numbers/bright/${paddedLessonNumber}.webp') && todayPathOverviewSource.includes('data-lesson-number-asset="bright"'))
const lessonNumberMarkerSource = sliceBetween(todayPathOverviewSource, 'function LessonNumberMarker', '')
assert('Wistful lesson cards render selected image number assets', lessonNumberMarkerSource.includes("selectedVibeId === 'wistful'") && !sliceBetween(lessonNumberMarkerSource, "selectedVibeId === 'wistful'", "selectedVibeId === 'sharp'").includes('lessonNumber <= 5') && lessonNumberMarkerSource.includes('/guided/lesson-numbers/wistful/${paddedLessonNumber}.webp') && lessonNumberMarkerSource.includes('data-lesson-number-asset="wistful"'))
assert('Sharp lesson cards render selected image number assets', lessonNumberMarkerSource.includes("selectedVibeId === 'sharp'") && !sliceBetween(lessonNumberMarkerSource, "selectedVibeId === 'sharp'", 'return <>{lessonNumber}</>').includes('lessonNumber <= 5') && lessonNumberMarkerSource.includes('/guided/lesson-numbers/sharp/${paddedLessonNumber}.webp') && lessonNumberMarkerSource.includes('data-lesson-number-asset="sharp"'))
assert('segment review and trophy tile CSS is compact for mobile', todayCssSource.includes('min-height: 3.25rem') && todayCssSource.includes('max-height: 2.65rem') && todayCssSource.includes('.today-segment-trophyMedia'))
assert('lesson cards select only; the featured CTA starts the displayed lesson', lessonPathCardSource.includes('onSelectLesson(lesson.id)') && !lessonPathCardSource.includes('onStartLesson(lesson.id)') && !lessonPathCardSource.includes('onStartLesson: (lessonId?: string) => void') && !todayPathOverviewSource.includes('function isMobileViewport'), lessonPathCardSource)
assert('selected lesson panel visibly distinguishes the recommendation from a manual selection', recommendedLessonPanelSource.includes('today-featuredLessonKickerStatus') && recommendedLessonPanelSource.includes("t('today.path.selectedLessonLabel')") && recommendedLessonPanelSource.includes("t('today.path.nextLessonLabel')"))
assert('selected lesson panel visible copy is reduced to lesson, title, action', !recommendedLessonPanelSource.includes('uppercase tracking-[0.18em] text-[var(--text-muted)]'))
assert('selected lesson panel action uses Next only for the recommendation and Start for manual selections', recommendedLessonPanelSource.includes("isSelectedRecommendation ? t('today.nextLesson') : t('today.startLesson')") && !recommendedLessonPanelSource.includes('getActionLabel'), recommendedLessonPanelSource)
assert('selected lesson panel launches the displayed lesson explicitly', recommendedLessonPanelSource.includes('onClick={() => onStartLesson(lesson.id)}'), recommendedLessonPanelSource)
assert('lesson cards replace completed selected-vibe numbers with the vibe emblem', lessonPathCardSource.includes('completedVibeIds.includes(selectedVibeId)') && lessonCellMarkerSource.includes('CompletedLessonMarker') && lessonCellMarkerSource.includes('guidedVibes[selectedVibeId].emblem?.url'), lessonPathCardSource)
assert('lesson cards keep only compact numeric visual content and mobile rows do not repeat the lesson number', lessonPathCardSource.includes('today-path-cardMarker') && lessonPathCardSource.includes('sr-only') && !lessonPathCardSource.includes('today-path-railIndex') && !lessonPathCardSource.includes('<h3') && !lessonPathCardSource.includes('lesson.title}</h3>'), lessonPathCardSource)
assert('lesson rows are always five compact cells', todayPathOverviewSource.includes('today-path-segmentGrid grid grid-cols-5') && todayCssSource.includes('aspect-ratio: 1 / 1'), todayPathOverviewSource)
assert('future lesson cards are visually subdued by status data', lessonPathCardSource.includes('data-lesson-status={status}') && todayCssSource.includes('[data-lesson-status="not-started"]'), lessonPathCardSource)
assert('selected grid lesson removes square tile chrome so only the circular marker remains', selectedGridLessonCss.includes('background: transparent') && selectedGridLessonCss.includes('border-color: transparent') && selectedGridLessonCss.includes('box-shadow: none') && selectedGridLessonCss.includes('overflow: visible'), selectedGridLessonCss)
assert('selected lesson overrides subdued future opacity and lights its number asset', todayCssSource.includes('.today-path-card[data-selected="true"] {\n  opacity: 1;\n}') && selectedLessonNumberCss.includes('filter:') && selectedLessonNumberCss.includes('brightness') && selectedLessonNumberCss.includes('drop-shadow'), selectedLessonNumberCss)
assert('path header keeps only compact actions beside the title', todayPathOverviewSource.includes('today-path-header') && todayPathOverviewSource.includes('today-path-actions') && todayCssSource.includes('.today-path-actions'), todayPathOverviewSource)
assert('path header uses compact split labels instead of full path titles', todayPathOverviewSource.includes('splitGuidedPathLabel') && todayPathOverviewSource.includes('today-path-heroTitleLevel') && !sliceBetween(todayPathOverviewSource, '<h1', '</h1>').includes('overview.pathMetadata?.title'), todayPathOverviewSource)
assert('path header hides base-language arrow and selected vibe text', !sliceBetween(todayPathOverviewSource, '<div className="today-path-header', '<GuidedPathDirectory').includes('baseLanguage') && !sliceBetween(todayPathOverviewSource, '<div className="today-path-header', '<GuidedPathDirectory').includes('guidedVibes[selectedVibeId].label'), todayPathOverviewSource)
assert('path header keeps progress path-level and leaves selected lesson details to the featured box', todayPathOverviewSource.includes("t('today.path.lessonProgressHero'") && !todayPathOverviewSource.includes("t('today.path.compactProgress'") && !todayPathOverviewSource.includes('today-path-progressLine'), todayPathOverviewSource)
assert('path directory options use compact labels with progress only', todayPathOverviewSource.includes('GuidedPathDirectory') && !todayPathOverviewSource.includes('selectedPath.subtitle'))
const pathDirectorySource = readSource('../src/components/today/GuidedPathDirectory.tsx')
assert('path directory current and options omit the selected language and use fraction progress', pathDirectorySource.includes("includeLanguage: false") && pathDirectorySource.includes('formatPathProgressFraction') && !pathDirectorySource.includes("t('today.path.compactProgress'") && !pathDirectorySource.includes('path.subtitle') && !pathDirectorySource.includes('baseLanguage'), pathDirectorySource)
assert('path directory owns a collapsible language selector above path choices', pathDirectorySource.includes('languageExpanded') && pathDirectorySource.includes('languages.map') && pathDirectorySource.includes('setLanguageExpanded(false)'), pathDirectorySource)
assert('path directory owns a theme selector for every language', pathDirectorySource.includes('GuidedVibePicker') && pathDirectorySource.includes('onSelectVibe={onSelectVibe}') && !pathDirectorySource.includes("selectedLanguage === 'English'") && !pathDirectorySource.includes('getPathVibesAvailable(selectedPathId)'), pathDirectorySource)
assert('compact theme picker renders all three choices without a dropdown pill', todayHeroSource.includes('today-vibe-pickerCompact') && todayHeroSource.includes('ACTIVE_GUIDED_VIBE_IDS.map') && !todayHeroSource.includes('aria-expanded={expanded}') && !todayHeroSource.includes('today-vibe-pill') && !todayHeroSource.includes('setExpanded'), todayHeroSource)
assert('compact theme picker label says Theme across locales', readSource('../src/lib/translations.ts').includes("'today.vibePicker.compactLabel': 'Theme'") && readSource('../src/lib/translations.ts').includes("'today.vibePicker.compactLabel': 'Thema'") && readSource('../src/lib/translations.ts').includes("'today.vibePicker.compactLabel': 'Thème'"))
assert('Today page does not render a separate in-lesson compact path header', !todayPageSource.includes('TodayCompactHeader') && !todayPageSource.includes('<TodayCompactHeader'), todayPageSource)
assert('session header omits top Back to path action', !sliceBetween(todaySessionSource, '<div className="mb-6', '<Progress').includes('today.path.backToPath'), todaySessionSource)
assert('completion screen omits summary chips, green badge check, and restart action', !containsAny(completeStepSource, ['completionLines.map', 'today-completion-vibeBadgeCheck', 'today-completion-replayAction', 'onRestart', 'RotateCcw']), completeStepSource)
assert('lesson session uses custom glass shell instead of generic progress panel', todaySessionSource.includes('today-session-shell') && todaySessionSource.includes('today-session-taskCard') && !todaySessionSource.includes("from '@/components/ui/progress'"), todaySessionSource)
assert('lesson session renders its authored step count as a progress rail and current count pill', todaySessionSource.includes('<TodayLessonProgressRail steps={sessionSteps} stepIndex={stepIndex} />') && todaySessionSource.includes('today-session-progressNode') && todaySessionSource.includes("t('today.progressLabel'") && todaySessionSource.includes('steps.map((sessionStep, index)'), todaySessionSource)
assert('lesson session header avoids duplicating the step icon on desktop', !sessionHeaderSource.includes('<TodayLessonStepIcon step={step} />') && sessionTaskHeaderSource.includes('<TodayLessonStepIcon step={step} compact />'), { sessionHeaderSource, sessionTaskHeaderSource })
assert('lesson session header includes a compact back control beside the step count', todaySessionSource.includes('today-session-topActions') && todaySessionSource.includes('today-session-backPill') && todaySessionSource.includes('onClick={onViewPath}') && todaySessionSource.includes("t('today.path.backToPath')") && todaySessionSource.includes('ChevronLeft'), todaySessionSource)
assert('lesson session task card has a stable desktop measure across step content', sessionTaskCardCss.includes('width: min(100%,') && sessionTaskCardCss.includes('justify-self: center'), sessionTaskCardCss)
assert('lesson session keeps one stable desktop card width across authored step types', sessionTaskCardCss.includes('width: min(100%, 50rem)') && !todayCssSource.includes('.today-session-taskCard[data-session-step="scene"]') && !todayCssSource.includes('.today-session-shell[data-session-step="scene"]'), { sessionTaskCardCss })
assert('scene session uses a desktop media/context row under the phrase card', sceneMediaContextCss.includes('grid-template-columns') && sceneMediaContextCss.includes('minmax(0, 1.35fr)') && sceneMediaContextCss.includes('align-items: stretch'), sceneMediaContextCss)
assert('lesson session text surfaces force mobile-safe wrapping for long phrases', todayCssSource.includes('.today-session-safeText') && todayCssSource.includes('overflow-wrap: anywhere') && todayCssSource.includes('.today-speech-resultPhrase'), todayCssSource)
assert('lesson session maps every step to a visual icon asset', todaySessionSource.includes('stepIconMap') && todaySessionSource.includes('matchPairs') && todaySessionSource.includes('build') && todaySessionSource.includes('type') && todaySessionSource.includes('speak'), todaySessionSource)
assert('lesson task card receives stable status data for color-only feedback', todaySessionSource.includes('getStepVisualState') && todaySessionSource.includes('data-step-state={stepVisualState}') && todaySessionSource.includes('data-session-step={step}'), todaySessionSource)
assert(
  'build and type steps do not add visible wrong-result feedback blocks that resize the lesson card',
  !containsAny(buildPhraseSource, ['<XCircle', 'today.build.expected'])
    && !containsAny(typeRecallSource, ['<XCircle', 'today.type.expected'])
    && buildPhraseSource.includes('aria-live="polite"')
    && typeRecallSource.includes('aria-live="polite"')
    && buildPhraseSource.includes("status === 'wrong' ? t('today.build.wrong') : ''")
    && typeRecallSource.includes("status === 'wrong' ? t('today.type.wrong') : ''"),
  { buildPhraseSource, typeRecallSource },
)
assert('speech prompt uses the generated transparent microphone asset instead of CSS waveform lines', guidedSpeechPromptSource.includes('TODAY_SPEECH_MIC_ASSET') && guidedSpeechPromptSource.includes('today-speech-micAsset') && assetHasBytes(todaySpeechMicAsset, 100000) && !guidedSpeechPromptSource.includes('today-speech-waveform') && !todayCssSource.includes('repeating-linear-gradient'), { guidedSpeechPromptSource, speechMicAssetCss })
assert('speech result replaces the microphone stage and offers retry in place', guidedSpeechPromptSource.includes('today-speech-resultStage') && guidedSpeechPromptSource.includes('handleTryAgain') && guidedSpeechPromptSource.includes('speech.reset()') && guidedSpeechPromptSource.includes("t('speak.tapRetry')") && !guidedSpeechPromptSource.includes("t('today.speak.expected'"), guidedSpeechPromptSource)
assert('speech hint is a one-way inline reveal that does not add a second row', guidedSpeechPromptSource.includes('setHintVisible(true)') && !guidedSpeechPromptSource.includes('setHintVisible((current) => !current)') && speechSecondaryActionsSource.includes('today-speech-hint') && !guidedSpeechPromptSource.includes("t('today.speak.hideHint')"), speechSecondaryActionsSource)
assert('speech success shows a green check and does not repeat the heard line', guidedSpeechPromptSource.includes('CheckCircle2') && guidedSpeechPromptSource.includes('today-speech-successIcon') && guidedSpeechPromptSource.includes("status === 'passed' &&") && guidedSpeechPromptSource.includes("status !== 'passed' &&") && speechSuccessIconCss.includes('#34d399'), { guidedSpeechPromptSource, speechSuccessIconCss })
assert('speech success hides hints after a correct attempt', guidedSpeechPromptSource.includes("const shouldShowHint = showHintButton && status !== 'passed'") && speechSecondaryActionsSource.includes('shouldShowHint && !hintVisible') && speechSecondaryActionsSource.includes('shouldShowHint && hintVisible'), speechSecondaryActionsSource)
assert('lesson session primary action is a full-width bottom bar button', todaySessionSource.includes('today-session-footerButton') && todayCssSource.includes('.today-session-footerButton'), todaySessionSource)

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
assert('Sharp atmosphere uses a wide top-right radial falloff', containsAny(sharpAtmosphereSource, ['transparent 56%', 'transparent 58%', 'transparent 60%']), sharpAtmosphereSource)
assert('Sharp atmosphere keeps only the vertical fade and no diagonal beam', countOccurrences(sharpAtmosphereSource, 'linear-gradient(') === 1 && sharpAtmosphereSource.includes('linear-gradient(180deg') && !containsAny(sharpAtmosphereSource, ['linear-gradient(122deg', 'linear-gradient(235deg', 'linear-gradient(238deg', 'linear-gradient(242deg']), sharpAtmosphereSource)

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
assert('Speak step uses the shared guided speech prompt', speakStepSource.includes('<GuidedSpeechPrompt') && guidedSpeechPromptSource.includes('useGuidedSpeechRecognition'), speakStepSource)
assert('Speak step does not render a separate recording status chip', !containsAny(guidedSpeechPromptSource, ['today-speak-recordingStatus', "t('today.speak.recording')"]))
assert('Speak start/stop button keeps separate handlers by recording state', guidedSpeechPromptSource.includes('type="button"') && speakRecordingButtonSource.includes('onClick={isRecording ? handleStop : handleStart}'), speakRecordingButtonSource)
assert('Speak recording state turns the microphone control red instead of using a separate dot', speakRecordingButtonSource.includes('data-recording={isRecording}') && !guidedSpeechPromptSource.includes('today-speak-recordingDot'), speakRecordingButtonSource)
assert('Speak active recording state avoids crossed-out mic icon', !guidedSpeechPromptSource.includes('MicOff'), guidedSpeechPromptSource)
assert('completion can open the next lesson as primary action', completeStepSource.includes('onOpenNextLesson') && completeStepSource.includes("t('today.nextLesson')"))
assert('trophy completion avoids long why-it-matters copy', !completeStepSource.includes('whyThisWord'))
assert('completion primes the learner with the completed core sentence and translation', completeStepSource.includes('today-completion-corePhrase') && completeStepSource.includes('lesson.corePhrase.targetText') && completeStepSource.includes('resolveGuidedBaseContent(lesson.corePhrase.baseText') && completionCorePhraseCss.includes('max-width'), { completeStepSource, completionCorePhraseCss })
assert('scene placeholder uses lesson media caption as primary text', todayHeroSource.includes('today.media.placeholderLabel') && !todayHeroSource.includes("t('today.media.placeholderTitle')") && containsAny(todayHeroSource, ['{media.caption}', 'media.caption']), todayHeroSource)
assert('completion screen renders selected vibe emblem badge without success check overlay', completeStepSource.includes('today-completion-vibeBadge') && completeStepSource.includes('guidedVibes[lesson.vibeId].emblem?.url') && !completeStepSource.includes('<CheckCircle2'), completeStepSource)

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
assert('Lesson 9 variants avoid known incoherent review items and chips', !coherenceFlags.some((flag) => flag.includes('lesson 9')), coherenceFlags)

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

function countOccurrences(value: string, needle: string) {
  return value.split(needle).length - 1
}

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
}

function assetHasBytes(relativePath: string, minimumBytes: number) {
  const path = fileURLToPath(new URL(relativePath, import.meta.url))
  return existsSync(path) && statSync(path).size >= minimumBytes
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
  const knownLesson9OddPhrases = ['right call', 'good or odd']
  const lesson9AllowedItems = new Set(['i love', 'i like', 'it', 'here', 'nice', 'good', 'place', 'quiet'])

  for (const lessonDefinition of lessons) {
    for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
      const variant = lessonDefinition.vibeVariants[vibeId]
      if (!variant) continue

      const searchableContext = [
        resolveGuidedBaseContent(lessonDefinition.title, { authoredBaseLanguage: lessonDefinition.baseLanguage }).text,
        lessonDefinition.situation.en,
        lessonDefinition.situation.de,
        variant.corePhrase.targetText,
        resolveGuidedBaseContent(variant.corePhrase.baseText, { authoredBaseLanguage: lessonDefinition.baseLanguage }).text,
        ...variant.chunks.flatMap((chunk) => [
          chunk.targetText,
          resolveGuidedBaseContent(chunk.baseText, { authoredBaseLanguage: lessonDefinition.baseLanguage }).text,
        ]),
      ].join(' ').toLowerCase()

      const seenTargets = new Set<string>()
      for (const item of variant.lessonItems) {
        const target = item.targetText.toLowerCase()
        if (seenTargets.has(target)) {
          flags.push(`lesson ${lessonDefinition.lessonNumber}/${vibeId}: duplicated lesson item "${item.targetText}"`)
        }
        seenTargets.add(target)

        if (resolveGuidedBaseContent(item.baseText, { authoredBaseLanguage: lessonDefinition.baseLanguage }).text.trim().length < 2) {
          flags.push(`lesson ${lessonDefinition.lessonNumber}/${vibeId}: suspiciously short German base text for "${item.targetText}"`)
        }

        if (weakGenericItems.has(target)) {
          flags.push(`lesson ${lessonDefinition.lessonNumber}/${vibeId}: weak generic lesson item "${item.targetText}"`)
        }

        if (knownLesson9OddPhrases.some((phrase) => target.includes(phrase))) {
          flags.push(`lesson ${lessonDefinition.lessonNumber}/${vibeId}: suspicious lesson item "${item.targetText}"`)
        }

        const targetWords = target.split(/\s+/).filter((word) => word.length > 2)
        const relatedToContext = lessonDefinition.lessonNumber === 9 && lesson9AllowedItems.has(target)
          ? true
          : targetWords.some((word) => searchableContext.includes(word))
        if (lessonDefinition.lessonNumber === 9 && !relatedToContext) {
          flags.push(`lesson 9/${vibeId}: lesson item may be disconnected from I like/place context: "${item.targetText}"`)
        }
      }

      for (const chip of variant.build.chips) {
        const normalizedChip = chip.toLowerCase().replace(/[.!?,]/g, '').trim()
        if (lessonDefinition.lessonNumber === 9 && knownLesson9OddPhrases.some((phrase) => normalizedChip.includes(phrase))) {
          flags.push(`lesson 9/${vibeId}: suspicious build chip "${chip}"`)
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
