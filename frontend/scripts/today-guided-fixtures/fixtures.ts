/* eslint-disable */
import { getGuidedPathLessons, resolveGuidedLessonVariant } from '@/data/guidedLessons'
import type { TodayFixtureScenario } from './stubs/scenario'
import { Ctx, bodyText, byText, pressKey, q, qa, shot, sleep, textOf, typeInto, waitFor, waitGone } from './utils'

type Fixture = {
  id: string
  name: string
  viewport: { width: number; height: number }
  reduceMotion?: boolean
  scenario: TodayFixtureScenario
  localStorageSeed?: Record<string, string>
  run: (ctx: Ctx) => Promise<void>
}

const ROUTE = '/today?path=english-a1-practical-1&vibe=bright'
const MOBILE = { width: 390, height: 844 }
const SE = { width: 320, height: 568 }
const DESKTOP = { width: 1440, height: 1000 }

async function waitForOverview() {
  return waitFor('real Today path overview', () => {
    const shell = q<HTMLElement>('.today-path-shell')
    return shell && qa('.today-path-card').length >= 10 ? shell : null
  }, 15000)
}

function visibleLessonCards() {
  return qa<HTMLButtonElement>('.today-path-card').filter((card) => card.getBoundingClientRect().width > 0)
}

function footerButton() {
  const button = q<HTMLButtonElement>('.today-session-footerButton')
  if (!button) throw new Error('session footer button missing')
  return button
}

async function advance() {
  const button = footerButton()
  await waitFor('enabled session Continue', () => !button.disabled && button, 5000)
  button.click()
  await sleep(120)
}

async function startFirstLesson() {
  await waitForOverview()
  const start = q<HTMLButtonElement>('.today-featuredLessonAction')
  if (!start) throw new Error('featured lesson Start missing')
  start.click()
  await waitFor('scene step', () => q<HTMLElement>('[data-session-step="scene"]'), 8000)
}

async function solveMatchPairs() {
  for (const target of qa<HTMLButtonElement>('.today-match-column:first-child .today-match-chip')) {
    if (target.disabled) continue
    for (const base of qa<HTMLButtonElement>('.today-match-column:nth-child(2) .today-match-chip')) {
      if (base.disabled) continue
      target.click()
      await sleep(60)
      base.click()
      await sleep(700)
      if (target.disabled) break
    }
  }
  await waitFor('all pairs matched', () => qa<HTMLButtonElement>('.today-match-chip').every((button) => button.disabled), 6000)
}

async function solveBuild() {
  const definition = getGuidedPathLessons('english-a1-practical-1')[0]
  const lesson = resolveGuidedLessonVariant(definition, 'bright')
  const targetParts: string[] = []
  for (const chip of lesson.build.chips) {
    targetParts.push(chip)
    if (targetParts.join(' ') === lesson.build.targetText) break
  }
  for (const part of targetParts) {
    const button = qa<HTMLButtonElement>('.today-build-chipBank button').find((candidate) => !candidate.disabled && textOf(candidate) === part)
    if (!button) throw new Error(`build chip missing: ${part}`)
    button.click()
    await sleep(80)
  }
  await waitFor('build correct', () => q('[data-build-state="correct"]'), 4000)
}

async function reachTypeStep() {
  await startFirstLesson()
  await reachTypeStepFromScene()
}

async function reachTypeStepFromScene() {
  await advance()
  await waitFor('match step', () => q('[data-session-step="matchPairs"]'))
  await solveMatchPairs()
  await advance()
  await waitFor('build step', () => q('[data-session-step="build"]'))
  await solveBuild()
  await advance()
  await waitFor('type step', () => q('[data-session-step="type"]'))
}

async function completeFirstLessonFromType(ctx: Ctx) {
  const input = q<HTMLInputElement>('.today-type-card input')!
  typeInto(input, 'speak')
  q<HTMLButtonElement>('.today-type-checkButton')!.click()
  await waitFor('correct type answer', () => q('[data-type-state="correct"]'))
  await advance()
  await waitFor('speech step', () => q('[data-session-step="speak"]'))
  ctx.check('no-microphone state requires an explicit alternative', footerButton().disabled, `disabled=${footerButton().disabled}`)
  const speechButtons = qa<HTMLButtonElement>('[data-speech-state="unsupported"] button')
  const noMicrophone = speechButtons.at(-1)
  if (!noMicrophone) throw new Error('no-microphone alternative missing')
  noMicrophone.click()
  await advance()
  return waitFor('completion reward', () => q<HTMLElement>('[data-session-step="complete"]'))
}

function checkNoOverflow(ctx: Ctx) {
  ctx.check('no horizontal overflow', document.documentElement.scrollWidth <= window.innerWidth + 1, `${document.documentElement.scrollWidth}/${window.innerWidth}`)
}

function overviewFixture(id: string, viewport: { width: number; height: number }): Fixture {
  return {
    id,
    name: `Today overview baseline at ${viewport.width}px`,
    viewport,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      const shell = await waitForOverview()
      await sleep(800)
      ctx.check('split corpus supplies ten visible real lessons', visibleLessonCards().length === 10, visibleLessonCards().length)
      ctx.check('recommended lesson and Start are present', Boolean(q('.today-featuredLessonAction')), textOf(shell).slice(0, 300))
      const reviewLabels = qa<HTMLElement>('.today-segment-reviewLabel').filter((label) => label.getBoundingClientRect().width > 0)
      ctx.check('review rewards use localized visible labels', reviewLabels.length === 2 && reviewLabels.every((label) => textOf(label).includes('Wiederholung')), reviewLabels.map(textOf).join(' | '))
      if (viewport.width >= 768) {
        const lessonTitles = qa<HTMLElement>('.today-path-desktopLessonTitle').filter((title) => title.getBoundingClientRect().width > 0)
        ctx.check('desktop path exposes all ten localized lesson names', lessonTitles.length === 10 && lessonTitles[0] && textOf(lessonTitles[0]).includes('Erster Kontakt'), lessonTitles.map(textOf).join(' | '))
      }
      checkNoOverflow(ctx)
      await shot('overview')
      if (viewport.width === 390) {
        reviewLabels[0]?.scrollIntoView({ block: 'center' })
        await sleep(120)
        await shot('review-label')
      }
    },
  }
}

export const FIXTURES: Fixture[] = [
  overviewFixture('today-overview-320', SE),
  overviewFixture('today-overview-390', MOBILE),
  overviewFixture('today-overview-1440', DESKTOP),
  {
    id: 'today-overview-fr-390',
    name: 'French overview localizes the visible review rewards',
    viewport: MOBILE,
    scenario: { route: ROUTE, baseLanguage: 'French', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await waitForOverview()
      const reviewLabels = qa<HTMLElement>('.today-segment-reviewLabel').filter((label) => label.getBoundingClientRect().width > 0)
      ctx.check('French review rewards have visible localized labels', reviewLabels.length === 2 && reviewLabels.every((label) => textOf(label).includes('Révision')), reviewLabels.map(textOf).join(' | '))
      const reviewBadge = q<HTMLElement>('.today-segment-reviewBadge')
      const labelRect = reviewLabels[0]?.getBoundingClientRect()
      const badgeRect = reviewBadge?.getBoundingClientRect()
      ctx.check('localized review uses a centered 44px quiet pill with no baked artwork', Boolean(labelRect && badgeRect && badgeRect.height >= 44 && Math.abs((labelRect.left + labelRect.right) / 2 - (badgeRect.left + badgeRect.right) / 2) < 1 && !q('.today-segment-reviewImage')), `${badgeRect?.width}x${badgeRect?.height}; centers ${labelRect && (labelRect.left + labelRect.right) / 2}/${badgeRect && (badgeRect.left + badgeRect.right) / 2}`)
      reviewLabels[0]?.scrollIntoView({ block: 'center' })
      await sleep(120)
      checkNoOverflow(ctx)
      await shot('french-review-label')
    },
  },
  {
    id: 'today-lower-lesson-390',
    name: 'Selecting a lower mobile lesson starts it directly',
    viewport: MOBILE,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await waitForOverview()
      const cards = visibleLessonCards()
      cards.at(-1)!.scrollIntoView({ block: 'center' })
      cards.at(-1)!.click()
      const session = await waitFor('lesson ten session', () => q<HTMLElement>('.today-session-shell'))
      await shot('lesson-10-started')
      ctx.check('lower lesson tap opens its session directly', textOf(session).includes('Lektion 10'), textOf(session).slice(0, 300))
      ctx.check('new task starts at the top of the viewport', session.getBoundingClientRect().top >= 0, session.getBoundingClientRect().top)
      checkNoOverflow(ctx)
    },
  },
  {
    id: 'today-options-dialog-390',
    name: 'Today Options behaves as a modal dialog',
    viewport: MOBILE,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await waitForOverview()
      const opener = q<HTMLButtonElement>('.today-path-optionsButton')!
      opener.focus()
      opener.click()
      const modal = await waitFor('Options dialog', () => q<HTMLElement>('[role="dialog"]'))
      await sleep(100)
      await shot('options')
      ctx.check('focus moves inside opened dialog', modal.contains(document.activeElement), `${(document.activeElement as HTMLElement | null)?.tagName ?? 'none'}`)
      const controls = qa<HTMLElement>('[role="dialog"] button')
      const undersized = controls.filter((control) => {
        const rect = control.getBoundingClientRect()
        return rect.width < 44 || rect.height < 44
      })
      ctx.check('dialog controls meet 44px targets', undersized.length === 0, undersized.map((node) => `${textOf(node) || node.getAttribute('aria-label')}:${node.getBoundingClientRect().width.toFixed(0)}x${node.getBoundingClientRect().height.toFixed(0)}`).join(', '))
      await pressKey('Escape')
      await waitGone('Options dialog', () => q('[role="dialog"]'))
      ctx.check('Escape closes and restores the opener', document.activeElement === opener, `${(document.activeElement as HTMLElement | null)?.className ?? 'none'}`)
    },
  },
  {
    id: 'today-a1-completion-390',
    name: 'A1 lesson reaches the real reward screen without paid services',
    viewport: MOBILE,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await reachTypeStep()
      const reward = await completeFirstLessonFromType(ctx)
      await sleep(900)
      ctx.check('reward includes trophy word and next action', textOf(reward).includes('Trophäenwort') && Boolean(byText('button', 'Nächste Lektion')), textOf(reward).slice(0, 500))
      q<HTMLButtonElement>('.today-phrase-keep button')!.click()
      const phraseDeckLink = await waitFor('saved phrase receipt', () => q<HTMLAnchorElement>('.today-phrase-keep a'))
      const keepCalls = (window as any).__keptPhrases as Array<{ lessonId: string; phrase: string }>
      ctx.check('retain-to-deck is explicit and keeps the completed lesson phrase once', keepCalls.length === 1 && keepCalls[0]?.lessonId === 'english-a1-practical-001-first-contact' && keepCalls[0]?.phrase === 'Hi there, do you speak English?', JSON.stringify(keepCalls))
      ctx.check('saved receipt links to the canonical deck route', phraseDeckLink.getAttribute('href') === '/deck/today-fixture-phrase-deck', phraseDeckLink.getAttribute('href'))
      checkNoOverflow(ctx)
      await shot('completion')
    },
  },
  {
    id: 'today-keep-retry-390',
    name: 'Lost keep response retries idempotently and exposes the canonical deck link',
    viewport: MOBILE,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported', phraseKeep: 'lost-response-once' },
    async run(ctx) {
      await reachTypeStep()
      const reward = await completeFirstLessonFromType(ctx)
      const keepButton = q<HTMLButtonElement>('.today-phrase-keep button')!
      keepButton.click()
      await waitFor('localized keep error', () => q<HTMLElement>('.today-phrase-keep [role="alert"]'))
      const firstCalls = (window as any).__keptPhrases as unknown[]
      const rows = (window as any).__keptPhraseRows as Map<string, unknown>
      ctx.check('lost response shows a retry without claiming success', firstCalls.length === 1 && rows.size === 1 && !q('.today-phrase-keep a'), `calls=${firstCalls.length}; rows=${rows.size}; ${textOf(reward)}`)
      q<HTMLButtonElement>('.today-phrase-keep button')!.click()
      const phraseDeckLink = await waitFor('successful keep retry', () => q<HTMLAnchorElement>('.today-phrase-keep a'))
      const finalCalls = (window as any).__keptPhrases as unknown[]
      ctx.check('retry reuses the logical phrase instead of creating a duplicate', finalCalls.length === 2 && rows.size === 1, `calls=${finalCalls.length}; rows=${rows.size}`)
      ctx.check('retry receipt links to the canonical deck route', phraseDeckLink.getAttribute('href') === '/deck/today-fixture-phrase-deck', phraseDeckLink.getAttribute('href'))
      checkNoOverflow(ctx)
      await shot('keep-retry-saved')
    },
  },
  {
    id: 'today-french-fallback-390',
    name: 'French-base cold start discloses the authored explanation language',
    viewport: MOBILE,
    scenario: { route: `${ROUTE}&start=1`, baseLanguage: 'French', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      const session = await waitFor('French-localized cold-start lesson', () => q<HTMLElement>('[data-session-step="scene"]'), 15000)
      await sleep(300)
      const page = bodyText()
      const disclosure = byText('p', 'Explications de la leçon')
      const situation = q<HTMLElement>('.today-scene-situationStrip')
      const situationUsesEnglishFallback = textOf(situation).includes('In a cafe')
      ctx.check('missing French lesson explanations disclose every visible fallback language', textOf(disclosure).includes('allemand') && (!situationUsesEnglishFallback || textOf(disclosure).includes('anglais')), `${textOf(disclosure)} | ${textOf(situation)}`)
      ctx.check('French shell has no untranslated Today keys', !/today\.[a-z]/i.test(page), page.slice(0, 700))
      ctx.check('real target phrase remains attached to the disclosed explanation', textOf(session).includes('Hi there, do you speak English?') && textOf(session).includes('Hallo, sprechen Sie Englisch?'), textOf(session).slice(0, 700))
      const failedVideo = q<HTMLVideoElement>('.today-scene-step video')
      if (!failedVideo) throw new Error('authored lesson video missing')
      failedVideo.dispatchEvent(new Event('error'))
      const mediaAlert = await waitFor('localized media failure fallback', () => q<HTMLElement>('.today-scene-step [role="alert"]'))
      const fallbackFigure = mediaAlert.closest('figure')
      ctx.check('media failure shows localized unavailable copy and authored caption', textOf(mediaAlert).includes('Média indisponible') && textOf(fallbackFigure).includes('Im Café beginnt die Begegnung'), textOf(fallbackFigure))
      ctx.check('media failure does not block the scene Continue action', !footerButton().disabled, `disabled=${footerButton().disabled}`)
      q<HTMLButtonElement>('.today-scene-step figure button')!.click()
      const retriedVideo = await waitFor('re-created lesson media after Retry', () => {
        const video = q<HTMLVideoElement>('.today-scene-step video')
        return video && video !== failedVideo ? video : null
      })
      ctx.check('localized Retry re-creates the authored media element', retriedVideo.src === failedVideo.src, `${failedVideo.src} -> ${retriedVideo.src}`)
      ctx.check('media failure and retry leak no raw translation keys', !/today\.[a-z]/i.test(bodyText()), bodyText().slice(0, 900))
      checkNoOverflow(ctx)
      await shot('french-fallback')
      await reachTypeStepFromScene()
      const input = q<HTMLInputElement>('.today-type-card input')!
      typeInto(input, 'wrong')
      q<HTMLButtonElement>('.today-type-checkButton')!.click()
      await waitFor('French wrong-answer state', () => q('[data-type-state="wrong"]'))
      q<HTMLButtonElement>('.today-type-actions button:last-child')!.click()
      await waitFor('French answer reveal', () => q('[data-type-state="revealed"]'))
      ctx.check('French wrong/reveal path has no untranslated Today keys', !/today\.[a-z]/i.test(bodyText()), bodyText().slice(-700))
      await shot('french-revealed')
    },
  },
  {
    id: 'today-cold-start-completion-390',
    name: 'Cold start deep link keeps the real lesson identity through completion',
    viewport: MOBILE,
    scenario: { route: `${ROUTE}&start=1`, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      const scene = await waitFor('cold-start scene step', () => q<HTMLElement>('[data-session-step="scene"]'), 15000)
      ctx.check('start=1 opens the first real split-corpus lesson', textOf(scene).includes('Erster Kontakt') && textOf(scene).includes('Hi there, do you speak English?'), textOf(scene).slice(0, 500))
      ctx.check('one-shot start flag is consumed from navigation', !(window as any).__location.includes('start=1'), (window as any).__location)
      await reachTypeStepFromScene()
      const reward = await completeFirstLessonFromType(ctx)
      await sleep(900)
      ctx.check('completion belongs to the lesson opened on cold start', textOf(reward).includes('Erster Kontakt') && textOf(reward).includes('speak') && textOf(reward).includes('Hi there, do you speak English?'), textOf(reward).slice(0, 700))
      checkNoOverflow(ctx)
      await shot('cold-start-completion')
    },
  },
  {
    id: 'today-draft-resume-390',
    name: 'Leaving and reopening a lesson resumes the saved task',
    viewport: MOBILE,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await startFirstLesson()
      await advance()
      await waitFor('match step', () => q('[data-session-step="matchPairs"]'))
      q<HTMLButtonElement>('.today-session-backPill')!.click()
      await waitForOverview()
      q<HTMLButtonElement>('.today-featuredLessonAction')!.click()
      const resumed = await waitFor('resumed session', () => q<HTMLElement>('.today-session-shell'))
      await sleep(200)
      ctx.check('saved draft resumes the last task', resumed.dataset.sessionStep === 'matchPairs', resumed.dataset.sessionStep)
      const stored = Object.keys(localStorage).map((key) => `${key}:${localStorage.getItem(key)}`).join('|')
      ctx.check('draft storage contains no raw transcript or answer field', !/"transcript"\s*:|"answer"\s*:/i.test(stored), stored.slice(0, 500))
      q<HTMLButtonElement>('.today-session-footer > button:first-of-type')!.click()
      await waitFor('previous task after Back', () => q('[data-session-step="scene"]'))
      ctx.check('Back revisits the previous task instead of leaving the lesson', Boolean(q('[data-session-step="scene"]')), bodyText().slice(0, 300))
      checkNoOverflow(ctx)
      await shot('resumed')
    },
  },
  {
    id: 'today-wrong-reveal-320',
    name: 'Wrong recall cannot silently skip the learning repair',
    viewport: SE,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await reachTypeStep()
      const input = q<HTMLInputElement>('.today-type-card input')!
      typeInto(input, 'wrong')
      byText('button', 'Antwort prüfen')!.click()
      const wrongState = await waitFor('wrong recall state', () => q<HTMLElement>('[data-type-state="wrong"]'))
      const feedback = q<HTMLElement>('#today-type-feedback')!
      ctx.check('wrong answer has visible localized feedback', textOf(feedback).length > 0 && feedback.dataset.feedback === 'wrong', textOf(feedback))
      ctx.check('wrong answer keeps Continue disabled', footerButton().disabled, `disabled=${footerButton().disabled}`)
      feedback.scrollIntoView({ block: 'center' })
      await shot('wrong')
      footerButton().click()
      await sleep(150)
      ctx.check('ordinary Continue does not silently skip a wrong answer', Boolean(wrongState && q('[data-session-step="type"]')), bodyText().slice(0, 400))
      q<HTMLButtonElement>('.today-type-actions button:last-child')!.click()
      const revealed = await waitFor('revealed answer repair', () => q<HTMLElement>('[data-type-state="revealed"]'))
      const answerLine = q<HTMLElement>('.today-type-answerLine')
      ctx.check('explicit help reveals the answer and enables progress', textOf(answerLine).includes('speak') && !footerButton().disabled, `${textOf(revealed)} | ${textOf(answerLine)}`)
      await shot('revealed')
      checkNoOverflow(ctx)
    },
  },
  {
    id: 'today-reduced-motion-390',
    name: 'Reduced motion removes practice pulses, shakes, and transforms',
    viewport: MOBILE,
    reduceMotion: true,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await startFirstLesson()
      await sleep(150)
      const aura = q<HTMLElement>('.today-session-iconAura')!
      const stage = q<HTMLElement>('.today-step-stage')!
      const fill = q<HTMLElement>('.today-session-progressFill')!
      ctx.check('task entrance animation is removed', getComputedStyle(stage).animationName === 'none', getComputedStyle(stage).animationName)
      ctx.check('decorative icon pulse is removed', getComputedStyle(aura).animationName === 'none', getComputedStyle(aura).animationName)
      ctx.check('progress movement is removed', getComputedStyle(fill).transitionDuration === '0s', getComputedStyle(fill).transitionDuration)
      checkNoOverflow(ctx)
      await shot('reduced-motion')
    },
  },
  {
    id: 'today-trophy-wrong-390',
    name: 'Trophy wrong answers stay available for retry',
    viewport: MOBILE,
    scenario: { route: '/today/checkpoint?mode=trophy-cloze&path=english-a1-practical-1&segment=1&vibe=bright', baseLanguage: 'German', activeLanguage: 'English' },
    async run(ctx) {
      const drill = await waitFor('canonical trophy cloze drill', () => q<HTMLElement>('.today-trophy-drill'), 15000)
      await shot('trophy')
      const inputs = qa<HTMLInputElement>('.today-trophy-clozeInput')
      ctx.check('canonical reward has cloze inputs', inputs.length > 0, inputs.length)
      for (const input of inputs) {
        typeInto(input, 'wrong')
        input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
        await sleep(60)
      }
      await sleep(250)
      ctx.check('wrong attempts keep the trophy drill open', Boolean(q('.today-trophy-drill')) && (window as any).__location.startsWith('/today/checkpoint'), `${(window as any).__location}; drill=${Boolean(q('.today-trophy-drill'))}`)
      ctx.check('wrong inputs remain enabled for retry', qa<HTMLInputElement>('.today-trophy-clozeInput').every((input) => !input.disabled), qa<HTMLInputElement>('.today-trophy-clozeInput').map((input) => input.disabled).join(','))
      checkNoOverflow(ctx)
    },
  },
]
